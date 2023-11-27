export const REACT_ELEMENT = Symbol("react.element");
export const REACT_FORWARD_REF = Symbol("react.forward_ref");
export const REACT_TEXT = Symbol("react.text");
export const CREATE = Symbol("react.dom.diff.create");
export const MOVE = Symbol("react.dom.diff.move");
export const toVNode = (node) => {
  // 如何 node 是 string 或者 number，就认为是文本节点
  // 返回一个对象，对象中有 type 和 props 属性
  // 否则返回 node
  return typeof node === "string" || typeof node === "number"
    ? { type: REACT_TEXT, props: { text: node } }
    : node;
};
