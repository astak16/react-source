import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { Placement, ChildDeletion } from "./ReactFiberFlags";
import isArray from "shared/isArray";
import { HostText } from "./ReactWorkTags";

function createChildReconciler(shouldTrackSideEffects) {
  // fiber 是老 Fiber
  // pendingProps 是新的 props
  // 复用老 Fiber，但是 props 要用最新的
  function useFiber(fiber, pendingProps) {
    // 复用 fiber
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老 Fiber
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return;
    // deletions
    const deletions = returnFiber.deletions;
    // 把删除的节点保存到 deletions 数组中
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      // 将节点的 flags 设置为 ChildDeletion，表示这个节点需要被删除
      returnFiber.flags |= ChildDeletion;
    } else {
      returnFiber.deletions.push(childToDelete);
    }
  }

  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老 Fiber
  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if (!shouldTrackSideEffects) return;
    let childToDelete = currentFirstChild;
    // 循环 currentFirstChild.sibling
    while (childToDelete !== null) {
      // 循环调用 deleteChild，删除子节点
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老节点的第一个子节点，也就是 current.child
  // newChild 是新的子节点，也就是 current.updateQueue 中的 element
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key;
    let child = currentFirstChild;
    while (child !== null) {
      if (child.key === key) {
        if (child.type === element.type) {
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        } else {
          deleteRemainingChildren(returnFiber, child);
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    // 将虚拟 DOM 转换成 fiber，这个虚拟 DOM 就是 element
    const created = createFiberFromElement(element);
    // 将 fiber 和 returnFiber 关联起来
    // 因为 returnFiber 是父节点，所以 created 的父节点就是 returnFiber
    created.return = returnFiber;
    // 返回 fiber
    return created;
  }

  function createChild(returnFiber, newChild) {
    // 文本节点
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const created = createFiberFromText(`${newChild}`);
      // 将 fiber 和 returnFiber 关联起来
      created.return = returnFiber;
      return created;
    }
    // 对象
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(newChild);
          // 将 fiber 和 returnFiber 关联起来
          created.return = returnFiber;
          return created;
        }
        default:
          break;
      }
    }
    return null;
  }

  // 每个 fiber 都有一个 index 属性，表示当前 fiber 在父节点中的位置
  function placeChild(newFiber, lastPlacedIndex, newIdx) {
    newFiber.index = newIdx;
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement;
        return lastPlacedIndex;
      } else {
        return oldIndex;
      }
    } else {
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
  }

  function updateElement(returnFiber, current, element) {
    const elementType = element.type;
    if (current !== null) {
      if (current.type === elementType) {
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        return existing;
      }
    }
    const created = createFiberFromElement(element);
    created.return = returnFiber;
    return created;
  }

  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (newChild !== null && typeof newChild === "object") {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild);
          }
        }
        default:
          return null;
      }
    }
    return null;
  }

  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();
    let existingChild = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  function updateTextNode(returnFiber, current, textContent) {
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent);
      created.return = returnFiber;
      return created;
    } else {
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, `${newChild}`);
    }
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key
            ) || null;
          return updateElement(returnFiber, matchedFiber, newChild);
        }
      }
    }
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    // 链表中第一个 child
    let resultingFirstChild = null;
    // 上一个 child
    let previousNewFiber = null;
    let newIdx = 0;

    let oldFiber = currentFirstChild;
    let nextOldFiber = null;
    let lastPlacedIndex = 0;
    // 第一套方案
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      nextOldFiber = oldFiber.sibling;
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      if (newFiber === null) {
        break;
      }
      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    if (newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // 第二套方案
    if (oldFiber === null) {
      // newChildren 是一个数组，遍历 newChildren
      for (; newIdx < newChildren.length; newIdx++) {
        // 创建一个 fiber
        const newFiber = createChild(returnFiber, newChildren[newIdx]);
        if (newFiber === null) continue;
        // 每个 fiber 都有一个 index 属性，表示当前 fiber 在父节点中的位置
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        // 将每个 child 用链表的形式连接起来
        // 如果 previousNewFiber 为 null，说明现在遍历的是第一个 child，把它赋值给 resultingFirstChild
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          // previousNewFiber 不为 null，说明现在遍历的不是第一个 child，将它和上一个 child 连接起来，形成链表
          // sibling 属性指向下一个 child
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 第三套方案
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key
            );
          }
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    if (shouldTrackSideEffects) {
      existingChildren.forEach((child) => deleteChild(returnFiber, child));
    }

    // 返回第一个 child
    return resultingFirstChild;
  }

  function placeSingleChild(newFiber) {
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老节点的第一个子节点，也就是 current.child
  // newChild 是新的子节点，也就是 current.updateQueue 中的 element
  function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
    // 处理单个节点
    if (typeof newChild === "object" && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          return placeSingleChild(
            // 处理单个节点
            reconcileSingleElement(returnFiber, currentFirstFiber, newChild)
          );
        }
      }
    }
    // 处理多个节点
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstFiber, newChild);
    }
    return null;
  }

  return reconcileChildFibers;
}

export const mountChildFibers = createChildReconciler(false);
export const reconcileChildFibers = createChildReconciler(true);
