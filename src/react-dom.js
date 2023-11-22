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
  // 不管是函数组件、类组件、 VNode，$$typeof 都是 REACT_ELEMENT
  // 类组件，通过 IS_CLASS_COMPONENT 属性来判断
  if (
    typeof type === "function" &&
    $$typeof === REACT_ELEMENT &&
    type.IS_CLASS_COMPONENT
  ) {
    return getDomByClassComponent(VNode);
  }
  // 函数组件
  if (typeof type === "function" && $$typeof === REACT_ELEMENT) {
    return getDomByFunctionComponent(VNode);
  }
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

  // 将真实的的 DOM 挂载到 VNode 上
  VNode.dom = dom;
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

function getDomByClassComponent(VNode) {
  let { type, props } = VNode;
  // 因为 type 是 class，所以需要 new 一个实例
  let instance = new type(props);
  // 调用 render 方法，得到 VNode
  let renderVNode = instance.render();
  // 将类组件的 VNode 保存到 ClassComponentInstance 上，方便后面更新使用
  instance.oldVNode = renderVNode;
  // 返回 null 就不需要渲染了
  if (!renderVNode) return null;
  // 函数组件返回的事 VNode，所以需要递归处理
  return createDOM(renderVNode);
}

function getDomByFunctionComponent(VNode) {
  let { type, props } = VNode;
  // 因为 type 是函数，所以直接执行
  let renderVNode = type(props);
  // 有时候函数组件返回的是 null，这时候就不需要渲染了
  if (!renderVNode) return null;
  // 函数组件返回的事 VNode，所以需要递归处理
  return createDOM(renderVNode);
}

export function findDOMByVNode(VNode) {
  if (!VNode) return;
  if (VNode.dom) return VNode.dom;
}

export function updateDomTree(oldDOM, newVNode) {
  // 获取到 oldDOM 的 parentNode
  let parentNode = oldDOM.parentNode;
  // 将 oldDOM 移除
  parentNode.removeChild(oldDOM);
  // 将 newVNode 转换成真实 DOM
  let newDOM = createDOM(newVNode);
  // 挂载到页面上
  parentNode.appendChild(newDOM);
}

export default {
  render,
};
