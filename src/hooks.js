import { emitUpdateForHooks } from "./react-dom";

let states = [];
let hookIndex = 0;

export function resetHookIndex() {
  // 将 hookIndex 重置为 0
  hookIndex = 0;
}

export function useState(initialState) {
  // hookIndex 用来记录当前是第几个 useState
  // 所以我们可以通过 hookIndex 来获取当前的状态
  // 如果从 states 有当前状态，那么就取出当前状态，如果没有就用 initialValue
  states[hookIndex] = states[hookIndex] || initialState;
  // 定义一个 currentIndex 来保存当前的 hookIndex
  // 这里是利用了闭包
  let currentIndex = hookIndex;
  // 定义一个可以修改状态的函数
  function setState(newState) {
    states[currentIndex] = newState;
    emitUpdateForHooks();
  }
  // 返回值是一个数组，第一个元素是状态，第二个元素是修改状态的函数
  // hookIndex++ 这里是先从 states 中取出当前的状态，然后再将 hookIndex 加 1
  return [states[hookIndex++], setState];
}

// 接收两个参数 reducer 和 initialState
export function useReducer(reducer, initialState) {
  states[hookIndex] = states[hookIndex] || initialState;
  let currentIndex = hookIndex;
  function dispatch(action) {
    // 和 useState 不同的地方
    // 这里是调用 reducer 函数，传入当前的状态和 action
    // reducer 函数返回值是新的状态
    states[currentIndex] = reducer(states[currentIndex], action);
    emitUpdateForHooks();
  }

  return [states[hookIndex++], dispatch];
}
