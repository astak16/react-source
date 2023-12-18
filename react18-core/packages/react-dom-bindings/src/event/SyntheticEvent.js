import assign from "shared/assign";

// 鼠标事件接口
const MouseEventInterface = {
  clientX: 0,
  clientY: 0,
};

function functionThatReturnsFalse() {
  return false;
}

function functionThatReturnsTrue() {
  return true;
}

function createSyntheticEvent(Interface) {
  // 这是一个构造函数
  /***
   * class SyntheticEvent {
   *   constructor(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
   *     // ...
   *   }
   * }
   * */
  // reactName: react 事件名
  // reactEventType: 原生事件名
  // targetInst: 原生事件源所对应的 fiber
  // nativeEvent: 原生事件对象
  // nativeEventTarget: 原生事件源
  function SyntheticEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
    this._reactName = reactName;
    this.type = reactEventType;
    this._targetInst = targetInst;
    // 原生事件对象
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    for (const propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }
      this[propName] = nativeEvent[propName];
    }
    // 默认这两个值是 false
    this.isDefaultPrevented = functionThatReturnsFalse;
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }
  // 合成事件主要的逻辑是抹平浏览器之间的差异，主要是 阻止默认事件 和 阻止冒泡 在不同的浏览器之间实现的方式不一样
  // 修改原型链上 preventDefault 和 stopPropagation 方法
  // 这里的 this 指向的是 SyntheticEvent 的实例
  assign(SyntheticEvent.prototype, {
    preventDefault() {
      // 拿到原生事件对象
      const event = this.nativeEvent;
      // 如果 preventDefault 方法存在，就执行
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        // 如果 preventDefault 方法不存在，就将 returnValue 设置为 true
        event.returnValue = false;
      }
      // 调用之后，将 isDefaultPrevented 设置为 true
      this.isDefaultPrevented = functionThatReturnsTrue;
    },
    stopPropagation() {
      // 拿到原生事件对象
      const event = this.nativeEvent;
      // 如果 stopPropagation 方法存在，就执行
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        // 如果 stopPropagation 方法不存在，就将 cancelBubble 设置为 true
        event.cancelBubble = true;
      }
      // 调用之后，将 isPropagationStopped 设置为 true
      this.isPropagationStopped = functionThatReturnsTrue;
    },
  });
  // 将合成事件返回出去
  return SyntheticEvent;
}

// 工厂函数，传入鼠标事件的接口创建鼠标合成事件
export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
