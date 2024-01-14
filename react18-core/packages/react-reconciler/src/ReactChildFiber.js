import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from "./ReactFiber";
import { Placement, ChildDeletion } from "./ReactFiberFlags";
import isArray from "shared/isArray";
import { HostText } from "./ReactWorkTags";

// 初始渲染时，只有 div#root 这个节点的 shouldTrackSideEffects 为 true，其他节点都为 false
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
  function deleteChild(returnFiber, childToDelete) {
    if (!shouldTrackSideEffects) return;
    // deletions
    const deletions = returnFiber.deletions;
    // 把删除的节点保存到 deletions 数组中
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      // 将节点的 flags 设置为 ChildDeletion，表示这个节点的子 Fiber 需要被删除
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
  // currentFirstChild 是第一个子 Fiber，也就是 current.child
  // element 是新的虚拟 dom，也就是 current.updateQueue 中的 element
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
    const key = element.key;
    let child = currentFirstChild;
    // 是否有老 Fiber
    // child 是老 Fiber
    while (child !== null) {
      // 老 Fiber 的 key 和新虚拟 DOM 的 key 是否相同
      // key 相同
      if (child.key === key) {
        // 老 Fiber 的 type 和新虚拟 DOM 的 type 是否相同
        // type 相同
        if (child.type === element.type) {
          // 删除当前 Fiber 的兄弟 Fiber
          deleteRemainingChildren(returnFiber, child.sibling);
          // 复用当前 Fiber
          const existing = useFiber(child, element.props);
          existing.return = returnFiber;
          return existing;
        } else {
          // type 不相同，删除当前的 Fiber 及其兄弟 Fiber
          deleteRemainingChildren(returnFiber, child);
        }
      } else {
        // key 不相同，删除当前的 child
        deleteChild(returnFiber, child);
      }
      // 循环兄弟节点
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

  // 如果 current 存在且 current.type === element.type 就复用 Fiber，否则就创建一个新的 Fiber（div/span）
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

  // 如果 current 存在，就复用 Fiber，否则就创建一个新的 Fiber（文本）
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

  function updateSlot(returnFiber, oldFiber, newChild) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      if (key !== null) {
        return null;
      }
      return updateTextNode(returnFiber, oldFiber, "" + newChild);
    }

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

  // 从 existingChildren 中找到存在的 Fiber
  function updateFromMap(existingChildren, returnFiber, newIdx, newChild) {
    // 文本 Fiber
    if (
      (typeof newChild === "string" && newChild !== "") ||
      typeof newChild === "number"
    ) {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, `${newChild}`);
    }
    // div/span Fiber
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
    // 遍历 newChildren
    // 如果 oldFiber 不存在则退出循环
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      // oldFiber.index > newIdx，表示更新前的虚拟 DOM 有 false 节点
      // 更新前          ->  更新后
      // [false, a, b]  ->  [b, a, false]
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        // 如果新节点比老节点多，oldFiber.sibling 为 null，表示已经没有老节点了
        // 最后的 oldFiber 会等于 null，退出循环
        nextOldFiber = oldFiber.sibling;
      }
      // 是否复用老 fiber，由 updateSlot 函数决定
      // newFiber 什么时候为 null
      // 1. 新节点是个 false
      // 2. 新节点和老节点的类型(这个类型是指 $$typeof 的类型，不是 div/span 的类型)不同或者 key 不一样时
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);
      // newFiber 为 null 时跳出循环
      if (newFiber === null) {
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }
      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }
      // placeChild 函数的作用：如果这个节点可以复用就会返回这个节点的 index，否则表示这个节点需要新创建
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // 当第一套方案没有处理完成时，这时 newIdx 是不等于 newChildren.length
    if (newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // 第二套方案，初始渲染会直接走这一套方案
    // 更新时，如果新节点的个数比老节点多，且新节点没有对应的老节点时，oldFiber 为 null，则进入这里
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
      return resultingFirstChild;
    }

    // 第三套方案
    // 方案一跳出时，进入方案三时，表示之后的节点没法完全复用，需要仔细比对
    // oldFiber 就是已经处理到的节点，之后的节点还没有被处理
    // newIdx 是已经处理到的新节点的索引
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
    // beginWork 阶段，只有在处理 div#root 节点时，shouldTrackSideEffects 为 true
    // 这里的 newFiber 是 div#root 的第一个子节点，也就是 element 或者 Component
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  // 每个 fiber 都有一个 index 属性，表示当前 fiber 在父节点中的位置
  // 如果是个复用的 fiber，current 存在，且 current.index > lastPlacedIndex，否则表示这个节点需要新创建，也可能是移动（移动也是创建）
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

  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老节点的第一个子节点，也就是 current.child
  // newChild 是新的子节点，也就是 current.updateQueue 中的 element
  function reconcileChildFibers(returnFiber, currentFirstFiber, newChild) {
    // 处理单个节点
    /**
     * 通过三个条件
     * 1. typeof newChild === "object"
     * 2. newChild !== null
     * 3. newChild.$$typeof === REACT_ELEMENT_TYPE
     */
    if (typeof newChild === "object" && newChild !== null) {
      // 函数组件和原生节点都是这个类型
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

// 初始渲染时，div#root 这个节点 shouldTrackSideEffects 为 true，其他节点都为 false
export const mountChildFibers = createChildReconciler(false);
export const reconcileChildFibers = createChildReconciler(true);
