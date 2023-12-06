import { flushUpdaterQueue, updaterQueue } from "./Component";

export function addEvent(dom, eventName, bindFunction) {
  // 将事件处理函数保存在 DOM 上
  dom.attach = dom.attach || {};
  dom.attach[eventName] = bindFunction;
  // 如果 document 上已经绑定了某个事件，就不需要再绑定了
  // 比如：document 上已经绑定了 onclick 事件，那么就不需要再绑定 onclick 事件了
  if (document[eventName]) return;
  // 事件绑定
  document[eventName] = dispatchEvent;
}

function dispatchEvent(nativeEvent) {
  updaterQueue.isBatch = true;
  let syntheticEvent = createSyntheticEvent(nativeEvent);
  // 获取到事件触发的元素
  let target = nativeEvent.target;
  // 向上循环遍历节点
  while (target) {
    // currentTarget 是正在处理事件的元素
    // target 是事件触发的元素
    // 在冒泡的过程中，target 始终不变，currentTarget 会指向正在处理事件的元素
    syntheticEvent.currentTarget = target;
    // 在原生事件中，事件名是 click，但是合成事件中，事件名是 onclick（这里已经变成小写了）
    let eventName = `on${nativeEvent.type}`;
    // 事件对应的函数
    let bindFunction = target.attach && target.attach[eventName];
    // 执行函数
    bindFunction && bindFunction(syntheticEvent);
    // 如果阻止了冒泡，就退出循环
    if (syntheticEvent.isPropagationStopped) {
      break;
    }
    // target 等于当前节点的父节点，一直到 document，然后退出循环，因为 document.parentNode 为 null
    target = target.parentNode;
  }
  flushUpdaterQueue();
}

function createSyntheticEvent(nativeEvent) {
  let nativeEventKeyValues = {};
  // 这一步处理主要是为了将原生事件中的函数绑定 this
  for (let key in nativeEvent) {
    nativeEventKeyValues[key] =
      typeof nativeEvent[key] === "function"
        ? nativeEvent[key].bind(nativeEvent)
        : nativeEvent[key];
  }
  // 这个对象中的 this 是 syntheticEvent 对象
  let syntheticEvent = Object.assign(
    // 处理过 this 的原生事件中的属性
    nativeEventKeyValues,
    {
      // 原生事件中的属性
      nativeEvent,
      // 是否默认事件
      isDefaultPrevented: false,
      // 是否冒泡
      isPropagationStopped: false,
      // 默认事件函数
      preventDefault() {
        // 调用这个函数之后，将 isDefaultPrevented 设置为 true
        this.isDefaultPrevented = true;
        // 如果原生事件中有 preventDefault 函数，就调用
        if (this.nativeEvent.preventDefault) {
          this.nativeEvent.preventDefault();
        } else {
          // 如果原生事件中没有 preventDefault 函数，就将 returnValue 设置为 false
          this.nativeEvent.returnValue = false;
        }
      },
      // 冒泡函数
      stopPropagation() {
        // 调用这个函数之后，将 isPropagationStopped 设置为 true
        this.isPropagationStopped = true;
        // 如果原生事件中有 stopPropagation 函数，就调用
        if (this.nativeEvent.stopPropagation) {
          this.nativeEvent.stopPropagation();
        } else {
          // 如果原生事件中没有 stopPropagation 函数，就将 cancelBubble 设置为 true
          this.nativeEvent.cancelBubble = true;
        }
      },
    }
  );
  return syntheticEvent;
}
