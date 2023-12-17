import { NoFlags } from "./ReactFiberFlags";
import { HostComponent, HostRoot, HostText } from "./ReactWorkTags";
import {
  appendInitialChild,
  createInstance,
  createTextInstance,
  finalizeInitialChildren,
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

export function completeWork(current, workInProgress) {
  const newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case HostRoot:
      // 收集当前节点下子节点的 flags 和 subtreeFlags
      bubbleProperties(workInProgress);
      break;
    case HostComponent:
      const { type } = workInProgress;
      // 创建真实 DOM 节点
      const instance = createInstance(type);
      // 将子节点挂载到当前节点上
      appendAllChildren(instance, workInProgress);
      // 将真实 DOM 节点挂载到当前 fiber 的 stateNode 属性上
      workInProgress.stateNode = instance;
      // 将属性挂载到真实 DOM 节点上
      finalizeInitialChildren(instance, type, newProps);
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
      workInProgress.stateNode = createTextInstance(nextText);
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
