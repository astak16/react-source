import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { createFiberFromElement, createFiberFromText } from "./ReactFiber";
import { Placement } from "./ReactFiberFlags";

function createChildReconciler(shouldTrackSideEffects) {
  // returnFiber 是父节点，也就是 workInProgress
  // currentFirstChild 老节点的第一个子节点，也就是 current.child
  // newChild 是新的子节点，也就是 current.updateQueue 中的 element
  function reconcileSingleElement(returnFiber, currentFirstChild, element) {
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
  function placeChild(newFiber, newIdx) {
    newFiber.index = newIdx;
    if (shouldTrackSideEffects) {
      newFiber.flags |= Placement;
    }
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
    // 链表中第一个 child
    let resultingFirstChild = null;
    // 上一个 child
    let previousNewFiber = null;
    let newIdx = 0;
    // newChildren 是一个数组，遍历 newChildren
    for (; newIdx < newChildren.length; newIdx++) {
      // 创建一个 fiber
      const newFiber = createChild(returnFiber, newChildren[newIdx]);
      if (newFiber === null) continue;
      // 每个 fiber 都有一个 index 属性，表示当前 fiber 在父节点中的位置
      placeChild(newFiber, newIdx);
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
    // 返回第一个 child
    return resultingFirstChild;
  }

  function placeSingleChild(newFiber) {
    if (shouldTrackSideEffects) {
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
  }

  return reconcileChildFibers;
}

export const mountChildFibers = createChildReconciler(false);
export const reconcileChildFibers = createChildReconciler(true);
