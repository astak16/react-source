import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";

// 工作中的 Fiber 树
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
  workLoopSync(root);
}

// root 是 FiberRoot
function prepareFreshStack(root) {
  // 创建一颗 fiber 树，root.current 是 RootFiber
  // workInProgress 是 RootFiber.alternate
  // ∴ workInProgress.alternate === root.current
  workInProgress = createWorkInProgress(root.current, null);
}

function workLoopSync(root) {
  // 第一个 workInProgress 是 RootFiber.alternate
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress, root);
  }
}

function performUnitOfWork(unitOfWork, root) {
  // 拿到 workInProgress 的 alternate 属性
  const current = unitOfWork.alternate;
  // 调用 beginWork 函数，beginWork 函数返回的是下一个工作单元
  // let next = beginWork(current, unitOfWork); // beginWork 阶段
  // 在经过 beingWork 处理之后，pendingProps 已经处理完了，可以赋值给 memoizedProps
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  // 如果 next 为 null，说明没有下一个工作单元了，那么就调用 completeUnitOfWork 函数
  // if (next === null) {
  completeUnitOfWork(unitOfWork); // completeWork 阶段
  // } else {
  //   workInProgress = next;
  // }
}
function completeUnitOfWork(unitOfWork) {
  console.log("completeUnitOfWork");
  workInProgress = null;
}
