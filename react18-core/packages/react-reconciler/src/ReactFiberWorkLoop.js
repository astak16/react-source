import { scheduleCallback } from "scheduler";
import { createWorkInProgress } from "./ReactFiber";
import { beginWork } from "./ReactFiberBeginWork";
import { completeWork } from "./ReactFiberCompleteWork";

// completeWork 和 beginWork 执行 log 调试
const __DEBUG__ = false;

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
    if (__DEBUG__)
      console.log(
        { workInProgress },
        `workInProgress---${workInProgress.pendingProps ? workInProgress.pendingProps.className : null}`
      );
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // current 是构建完成的 fiber 树，第一次抵调用 performUnitOfWork 时是 RootFiber
  // workInProgress 是构建中的 fiber 树，就是这里的 unitOfWork
  const current = unitOfWork.alternate;
  // 执行 beginWork
  /**
   * beginWork 第一次运行：
   *  current 是 RootFiber
   *  unitOfWork：RootFiber.alternate
   */
  // next 是 beginWork 返回的第一个子 fiber，深度遍历，next = unitOfWork.child
  let next = beginWork(current, unitOfWork); // beginWork 阶段
  if (__DEBUG__)
    console.log(
      { next },
      `next---${next ? (next.pendingProps.className ? next.pendingProps.className : next.pendingProps) : null}`
    );
  // 在经过 beingWork 处理之后，pendingProps 已经处理完了，可以赋值给 memoizedProps
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  // 如果 next === null，说明没有子节点了，本次深度遍历结束
  if (next === null) {
    completeUnitOfWork(unitOfWork);
    if (__DEBUG__) console.log({ workInProgress: unitOfWork }, "----beginWork 深度遍历----");
  } else {
    // next 存在，说明子节点中也有子节点，继续循环调用 performUnitOfWork
    workInProgress = next;
  }
}
function completeUnitOfWork(unitOfWork) {
  // completedWork 是接下来要执行 completeWork 的 fiber
  let completedWork = unitOfWork;
  if (__DEBUG__)
    console.log(
      { completeUnitOfWork: completedWork },
      `completeUnitOfWork---${completedWork.memoizedProps.className ? completedWork.memoizedProps.className : null}`
    );
  do {
    const current = completedWork.alternate;
    // 当前处理的 fiber 的 父 fiber
    const returnFiber = completedWork.return;
    if (__DEBUG__)
      console.log(
        { completedWork },
        `completeWork---${
          workInProgress.pendingProps
            ? workInProgress.pendingProps.className
              ? workInProgress.pendingProps.className
              : workInProgress.pendingProps
            : null
        }`
      );
    // 执行 completeWork
    completeWork(current, completedWork); // completeWork 阶段
    // 当前 fiber 的兄弟节点
    const sibling = completedWork.sibling;
    if (__DEBUG__)
      console.log(
        { sibling },
        `siblingFiber-before---${
          sibling ? (sibling.pendingProps.className ? sibling.pendingProps.className : sibling.pendingProps) : null
        }`
      );
    // 如果 sibling 不为 null，说明兄弟节点还没有被 beginWork 处理，需要调用 beginWork，将兄弟从虚拟 DOM 转换成 fiber
    if (sibling !== null) {
      if (__DEBUG__)
        console.log(
          { sibling },
          `siblingFiber-ing---${
            sibling ? (sibling.pendingProps.className ? sibling.pendingProps.className : sibling.pendingProps) : null
          }`
        );
      workInProgress = sibling;
      return;
    }
    // 没有兄弟节点了，说明这个父节点的子节点都处理完了，那么就对父节点处理 completeWork
    if (__DEBUG__)
      console.log(
        { workInProgress, completedWork },
        `siblingFiber-after--执行 completeWork---workInProgress:${
          workInProgress.pendingProps ? workInProgress.pendingProps.className : null
        }---当前 completedWork: ${
          completedWork ? (completedWork.pendingProps ? completedWork.pendingProps.className : null) : null
        }`
      );
    completedWork = returnFiber;
    if (__DEBUG__)
      console.log(
        { workInProgress, completedWork },
        `siblingFiber-after--执行 completeWork---workInProgress:${
          workInProgress.pendingProps ? workInProgress.pendingProps.className : null
        }---下一个 completedWork: ${
          completedWork ? (completedWork.pendingProps ? completedWork.pendingProps.className : null) : null
        }`
      );
    // do while 循环会一直执行，直到 completedWork 为 null
    // 所以 workInProgress 就算有值，都不会执行 beginWork，直到退出 do while 循环，也就退出了 while 循环
    // completedWork 为 null 时，上一个 fiber 是 div#root
    workInProgress = completedWork;
  } while (completedWork !== null);
  if (__DEBUG__) console.log("---------completeUnitOfWork 执行完了-----------");
}
