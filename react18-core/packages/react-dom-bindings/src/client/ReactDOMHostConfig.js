import { preCacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree";
import { setInitialProperties } from "./ReactDomComponent";

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
