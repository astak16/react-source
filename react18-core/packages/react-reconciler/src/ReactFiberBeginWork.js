import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
// import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";

function reconcileChildren(current, workInProgress, nextChildren) {
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren);
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren
    );
  }
}

function updateHostRoot(current, workInProgress) {
  // 处理 updateQueue 队列
  // 处理结束后 workInProgress.memoizedState 中就有了 lastUpdate 中的 element 属性
  processUpdateQueue(workInProgress);
  const nextState = workInProgress.memoizedState;

  // nextChildren 是 lastUpdate 中的 element 属性
  const nextChildren = nextState.element;
  // reconcileChildren 处理结束后，workInProgress.child 中就值了
  reconcileChildren(current, workInProgress, nextChildren);
  // 返回 workInProgress.child，这个 child 是 fiber
  return workInProgress.child;
}

function updateHostComponent(current, workInProgress) {
  const { type } = workInProgress;
  const nextProps = workInProgress.pendingProps;
  // children 是在 props 中的
  let nextChildren = nextProps.children;
  // 判断 children 是否是文本节点
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  // 如果是文本节点，就将 nextChildren 置为 null
  if (isDirectTextChild) {
    nextChildren = null;
  }
  // reconcileChildren 处理结束后，workInProgress.child 中就值了
  reconcileChildren(current, workInProgress, nextChildren);
  // 返回 workInProgress.child，这个 child 是 fiber
  return workInProgress.child;
}

export function beginWork(current, workInProgress) {
  // 根据 tag 的类型分别处理
  switch (workInProgress.tag) {
    // 宿主环境容器节点，比如 document.getElementById('root')
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    // 宿主环境常规节点，比如 div/span
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    // 宿主环境文本节点
    case HostText:
      return null;
    default:
      return null;
  }
}
