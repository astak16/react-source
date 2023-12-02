import { emitUpdateForHooks } from "./react-dom";

let states = [];
let hookIndex = 0;

export function resetHookIndex() {
  // 将 hookIndex 重置为 0
  hookIndex = 0;
}

export function useState(initialState) {
  // 定义一个 currentIndex 来保存当前的 hookIndex
  // 这里是利用了闭包
  let currentIndex = hookIndex;
  // hookIndex 用来记录当前是第几个 useState
  // 所以我们可以通过 hookIndex 来获取当前的状态
  // 如果从 states 有当前状态，那么就取出当前状态，如果没有就用 initialValue
  states[currentIndex] = states[hookIndex] || initialState;
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
  let currentIndex = hookIndex;
  states[currentIndex] = states[hookIndex] || initialState;
  function dispatch(action) {
    // 和 useState 不同的地方
    // 这里是调用 reducer 函数，传入当前的状态和 action
    // reducer 函数返回值是新的状态
    states[currentIndex] = reducer(states[currentIndex], action);
    emitUpdateForHooks();
  }

  return [states[hookIndex++], dispatch];
}

export function useEffect(effectFunction, deps) {
  // 定义一个 currentIndex 来保存当前的 hookIndex
  const currentIndex = hookIndex;
  // 从 states 中取出 currentIndex 位置的 state
  // 第一项是 effectFunction 的返回函数 destroyFunction
  // 第二项是 useEffect 的第二个参数 deps
  const [destroyFunction, preDeps] = states[currentIndex] || [null, null];
  // 依赖不存在，或者依赖相比与上一次有变化时更新，需要执行 effectFunction
  if (
    !states[currentIndex] ||
    (deps && deps.some((item, index) => item !== preDeps[index]))
  ) {
    // 使用 setTimeout 模拟 useEffect 在 DOM 挂载后执行，setTimeout 是宏任务，需要等到浏览器的重绘完成后才会执行
    setTimeout(() => {
      // 执行上一次的 effectFunction 返回的 destroyFunction
      destroyFunction && destroyFunction();
      // 执行 effectFunction 函数，并拿到 effectFunction 返回的 destroyFunction
      const nextDestroyFunction = effectFunction();
      // 将 effectFunction 的返回的 destroyFunction 和 deps 保存到 states[currentIndex] 中
      // 在保存前需要先判断一下 deps 是否存在，如果 deps 不存在，那么 states[currentIndex] 就是 null
      states[currentIndex] = deps ? [nextDestroyFunction, deps] : null;
    });
  }
  // hookIndex++
  hookIndex++;
}

export function useLayoutEffect(effectFunction, deps) {
  const currentIndex = hookIndex;
  const [destroyFunction, preDeps] = states[currentIndex] || [null, null];
  if (
    !states[currentIndex] ||
    (deps && deps.some((item, index) => item !== preDeps[index]))
  ) {
    // 使用 queueMicrotask 来代替 setTimeout，queueMicrotask 是微任务，会打断浏览器的重绘
    queueMicrotask(() => {
      destroyFunction && destroyFunction();
      const nextDestroyFunction = effectFunction();
      states[currentIndex] = deps ? [nextDestroyFunction, deps] : null;
    });
  }
  hookIndex++;
}
