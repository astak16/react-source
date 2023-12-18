import { registerTwoPhaseEvent } from "./EventRegistry";

// 简单事件，如 onClick 只依赖了 click
const simpleEventPluginEvents = ["click"];

// 保存原生事件名和 react 事件名的对应关系
// click => onClick
export const topLevelEventsToReactNames = new Map();

function registerSimpleEvent(domEventName, reactName) {
  // 保存原生事件名和 react 事件名的对应关系
  topLevelEventsToReactNames.set(domEventName, reactName);
  // 完成事件名注册
  registerTwoPhaseEvent(reactName, [domEventName]);
}

export function registerSimpleEvents() {
  // 遍历事件名数组
  for (let i = 0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i];
    // 小写
    const domEventName = eventName.toLowerCase();
    // 首字母大写，click => Click
    const capitalizeEventName = eventName[0].toUpperCase() + eventName.slice(1);
    // 注册事件，传入两个参数：原生事件名 和 react 事件名
    // 原生事件名：click
    // react 事件名：onClick
    registerSimpleEvent(domEventName, `on${capitalizeEventName}`);
  }
}
