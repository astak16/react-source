import { appendInitialChild, insertBefore } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import { MutationMask, Placement } from "./ReactFiberFlags";

function recursivelyTraverseMutationEffects(root, parentFiber) {
  // 查看子 Fiber 是否需要处理
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber;
    // 如果有子 Fiber 就循环调用 commitReconciliationEffects
    while (child !== null) {
      commitReconciliationEffects(child, root);
      child = child.sibling;
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  // 检查自身有没有变化，如果有变化就调用 commitPlacement
  if (flags & Placement) {
    commitPlacement(finishedWork);
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}

function getHostSibling(fiber) {
  // let node = fiber;
  // sibling: while (true) {
  //   while (node.sibling === null) {
  //     if (node.return === null || isHostParent(node.return)) {
  //       return null;
  //     }
  //     node = node.return;
  //   }
  // node = node.sibling;
  // while (node.tag !== HostComponent && node.tag !== HostText) {
  //   if (node.flags & Placement) {
  //     continue sibling;
  //   } else {
  //     node = node.child;
  //   }
  // }
  // if (!(node.flags & Placement)) {
  //   return node.stateNode;
  // }
  // }
}

function insertOrAppendPlacementNode(node, before, parent) {
  const isHost = isHostParent(node);
  if (isHost) {
    const { stateNode } = node;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      // stateNode 是一颗完整的树，只需要将它插入到 div#root 中就可以了，也就是这里的 parent
      // 这颗树在 completeWork 就已经创建好了
      appendInitialChild(parent, stateNode);
    }
  } else {
    const { child } = node;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      // let { sibling } = child;
      // while (sibling !== null) {
      //   insertOrAppendPlacementNode(sibling, before, parent);
      //   sibling = sibling.sibling;
      // }
    }
  }
}

function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    case HostRoot: {
      const parent = parentFiber.stateNode.containerInfo;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
    case HostComponent: {
      const parent = parentFiber.stateNode;
      const before = getHostSibling(finishedWork);
      insertOrAppendPlacementNode(finishedWork, before, parent);
      break;
    }
  }
}

export function commitMutationEffectsOnFiber(finishedWork, root) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostComponent:
    case HostText: {
      // 这个函数内部也调用了 commitReconciliationEffects 为什么这里还要调用 commitReconciliationEffects
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 这行代码执行要等到 recursivelyTraverseMutationEffects 执行完成
      // recursivelyTraverseMutationEffects 是递归处理 finishedWork.child，但不处理自身的变化，这行代码是处理自身的变化
      commitReconciliationEffects(finishedWork);
      break;
    }
  }
}
