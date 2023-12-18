// 所有原生事件名，比如 click，将来用来注册到 DOM 中
// 用 Set 保存原生事件名，主要的作用是用来去重
export const allNativeEvents = new Set();

export function registerTwoPhaseEvent(registrationName, dependencies) {
  // 接收两个参数：react 事件名 和 依赖的原生事件名
  // onClick 和 ["click"]，onMouseEnter 和 ["mouseout", "mouseover"]
  // 冒泡
  registerDirectEvent(registrationName, dependencies);
  // 捕获
  registerDirectEvent(registrationName + "Capture", dependencies);
}

function registerDirectEvent(registrationName, dependencies) {
  // 遍历依赖，将原生事件名添加到 allNativeEvents 中
  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}
