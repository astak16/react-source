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
    "[object Boolean]": "boolean",
    "[object Number]": "number",
    "[object String]": "string",
    "[object Function]": "function",
    "[object Array]": "array",
    "[object Date]": "date",
    "[object RegExp]": "regExp",
    "[object Undefined]": "undefined",
    "[object Null]": "null",
    "[object Object]": "object",
  };
  return typeMap[Object.prototype.toString.call(obj)];
}

export function shallowCompare(obj1, obj2) {
  // 如果两个对象相同，直接返回 true
  if (obj1 === obj2) return true;
  // 如果两个对象中有一个不是对象，直接返回 false
  if (getType(obj1) !== "object" || getType(obj2) !== "object") return false;

  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);
  // 如果两个对象的 key 的数量不相同，直接返回 false
  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    // 如果 obj2 中不存在 obj1 的 key，或者 obj1 和 obj2 的 key 对应的值不相同，直接返回 false
    if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) return false;
  }
  // 直接返回 true
  return true;
}
