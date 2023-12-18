import { registerSimpleEvents, topLevelEventsToReactNames } from "../DOMEventProperties";
import { accumulateSinglePhaseListener } from "../DOMPluginEventSystem";
import { IS_CAPTURE_PHASE } from "../EventSystemFlags";
import { SyntheticMouseEvent } from "../SyntheticEvent";

// dispatchQueue: 事件函数队列
// domEventName: 原生事件名，比如 click
// targetInst: 原生事件源所对应的 fiber
// nativeEvent: 原生事件对象
// nativeEventTarget: 原生事件源
// eventSystemFlags: 4 表示捕获，0 表示冒泡
// targetContainer: 拿到原生事件源所对应的 fiber
function extractEvents(
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) {
  const reactName = topLevelEventsToReactNames.get(domEventName);
  let SyntheticEventCtor;
  switch (domEventName) {
    case "click":
      SyntheticEventCtor = SyntheticMouseEvent;
      break;
    default:
      break;
  }
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) != 0;
  const listeners = accumulateSinglePhaseListener(targetInst, reactName, nativeEvent.type, isCapturePhase);
  if (listeners.length > 0) {
    const event = new SyntheticEventCtor(reactName, domEventName, null, nativeEvent, nativeEventTarget);
    dispatchQueue.push({ event, listeners });
  }
}
export { registerSimpleEvents as registerEvents, extractEvents };
