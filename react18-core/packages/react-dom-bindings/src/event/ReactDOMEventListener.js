import { getClosesInstanceFromNode } from "../client/ReactDOMComponentTree";
import { dispatchEventForPluginEventSystem } from "./DOMPluginEventSystem";
import getEventTarget from "./getEventTarget";

// targetContainer：事件挂载节点，也就是 div#root
// domEventName：原生事件名，比如 click
// eventSystemFlags：4 表示捕获，0 表示冒泡
export function createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags) {
  const listenerWrapper = dispatchDiscreteEvent;
  // 这是事件函数，接收的参数是 nativeEvent，也就是原生事件对象
  return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
}

function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
  dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
}

function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
  // 拿到原生事件对象
  const nativeEventTarget = getEventTarget(nativeEvent);
  // 拿到原生事件源所对应的 fiber
  const targetInst = getClosesInstanceFromNode(nativeEventTarget);
  // 派发事件
  dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer);
}
