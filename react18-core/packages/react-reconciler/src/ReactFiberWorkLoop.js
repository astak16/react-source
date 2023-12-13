import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";

// FiberRoot 是页面根节点(真实节点)
// RootFiber 是 fiber 根节点
// 他们通过 current 和 stateNode 互相关联
/**
 * FiberRoot.current === RootFiber
 * RootFiber.stateNode === FiberRoot
 */

// workInProgress 是构建中的 fiber 树
// current 是构建完成的 fiber 树
// 他们通过 alternate 属性互相关联
/**
 * current.alternate === workInProgress
 * workInProgress.alternate === current
 */
let workInProgress = null;

// root 是 FiberRoot
export function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

// root 是 FiberRoot
function ensureRootIsScheduled(root) {
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root));
}

function performConcurrentWorkOnRoot(root) {
  // 同步调度
  renderRootSync(root);
  // 同步调度结束后， alternate 已经完成处理了，可以将它渲染在页面上了
  // 所以就将 alternate 赋值给 finishedWork
  root.finishedWork = root.current.alternate;
  // 进入 commitWork 阶段
  // commitRoot(root); // commitWork 阶段
}

// root 是 FiberRoot
function renderRootSync(root) {
  // 创建一个 workInProgress 工作树，你可以把它理解为是页面中正在工作的 fiber 树
  prepareFreshStack(root);
  // 循环遍历 workInProgress 工作树，调用 performUnitOfWork 函数
  workLoopSync();
}

// root 是 FiberRoot
function prepareFreshStack(root) {
  // 创建一颗工作中的 fiber 树
  // root.current 是 RootFiber
  // 当前构建的 fiber 树是上一次构建的 fiber 树，∴ workInProgress = root.current.alternate
  // workInProgress.alternate 是构建完成的 fiber 树
  // workInProgress.alternate === root.current
  workInProgress = createWorkInProgress(root.current, null);
}

function workLoopSync() {
  // 第一个 workInProgress 是 RootFiber.alternate
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // current 是构建完成的 fiber 树，第一次抵调用 performUnitOfWork 时是 RootFiber
  // workInProgress 是构建中的 fiber 树，就是这里的 unitOfWork
  const current = unitOfWork.alternate;
  /**
   * beginWork 第一次运行：
   *  current 是 RootFiber
   *  unitOfWork：RootFiber.alternate
   */
  // 调用 beginWork 函数，beginWork 函数返回的是下一个工作单元，当前 fiber 的子 fiber
  let next = beginWork(current, unitOfWork); // beginWork 阶段

  // 在经过 beingWork 处理之后，pendingProps 已经处理完了，可以赋值给 memoizedProps
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  workInProgress = null;
  // 如果 next 为 null，说明没有下一个工作单元了，那么就调用 completeUnitOfWork 函数
  // if (next === null) {
  //   completeUnitOfWork(unitOfWork); // completeWork 阶段
  // } else {
  //   // next 存在，说明子节点也有 workInProgress，继续循环调用 performUnitOfWork
  //   workInProgress = next;
  // }
}
function completeUnitOfWork(unitOfWork) {
  console.log("completeUnitOfWork");
  workInProgress = null;
}
