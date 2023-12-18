// 拿到原生事件对象
// 不同的浏览器事件源不一样：nativeEvent.target nativeEvent.srcElement
export default function getEventTarget(nativeEvent) {
  const target = nativeEvent.target || nativeEvent.srcElement || window;
  return target;
}
