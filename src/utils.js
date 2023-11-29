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
export const deepClone = (data) => {
  let type = getType(data);
  let resultValue;
  // 如果不是数组或者对象，直接返回
  if (type !== "array" && type !== "object") return data;
  // 对数据进行深拷贝
  if (type === "array") {
    resultValue = [];
    // 遍历数组，递归调用 deepClone
    data.forEach((item) => {
      resultValue.push(deepClone(item));
    });
    return resultValue;
  }
  // 对对象进行深拷贝
  if (type === "object") {
    resultValue = {};
    // 遍历对象，递归调用 deepClone
    for (const key in data) {
      // 只拷贝对象自身的属性，不拷贝原型链上的属性
      if (data.hasOwnProperty(key)) {
        resultValue[key] = deepClone(data[key]);
      }
    }
    return resultValue;
  }
};
function getType(obj) {
  let typeMap = {
    "[Object Boolean]": "boolean",
    "[Object Number]": "number",
    "[Object String]": "string",
    "[Object Function]": "function",
    "[Object Array]": "array",
    "[Object Date]": "date",
    "[Object RegExp]": "regExp",
    "[Object Undefined]": "undefined",
    "[Object Null]": "null",
    "[Object Object]": "object",
  };
  return typeMap[Object.prototype.toString.call(obj)];
}
