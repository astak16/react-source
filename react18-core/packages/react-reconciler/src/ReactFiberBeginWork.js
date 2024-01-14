import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "./ReactWorkTags";
import { processUpdateQueue } from "./ReactFiberClassUpdateQueue";
import { shouldSetTextContent } from "react-dom-bindings/src/client/ReactDOMHostConfig";
import { mountChildFibers, reconcileChildFibers } from "./ReactChildFiber";
import { renderWithHooks } from "./ReactFiberHooks";
import { ContentReset } from "./ReactFiberFlags";

function reconcileChildren(current, workInProgress, nextChildren) {
  // 初始渲染时，只有 div#root 这个节点 current 不为 null，其他节点都为 null
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
  const prevProps = current !== null ? current.memoizedProps : null;
  // children 是在 props 中的
  let nextChildren = nextProps.children;
  // 判断 children 是否是文本节点
  const isDirectTextChild = shouldSetTextContent(type, nextProps);
  // 如果是文本节点，就将 nextChildren 置为 null
  if (isDirectTextChild) {
    nextChildren = null;
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // 如果 workInProgress.pendingProps.children 不是文本，但是 prevProps 是文本，表示老的文本需要被清空
    workInProgress.flags |= ContentReset;
  }
  // reconcileChildren 处理结束后，workInProgress.child 中就值了
  reconcileChildren(current, workInProgress, nextChildren);
  // 返回 workInProgress.child，这个 child 是 fiber
  return workInProgress.child;
}

function mountIndeterminateComponent(current, workInProgress, Component) {
  const props = workInProgress.pendingProps;
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    props
  );
  workInProgress.tag = FunctionComponent;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

function updateFunctionComponent(current, workInProgress, Component) {
  const props = workInProgress.pendingProps;
  const nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    props
  );
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

export function beginWork(current, workInProgress) {
  // 根据 tag 的类型分别处理
  switch (workInProgress.tag) {
    // 初次渲染时不知道是不是函数节点
    case IndeterminateComponent: {
      const Component = workInProgress.type;
      return mountIndeterminateComponent(current, workInProgress, Component);
    }
    // 更新的时候已经知道当前是函数节点了
    case FunctionComponent: {
      const Component = workInProgress.type;
      return updateFunctionComponent(current, workInProgress, Component);
    }
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
