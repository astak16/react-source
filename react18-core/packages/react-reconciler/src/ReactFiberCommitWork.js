import {
  appendInitialChild,
  commitUpdate,
  insertBefore,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import { MutationMask, Placement, Update, Passive } from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
} from "./ReactHookEffectTags";

export function commitPassiveMountEffects(root, finishedWork) {
  commitPassiveMountOnFiber(root, finishedWork);
}

export function commitPassiveUnmountEffects(finishedWork) {
  commitPassiveUnmountOnFiber(finishedWork);
}

function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const { flags } = finishedWork;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    }
    case FunctionComponent: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      if (flags & Passive) {
        commitHookPassiveMountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        );
      }
      break;
    }
  }
}

function recursivelyTraversePassiveMountEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveMountOnFiber(root, child);
      child = child.sibling;
    }
  }
}

function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}

function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

function commitPassiveUnmountOnFiber(finishedWork) {
  const { flags } = finishedWork;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    }
    case FunctionComponent: {
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      if (flags & Passive) {
        commitHookPassiveUnmountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        );
      }
      break;
    }
  }
}

function recursivelyTraversePassiveUnmountEffects(parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveUnmountOnFiber(child);
      child = child.sibling;
    }
  }
}

function commitHookPassiveUnmountEffects(finishedWork, hookFlags) {
  commitHookEffectListUnmount(hookFlags, finishedWork);
}

function commitHookEffectListUnmount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        if (destroy !== undefined) {
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

function recursivelyTraverseMutationEffects(root, parentFiber) {
  // 查看子 Fiber 是否需要处理
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber;
    // 如果有子 Fiber 就循环调用 commitMutationEffectsOnFiber
    while (child !== null) {
      // 递归处理 Fiber
      commitMutationEffectsOnFiber(child, root);
      child = child.sibling;
    }
  }
}

function commitReconciliationEffects(finishedWork) {
  const { flags } = finishedWork;
  // 检查自身有没有变化，如果有变化就调用 commitPlacement
  if (flags & Placement) {
    commitPlacement(finishedWork);
    // 处理完后就将 Placement 从 flags 中删除
    finishedWork.flags &= ~Placement;
  }
}

function isHostParent(fiber) {
  return fiber.tag === HostComponent || fiber.tag === HostRoot;
}

// 从当前 Fiber 向上找到最近有真实 DOM 节点的 Fiber
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
  let node = fiber;
  siblings: while (true) {
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }
    node = node.sibling;
    while (node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) {
        continue siblings;
      } else {
        node = node.child;
      }
    }
    if (!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNode(fiber, before, parent) {
  const isHost = isHostParent(fiber);
  if (isHost) {
    const { stateNode } = fiber;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      // stateNode 是一颗完整的树，只需要将它插入到 div#root 中就可以了，也就是这里的 parent
      // 这颗树在 completeWork 就已经创建好了
      appendInitialChild(parent, stateNode);
    }
  } else {
    const { child } = fiber;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let { sibling } = child;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

// 在初始渲染阶段，finishedWork 是 RootFiber.child，也就是 element 或者 Component 对应的 Fiber
// parentFiber 是 RootFiber
function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork);
  switch (parentFiber.tag) {
    // 初始渲染走这里
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
  const flags = finishedWork.flags;
  const current = finishedWork.alternate;
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostText: {
      // 递归处理 Fiber 树
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 处理自身节点的副作用
      commitReconciliationEffects(finishedWork);
      break;
    }
    case HostComponent: {
      // 递归处理 Fiber 树
      recursivelyTraverseMutationEffects(root, finishedWork);
      // 处理自身节点的副作用
      commitReconciliationEffects(finishedWork);
      if (flags & Update) {
        const instance = finishedWork.stateNode;
        if (instance !== null) {
          const newProps = finishedWork.memoizedProps;
          const type = finishedWork.type;
          const updatePayload = finishedWork.updateQueue;
          const oldProps = current !== null ? current.memoizedProps : newProps;
          finishedWork.updateQueue = null;
          if (updatePayload !== null) {
            commitUpdate(instance, updatePayload, type, oldProps, newProps);
          }
        }
      }
      break;
    }
  }
}
