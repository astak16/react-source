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
export function createInstance(type) {
  return document.createElement(type);
}

export function appendInitialChildren(parent, child) {
  parent.appendChild(child);
}

export function finalizeInitialChildren(domElement, type, props) {
  setInitialProperties(domElement, type, props);
}
