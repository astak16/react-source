import { HostComponent } from "react-reconciler/src/ReactWorkTags";
import { addEventBubbleListener, addEventCaptureListener } from "./EventListener";
import { allNativeEvents } from "./EventRegistry";
import { IS_CAPTURE_PHASE } from "./EventSystemFlags";
import { createEventListenerWrapperWithPriority } from "./ReactDOMEventListener";
import getEventTarget from "./getEventTarget";
import getListener from "./getListener";
import * as SimpleEventPlugin from "./plugins/SimpleEventPlugin";

// 原生事件注册
SimpleEventPlugin.registerEvents();

// 用于检查事件有没有注册
const listeningMarker = `_reactListening${Math.random().toString(36).slice(2)}`;

export function listenAllSupportedEvents(rootContainerElement) {
  // 如果有这个 dom 上存在这个属性，说明事件已经被注册了
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach((domEventName) => {
      // 捕获
      listenToNativeEvent(domEventName, true, rootContainerElement);
      // 冒泡
      listenToNativeEvent(domEventName, false, rootContainerElement);
    });
  }
}

// domEventName：原生事件名，比如 click
// isCapturePhaseListener：是否是捕获阶段，true 表示捕获阶段，false 表示冒泡阶段
// target：事件绑定的目标节点，也就是 div#root
export function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
  // 默认是冒泡
  let eventSystemFlags = 0;
  // 捕获
  if (isCapturePhaseListener) {
    eventSystemFlags |= IS_CAPTURE_PHASE;
  }
  addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
}

// targetContainer：事件挂载节点，也就是 div#root
// domEventName：原生事件名，比如 click
// eventSystemFlags：4 表示捕获，0 表示冒泡
// isCapturePaseListener：true 表示捕获阶段，false 表示冒泡阶段
function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) {
  // 创建事件监听函数
  const listener = createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags);
  // 捕获阶段
  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener);
  } else {
    // 冒泡阶段
    addEventBubbleListener(targetContainer, domEventName, listener);
  }
}

// domEventName: 原生事件名，比如 click
// eventSystemFlags: 4 表示捕获，0 表示冒泡
// nativeEvent: 原生事件对象
// targetInst: 原生事件源所对应的 fiber
// targetContainer: 拿到原生事件源所对应的 fiber
export function dispatchEventForPluginEventSystem(
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) {
  dispatchEventForPlugin(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer);
}

// domEventName: 原生事件名，比如 click
// eventSystemFlags: 4 表示捕获，0 表示冒泡
// nativeEvent: 原生事件对象
// targetInst: 原生事件源所对应的 fiber
// targetContainer: 拿到原生事件源所对应的 fiber
function dispatchEventForPlugin(domEventName, eventSystemFlags, nativeEvent, targetInst, targetContainer) {
  const nativeEventTarget = getEventTarget(nativeEvent);
  const dispatchQueue = [];
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
  processDispatchQueue(dispatchQueue, eventSystemFlags);
}

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
  // 调用插件的 extractEvents 函数，用来提取事件函数
  SimpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  );
}

// targetFiber: 原生事件源所对应的 fiber
// reactName: react 事件名
// nativeEventType: 原生事件类型，比如 click
// isCapturePhase: true 是捕获，false 是冒泡
export function accumulateSinglePhaseListener(targetFiber, reactName, nativeEventType, isCapturePhase) {
  // 捕获的事件名，react 事件名
  const captureName = reactName + "Capture";
  // 根据是否是捕获确定当前的事件名
  // 冒泡事件名 onClick
  // 捕获事件名 onClickCapture
  const reactEventName = isCapturePhase ? captureName : reactName;
  // 事件函数队列
  const listeners = [];

  // 从原生事件源所对应的 fiber 开始向上查找
  let instance = targetFiber;
  // 循环查找父 fiber，收集遍历到的事件函数
  while (instance !== null) {
    // 拿到当前 fiber 的 tag 和真实的 DOM 节点
    const { stateNode, tag } = instance;
    // 如果是原生 DOM 节点，且 DOM 节点真实存在
    if (tag === HostComponent && stateNode !== null) {
      // 拿到事件函数
      // instance: 原生事件源所对应的 fiber，也就是 workInProgress
      // registrationName: 注册的 react 事件名，比如 onClick，onClickCapture
      const listener = getListener(instance, reactEventName);
      // 如果事件函数存在，就添加到事件函数队列中
      if (listener) {
        // 将事件函数添加到队列中，这里没有直接添加，而是使用了一个 createDispatchListener 函数
        // 这个函数的作用是对事件函数进行包装，可以附加一些其他的信息，这是一种常用的编程手法
        // instance: 原生事件源所对应的 fiber，也就是 workInProgress
        // listener: 事件函数
        // stateNode: 真实的 DOM 节点
        listeners.push(createDispatchListener(instance, listener, stateNode));
      }
    }
    // 父 fiber
    instance = instance.return;
  }
  return listeners;
}

// instance: 原生事件源所对应的 fiber，也就是 workInProgress
// listener: 事件函数
// stateNode: 真实的 DOM 节点
function createDispatchListener(instance, listener, currentTarget) {
  return { instance, listener, currentTarget };
}

// dispatchQueue：时间函数队列
// eventSystemFlags：4 表示捕获，0 表示冒泡
function processDispatchQueue(dispatchQueue, eventSystemFlags) {
  // 是否是捕获阶段
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) != 0;
  for (let i = 0; i < dispatchQueue.length; i++) {
    // event：合成事件对象
    // dispatchListeners：事件函数队列，[事件源对应的事件函数, 事件源父节点对应的事件函数, ..., div#root 对应的事件函数]
    const { event, listeners } = dispatchQueue[i];
    processDispatchQueueItemsInOrder(event, listeners, isCapturePhase);
  }
}

// event：合成事件对象
// dispatchListeners：事件函数队列，[事件源对应的事件函数, 事件源父节点对应的事件函数, ..., div#root 对应的事件函数]
// isCapturePhase：true 表示捕获，false 表示冒泡
function processDispatchQueueItemsInOrder(event, dispatchListeners, isCapturePhase) {
  // 捕获阶段
  if (isCapturePhase) {
    // 捕获阶段是从后往前执行
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispatchListeners[i];
      // 如果事件被阻止了，就不再执行
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  } else {
    // 冒泡阶段
    // 冒泡阶段是从前往后执行
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i];
      // 如果事件被阻止了，就不再执行
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget);
    }
  }
}

// 执行事件函数
function executeDispatch(event, listener, currentTarget) {
  event.currentTarget = currentTarget;
  // 传入事件对象
  listener(event);
}
