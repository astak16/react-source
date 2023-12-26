import { preCacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree";
import {
  diffProperties,
  setInitialProperties,
  updateProperties,
} from "./ReactDomComponent";

export function shouldSetTextContent(type, props) {
  return (
    // 节点是 string 或者 number 类型，就认为是文本节点
    typeof props.children === "string" || typeof props.children === "number"
  );
}

/**
 * <div>
 *  text-1
 *  <div>text-2</div>
 * </div>
 */
// 这个函数是对 text-1 创建文本节点
export function createTextInstance(content) {
  return document.createTextNode(content);
}

export function createInstance(type, props, internalInstanceHandle) {
  // 创建真实的 DOM 节点
  const domElement = document.createElement(type);
  // 将真实的 DOM 节点和 workInProgress 关联起来
  preCacheFiberNode(internalInstanceHandle, domElement);
  // 将 props 挂载到真实 DOM 节点上
  updateFiberProps(domElement, props);
  return domElement;
}

export function appendInitialChild(parent, child) {
  parent.appendChild(child);
}

export function finalizeInitialChildren(domElement, type, props) {
  setInitialProperties(domElement, type, props);
}

export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}

export function prepareUpdate(domElement, type, oldProps, newProps) {
  return diffProperties(domElement, type, oldProps, newProps);
}

// domElement：DOM 实例
// updatePayload：需要更新的属性
// type：DOM 标签
// newProps`：新的 props，在 finishedWork.memoizedProps
// oldProps：旧的 props，在 current.memoizedProps，如果 current 不存在就用 newProps
export function commitUpdate(
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps
) {
  updateProperties(domElement, updatePayload, type, oldProps, newProps);
  updateFiberProps(domElement, newProps);
}
