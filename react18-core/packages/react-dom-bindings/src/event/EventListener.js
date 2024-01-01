// target: 事件挂载节点，也就是 div#root
// eventType: 原生事件名，比如 click
// listener: 原生事件函数 (nativeEvent) => {}
// 冒泡
export function addEventBubbleListener(target, eventType, listener) {
  target.addEventListener(eventType, listener, false);
  // 返回添加的监听器函数
  return listener;
}

// 捕获
export function addEventCaptureListener(target, eventType, listener) {
  target.addEventListener(eventType, listener, true);
  // 返回添加的监听器函数
  return listener;
}
