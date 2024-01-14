import { NoFlags, Update } from "./ReactFiberFlags";
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from "./ReactWorkTags";
import {
  appendInitialChild,
  createInstance,
  createTextInstance,
  finalizeInitialChildren,
  getRootHostContainer,
  prepareUpdate,
} from "react-dom-bindings/src/client/ReactDOMHostConfig";

function appendAllChildren(parent, workInProgress) {
  // 拿到子节点
  let node = workInProgress.child;
  // 循环子节点
  while (node) {
    // 如果子节点是 HostComponent 或者 HostText，就追加到父节点上
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if (node.child !== null) {
      // 子节点是组件
      // 组件没有真实的 DOM 节点，组件的真实节点在 child 上
      node = node.child;
      // 子节点是组件就不往下处理了，直接进入下一次循环
      continue;
    }
    // 这一步也很关键
    // 这一步和 while (node.sibling === null) node = node.return; 配合使用
    // 如果父节点是组件的话，继续往上找，还是跳出循环
    if (node === workInProgress) {
      return;
    }
    // 子节点没有兄弟节点
    while (node.sibling === null) {
      // 这一步也很关键
      // 如果子节点没有兄弟节点，就看下当前节点的父节点是不是正在执行 completeWork 的节点，避免重复处理
      if (node.return === null || node.return === workInProgress) {
        // DOM 走这里
        return;
      }
      // 处理的是组件
      node = node.return;
    }
    // 子节点有兄弟节点
    node = node.sibling;
  }
}

function markUpdate(workInProgress) {
  workInProgress.flags |= Update;
}

function updateHostText(current, workInProgress, oldText, newText) {
  if (oldText !== newText) {
    // const rootContainerInstance = getRootHostContainer();
    // workInProgress.stateNode = createTextInstance(
    //   newText,
    //   rootContainerInstance,
    //   workInProgress
    // );
    markUpdate(workInProgress);
  } else {
    workInProgress.stateNode = current.stateNode;
  }
}

// newProps 就是 workInProgress.pendingProps
// 将 workInProgress.pendingProps 和 current.memoizedProps 比较，找出两个 props 之间的区别，保存到 workInProgress.updateQueue 中
function updateHostComponent(current, workInProgress, type, newProps) {
  const oldProps = current.memoizedProps;
  const instance = workInProgress.stateNode;
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps);
  workInProgress.updateQueue = updatePayload;
  if (updatePayload) {
    markUpdate(workInProgress);
  }
}

export function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      // updateHostContainer(current, workInProgress);
      // 收集当前节点下子节点的 flags 和 subtreeFlags
      bubbleProperties(workInProgress);
      break;
    case HostComponent:
      const { type } = workInProgress;
      // 最终的落脚点都在真实节点上
      // 通过判断 current 是否存在，并且真实节点是否已经创建好了
      if (current !== null && workInProgress.stateNode !== null) {
        // 更新
        updateHostComponent(current, workInProgress, type, newProps);
      } else {
        // 初次渲染
        // 创建真实 DOM 节点
        const instance = createInstance(type, newProps, workInProgress);
        // 将子节点挂载到当前节点上
        appendAllChildren(instance, workInProgress);
        // 将真实 DOM 节点挂载到当前 fiber 的 stateNode 属性上
        workInProgress.stateNode = instance;
        // 将属性挂载到真实 DOM 节点上
        finalizeInitialChildren(instance, type, newProps);
      }
      bubbleProperties(workInProgress);
      break;
    case FunctionComponent:
      // 收集函数组件的 flags 和 subtreeFlags
      bubbleProperties(workInProgress);
      break;
    case HostText:
      /*
       * <div className="first">
       *  text-1
       *  <div className="second">text-2</div>
       * </div>;
       */
      // 这里是处理 text-1 的文本
      const nextText = newProps;
      if (current !== null && workInProgress.stateNode !== null) {
        const oldText = current.memoizedProps;
        updateHostText(current, workInProgress, oldText, nextText);
      } else {
        const rootContainerInstance = getRootHostContainer();
        workInProgress.stateNode = createTextInstance(
          nextText,
          rootContainerInstance,
          workInProgress
        );
      }
      // 收集当前节点下子节点的 flags 和 subtreeFlags
      bubbleProperties(workInProgress);
      break;
    default:
      break;
  }
  return null;
}

function bubbleProperties(completedWork) {
  // NoFlags 表示没有变化
  let subtreeFlags = NoFlags;
  // 拿到第一个子 fiber
  let child = completedWork.child;
  while (child !== null) {
    // subtreeFlags 保存 child.child 有没有变化
    subtreeFlags |= child.subtreeFlags;
    // flags 保存 child 有没有变化
    subtreeFlags |= child.flags;
    // 拿到 child.sibling 节点
    child = child.sibling;
  }
  // 将收集到的 flags 保存到 completedWork 上
  completedWork.subtreeFlags = subtreeFlags;
}
