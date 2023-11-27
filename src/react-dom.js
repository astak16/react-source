import { addEvent } from "./event";
import {
  REACT_ELEMENT,
  REACT_FORWARD_REF,
  REACT_TEXT,
  CREATE,
  MOVE,
} from "./utils";

function render(VNode, containerDOM) {
  mount(VNode, containerDOM);
}

function mount(VNode, containerDOM) {
  let newDOM = createDOM(VNode);

  newDOM && containerDOM.appendChild(newDOM);
}

function createDOM(VNode) {
  let { type, props, $$typeof, ref } = VNode;
  let dom;
  // 处理 forwardRef
  if (type && type.$$typeof === REACT_FORWARD_REF) {
    return getDomByForwardRefFunction(VNode);
  }
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
  if (type === REACT_TEXT) {
    dom = document.createTextNode(props.text);
  }
  if (type && $$typeof === REACT_ELEMENT) {
    dom = document.createElement(type);
  }
  if (props) {
    if (typeof props.children === "object" && props.children.type) {
      mount(props.children, dom);
    } else if (Array.isArray(props.children)) {
      mountArray(props.children, dom);
    }
  }
  setPropsForDOM(dom, props);

  // 将真实的的 DOM 挂载到 VNode 上
  VNode.dom = dom;
  // 将 dom 赋值给 ref.current
  ref && (ref.current = dom);
  return dom;
}

function mountArray(children, parent) {
  // 如果不是数组，直接 return
  if (!Array.isArray(children)) return;
  // 遍历数组
  for (let i = 0; i < children.length; i++) {
    // 为每一个子元素添加 index 属性
    children[i].index = i;
    // 如果是对象，调用 mount 函数，递归处理
    mount(children[i], parent);
  }
}

