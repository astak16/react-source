import { REACT_ELEMENT } from "./utils";

function createElement(type, properties, children) {
  // 将 ref 和 key 从 properties 中提取出来
  let ref = properties.ref || null;
  let key = properties.key || null;
  // 将 ref 和 key 从 properties 中删除
  // __self 和 __source 是 babel 转换后添加的属性，这里不讨论，直接删除
  ["key", "ref", "__self", "__source"].forEach(
    (prop) => delete properties[prop]
  );
  // 将剩余的 properties 放到 props 中
  let props = { ...properties };
  // 对 children 进行处理，如果有多个 children，放到一个数组中，如果只有一个或者没有 children，直接赋值给 props.children
  if (arguments.length > 3) {
    props.children = Array.prototype.slice.call(arguments, 2);
  } else {
    props.children = children;
  }
  // 返回一个虚拟 dom 对象，这个对象就是 createElement 的返回值
  return {
    $$typeof: REACT_ELEMENT,
    type,
    ref,
    key,
    props,
  };
}
export default { createElement };
