import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import hasOwnProperty from "shared/hasOwnProperty";

function ReactElement(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
}
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};
function hasValidKey(config) {
  return config.key !== undefined;
}
function hasValidRef(config) {
  return config.ref !== undefined;
}

// type：标签名，如果是原生标签，就是标签名，比如 div；如果是组件，就是组件名，比如 MyApp
// config：标签属性，包括 children，但不包括 key
// maybeKey：标签属性为 key
export function jsxDEV(type, config, maybeKey) {
  let propName;
  const props = {};
  let key = null;
  let ref = null;
  // maybeKey 是 jsx 上的 key
  // <div key="uccs">uccs</div>
  if (typeof maybeKey !== undefined) {
    key = maybeKey ?? null;
  }
  // config 的 key，使用展开运算法，将 props 的属性展开到 div 上，这时如果 props 中存在 key，那么这 key 就会在 config 中
  /*
    const props = {
      key: "configKey",
    };
    <div style={{ color: "red" }} {...props}></div>;
  */
  if (hasValidKey(config)) {
    key = config.key ?? null;
  }
  if (hasValidRef(config)) {
    key = config.ref ?? null;
  }

  for (propName in config) {
    // 1. 只复制 config 自身的属性
    // 2. 不复制 RESERVED_PROPS 中的属性
    // hasOwnProperty 函数是从 Object.prototype 结构出来的
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  // 调用 ReactElement 返回虚拟 DOM
  return ReactElement(type, key, ref, props);
}