function setPropsForDOM(dom, VNodeProps = {}) {
  if (!dom) return;
  // 遍历虚拟 dom 的属性
  for (let key in VNodeProps) {
    // children 不处理
    if (key === "children") continue;
    // 事件处理
    if (/^on[A-Z].*/.test(key)) {
      addEvent(dom, key.toLowerCase(), VNodeProps[key]);
      continue;
    }
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
  let { type, props, ref } = VNode;
  // 因为 type 是 class，所以需要 new 一个实例
  let instance = new type(props);
  // 将实例挂载到 VNode 上
  VNode.classInstance = instance;
  // 调用 render 方法，得到 VNode
  let renderVNode = instance.render();
  // 将类组件的 VNode 保存到 ClassComponentInstance 上，方便后面更新使用
  instance.oldVNode = renderVNode;
  // 将实例挂载赋值给 ref
  ref && (ref.current = instance);
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

function getDomByForwardRefFunction(VNode) {
  let { type, props, ref } = VNode;
  // 因为 type 是函数，所以直接执行
  let renderVNode = type.render(props, ref);
  // 有时候函数组件返回的是 null，这时候就不需要渲染了
  if (!renderVNode) return null;
  // 将 renderVNode 挂载到 VNode.oldRenderVNode 上
  VNode.oldRenderVNode = renderVNode;
  // 函数组件返回的是 VNode，所以需要递归处理
  return createDOM(renderVNode);
}

export function findDOMByVNode(VNode) {
  if (!VNode) return;
  if (VNode.dom) return VNode.dom;
}

export function updateDomTree(oldVNode, newVNode, oldDOM) {
  // 新节点，旧节点都不存在
  // 新节点存在，旧节点不存在
  // 新节点不存在，旧节点存在
  // 新节点存在，旧节点也存在，但是类型不一样
  // 新节点存在，旧节点也存在，类型一样 --> 值得我们进行深入的比较，探索复用相关节点的方案
  const typeMap = {
    // 不需要进行任何操作
    NO_OPERATE: !oldVNode && !newVNode,
    // 新增节点
    ADD: !oldVNode && newVNode,
    // 删除节点
    DELETE: oldVNode && !newVNode,
    // 替换节点
    REPLACE: oldVNode && newVNode && oldVNode.type !== newVNode.type,
  };
  let UPDATE_TYPE = Object.keys(typeMap).filter((key) => typeMap[key])[0];
  switch (UPDATE_TYPE) {
    case "NO_OPERATE":
      break;
    case "DELETE":
      removeVNode(oldVNode);
      break;
    case "ADD":
      oldDOM.parentNode.appendChild(createDOM(newVNode));
      break;
    case "REPLACE":
      removeVNode(oldVNode);
      oldDOM.parentNode.appendChild(createDOM(newVNode));
      break;
    default:
      // 深度的 dom diff，新老虚拟 DOM 都存在且类型相同
      deepDOMDiff(oldVNode, newVNode);
      break;
  }
}

function removeVNode(VNode) {
  // 找到 dom 节点
  const currentDOM = findDOMByVNode(VNode);
  // 删除 dom 节点
  if (currentDOM) currentDOM.remove();
}

function deepDOMDiff(oldVNode, newVNode) {
  let diffTypeMap = {
    // 原生节点，type 是一个字符串
    ORIGIN_NODE: typeof oldVNode.type === "string",
    // 类组件，type 是一个函数，但是有 IS_CLASS_COMPONENT 属性
    CLASS_COMPONENT:
      typeof oldVNode === "function" && oldVNode.type.IS_CLASS_COMPONENT,
    // 函数组件，type 是一个函数
    FUNCTION_COMPONENT: typeof oldVNode === "function",
    // 文本节点，type 是一个字符串，值是 REACT_TEXT
    TEXT: oldVNode.type === REACT_TEXT,
  };
  const DIFF_TYPE = Object.keys(diffTypeMap).filter(
    (key) => diffTypeMap[key]
  )[0];
  switch (DIFF_TYPE) {
    case "ORIGIN_NODE":
      let currentDOM = (newVNode.dom = findDOMByVNode(oldVNode));
      setPropsForDOM(currentDOM, newVNode.props);
      updateChildren(
        currentDOM,
        oldVNode.props.children,
        newVNode.props.children
      );
      break;
    case "CLASS_COMPONENT":
      updateClassComponent(oldVNode, newVNode);
      break;
    case "FUNCTION_COMPONENT":
      updateFunctionComponent(oldVNode, newVNode);
      break;
    case "TEXT":
      // 找到 oldDOM 节点
      // 赋值给 newVNode.dom
      newVNode.dom = findDOMByVNode(oldVNode);
      // 更新文本节点的值
      newVNode.dom.textContent = newVNode.props.text;
      break;
    default:
      break;
  }
}

function updateClassComponent(oldVNode, newVNode) {
  // 对于当前界面，旧的实例是与页面上已渲染的组件是相对应的，在生命周期函数中，会尝试比较 newProps 和 oldProps
  const classInstance = (newVNode.classInstance = oldVNode.classInstance);
  classInstance.updater.launchUpdate();
}

function updateFunctionComponent(oldVNode, newVNode) {
  // 找到 oldDOM 节点
  // 赋值给 newVNode.dom
  let oldDOM = (newVNode.dom = findDOMByVNode(oldVNode));
  if (!oldDOM) return;
  // 从 newVNode 中获取 type、props
  const { type, props } = newVNode;
  // 调用 type 函数，传入 props 获取新的 DOM 结构
  let newRenderVNode = type(props);
  // 递归调用 updateDomTree，更新整个 DOM 树
  updateDomTree(oldVNode.oldRenderVNode, newRenderVNode, oldDOM);
  // 将 newRenderVNode 赋值给 newVNode.oldRenderVNode
  newVNode.oldRenderVNode = newRenderVNode;
}

function updateChildren(parentDOM, oldVNodeChildren, newVNodeChildren) {
  // 将 oldVNodeChildren 的 chidlren 处理成数组
  oldVNodeChildren = (
    Array.isArray(oldVNodeChildren) ? oldVNodeChildren : [oldVNodeChildren]
  ).filter(Boolean);
  // 将 newVNodeChildren 的 chidlren 处理成数组
  newVNodeChildren = (
    Array.isArray(newVNodeChildren) ? newVNodeChildren : [newVNodeChildren]
  ).filter(Boolean);
  // 保存 oldVNodeChildren 中 key 和 children 的映射关系
  let oldKeyChildMap = {};
  oldVNodeChildren.forEach((oldVNode, index) => {
    // 如果没有 key，就使用 index
    let oldKey = oldVNode && oldVNode.key ? oldVNode.key : index;
    // 保存 key 和 children 的映射关系
    oldKeyChildMap[oldKey] = oldVNode;
  });

  // 遍历新的子虚拟 DOM 数组，找到可以复用但需要移动的节点，需要重新创建的节点，需要删除的节点，剩下的就是可以复用且不用移动的节点
  // lastNotChangedIndex 用来保存上一次没有变化的节点的索引，初始值为 -1
  let lastNotChangedIndex = -1;
  let actions = [];
  newVNodeChildren.forEach((newVNode, index) => {
    // 将 newVNode.index 设置为 index
    newVNode.index = index;
    // 如果 newVNode.key 存在就用 key，否则用 index
    // 这个 key 是 <div key={xxx}></div> 中的 key
    let newKey = newVNode.key ? newVNode.key : index;
    // 通过 key 从 oldKeyChildMap 中找到有没有 oldVNode
    let oldVNode = oldKeyChildMap[newKey];
    if (oldVNode) {
      // 如果有，调用 deepDOMDiff 进行深度比较，里面可能还有子元素，属性需要比较
      deepDOMDiff(oldVNode, newVNode);
      // 如果 oldVNode.index < lastNotChangedIndex，说明这个节点需要移动
      if (oldVNode.index < lastNotChangedIndex) {
        actions.push({ type: MOVE, oldVNode, newVNode, index });
      }
      // 操作过的节点，从 oldKeyChildMap 中删除，oldKeyChildMap 中剩下的就是需要删除的节点
      delete oldKeyChildMap[newKey];
      // 更新 lastNotChangedIndex
      lastNotChangedIndex = Math.max(lastNotChangedIndex, oldVNode.index);
    } else {
      // 如果没有，说明这个这个节点需要创建
      actions.push({ type: CREATE, newVNode, index });
    }
  });

  let VNodeToMove = actions
    // 过滤出 type 为 MOVE 的节点
    .filter((action) => action.type === MOVE)
    // 将节点对应的 oldVNode 取出来
    .map((action) => action.oldVNode);
  let VNodeToDelete = Object.values(oldKeyChildMap);
  // 将 oldKeyChildMap 中剩下的节点和 VNodeToMove 节点合并
  VNodeToMove.concat(VNodeToDelete).forEach((oldVNode) => {
    // 找到 oldVNode 对应的 dom 节点
    let currentDOM = findDOMByVNode(oldVNode);
    // 从页面中删除 dom 节点
    currentDOM.remove();
  });
  actions.forEach((action) => {
    let { type, oldVNode, newVNode, index } = action;
    // 拿到需要更新的节点的 childNodes
    let childNodes = parentDOM.childNodes;
    // 通过 index 找到 childNodes 中的 childNode
    let childNode = childNodes[index];
    // 根据不同的 type，创建不同的 dom
    const getDomForInsert = () => {
      // 如果 type 是 CREATE，就创建新的 dom
      if (type === CREATE) {
        return createDOM(newVNode);
      }
      // 如果 type 是 MOVE，就找到 oldVNode 对应的 dom
      if (type === MOVE) {
        return findDOMByVNode(oldVNode);
      }
    };
    // 如果 childNode 存在，就插入到 childNode 之前
    if (childNode) {
      // 插入到某个 childNode 之前是使用 insertBefore
      parentDOM.insertBefore(getDomForInsert(), childNode);
    } else {
      // 如果 childNode 不存在，就插入到最后
      parentDOM.appendChild(getDomForInsert());
    }
  });
}

export default {
  render,
};
