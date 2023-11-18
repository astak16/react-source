import { REACT_ELEMENT } from "./utils";

function render(VNode, containerDOM) {
  mount(VNode, containerDOM);
}

function mount(VNode, containerDOM) {
  let newDOM = createDOM(VNode);

  newDOM && containerDOM.appendChild(newDOM);
}

function createDOM(VNode) {
  let { type, props, $$typeof } = VNode;
  let dom;
  if (type && $$typeof === REACT_ELEMENT) {
    dom = document.createElement(type);
  }
  if (props) {
    if (typeof props.children === "object" && props.children.type) {
      mount(props.children, dom);
    } else if (Array.isArray(props.children)) {
      mountArray(props.children, dom);
    } else if (typeof props.children === "string") {
      dom.appendChild(document.createTextNode(props.children));
    }
  }
  setPropsForDOM(dom, props);
  return dom;
}

function mountArray(children, parent) {
  // 如果不是数组，直接 return
  if (!Array.isArray(children)) return;
  // 遍历数组
  for (let i = 0; i < children.length; i++) {
    // 如果是文本，创建文本节点，并将它添加到父元素上
    if (typeof children[i] === "string") {
      parent.appendChild(document.createTextNode(children[i]));
    } else {
      // 如果是对象，调用 mount 函数，递归处理
      mount(children[i], parent);
    }
  }
}

function setPropsForDOM(dom, VNodeProps = {}) {
  if (!dom) return;
  // 遍历虚拟 dom 的属性
  for (let key in VNodeProps) {
    // children 不处理
    if (key === "children") continue;
    // 事件单独处理，这里暂时先不处理
    if (/^on[A-Z].*/.test(key)) continue;
    // 处理 style 属性
    if (key === "style") {
      Object.keys(VNodeProps[key]).forEach((styleName) => {
        dom.style[styleName] = VNodeProps[key][styleName];
      });
    } else {
      // 其他属性直接挂到 dom 上，比如 className，id 等
      // 这里不需要判断是不是 dom 的属性，因为不是 dom 的属性，也会挂到 dom 上
      // className 不需要特殊处理，因为 className 本身就是 dom 的属性
      dom[key] = VNodeProps[key];
    }
  }
}
export default {
  render,
};
