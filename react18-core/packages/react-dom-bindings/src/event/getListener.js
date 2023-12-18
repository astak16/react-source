import { getFiberCurrentPropsFromNode } from "../client/ReactDOMComponentTree";

// instance: 原生事件源所对应的 fiber，也就是 workInProgress
// registrationName: 注册的 react 事件名，比如 onClick，onClickCapture
export default function getListener(instance, registrationName) {
  // 拿到真实的 DOM 节点
  const { stateNode } = instance;
  // 没有真实的 DOM 节点，直接返回 null
  if (stateNode === null) return null;
  // 拿到 DOM 节点上的 props
  const props = getFiberCurrentPropsFromNode(stateNode);
  // 如果没有 props，直接返回 null
  if (props === null) return null;
  // 拿到事件函数
  const listener = props[registrationName];
  // 将事件函数返回出去
  return listener;
}
