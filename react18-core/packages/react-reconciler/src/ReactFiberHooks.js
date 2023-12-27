import ReactSharedInternals from "shared/ReactSharedInternals";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

const { ReactCurrentDispatcher } = ReactSharedInternals;

// 在进入 mountReducer 或者 updateReducer 是，会创建一个 newHook
//  - mountReducer 阶段 newHook 的各个属性都是 null：如：{ memoizedState: null, queue: null, next: null }
//  - updateReducer 阶段 newHook 的各个属性来自于 currentHook：如：{ memoizedState: currentHook.memoizedState, queue: currentHook.queue, next: null }
// currentlyRenderingFiber.memoizedState === newHook，workInProgressHook === newHook
// 改变 newHook 就会改变 workInProgressHook 和 currentlyRenderingFiber.memoizedState
// 改变 workInProgressHook 也会给变 newHook 和 currentlyRenderingFiber.memoizedState
// 所以在 mountReducer 或者 updateReducer 中，workInProgressHook 就是 newHook

let currentlyRenderingFiber = null; // 当前正在处理的 workInProgress，主要用来保存 memoizedState，它的值来自于 newHook
let workInProgressHook = null; // 当前正在处理的 workInProgress 的 hook
// 保存的是还未处理的 hook
// currentHook 值来自于 currentlyRenderingFiber.memoizedState，表示当前正在处理的 hook
// 第二次来自于 currentHook.next
// 只在更新时使用
let currentHook = null;

// 函数组件挂载时执行的 hooks
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
};

// 函数组件更新时执行的 hooks
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
};

// 初次渲染时执行，如果有多个 useReducer，这个函数会多次运行
function mountReducer(reducer, initialArg) {
  // 这里的前提的是在一个函数组件中：
  // 每写一个 hook(不管是 useReducer 还是 useState 等) mountReducer 就会执行一次
  // 从第一个 hook 到最后一个 hook 通过链表的方式连接起来，也就是 next 属性
  // 第一个 hook 的 next 指向第二个 hook，第二个 hook 的 next 指向第三个 hook，直到最后一个 hook，它的 next 为 null
  const hook = mountWorkInProgressHook();
  // 将函数组件中的初始值都保存到 currentlyRenderingFiber.memoizedState 中
  // 第一次运行时 hook.memoizedState 是 currentlyRenderingFiber.memoizedState.memoizedState
  // 第二次运行时 hook.memoizedState 是 currentlyRenderingFiber.memoizedState.next.memoizedState
  // 以此类推 ...
  hook.memoizedState = initialArg;
  const queue = { pending: null };
  // 创建一个链表，queue 用来存储 action，也就是 setAge 传入的参数
  // 第一次运行时 hook.queue 是 currentlyRenderingFiber.memoizedState.queue
  // 第二次运行时 hook.queue 是 currentlyRenderingFiber.memoizedState.next.queue
  // 以此类推 ...
  hook.queue = queue;
  queue.dispatch = dispatchReducerAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  );
  // useReducer 的返回值 [age, setAge]
  return [hook.memoizedState, queue.dispatch];
}

function mountWorkInProgressHook() {
  const hook = { memoizedState: null, queue: null, next: null };
  // currentlyRenderingFiber.memoizedState 是第一个 useReducer
  // currentlyRenderingFiber.memoizedState.next 是第二个 useReducer
  // currentlyRenderingFiber.memoizedState.memoizedState 保存的是 initialArg1
  // currentlyRenderingFiber.memoizedState.queue 用在保存 action
  if (workInProgressHook === null) {
    // workInProgress === null 表示是当前处理的是函数组件中的第一个 hook
    // mountWorkInProgressHook 第一次运行会走这里
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // mountWorkInProgressHook 从第二次运行开始会走这里
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}

/**
 * const [age, setAge] = useReducer(getAge, 1);
 * const [age1, setAge1] = useReducer(getAge, 11);
 * const onClick = () => {
 *   setAge({ type: "add", value: 2 });
 *   setAge({ type: "add", value: 3 });
 *   setAge1({ type: "minus", value: 12 });
 * }
 * */
// fiber：当前正在处理的 workInProgress（这里用不到）
// queue：初始时是 { pending: null }，用来保存 action
//   - 这里 queue 虽然只是一个对象，但实际是 currentlyRenderingFiber.memoizedState 中的 queue
//     - 第一个 setAge({ type: "add", value: 2 }) 时，queue 是 currentlyRenderingFiber.memoizedState.queue
//     - 第二个 setAge({ type: "add", value: 3 }) 时，queue 是 currentlyRenderingFiber.memoizedState.queue.next
//     - 第三个 setAge1({ type: "minus", value: 12 }) 时，queue 是 currentlyRenderingFiber.memoizedState.next.queue
//   - 为什么第一个 setAge 和第二个 setAge 的 queue 是同一个？
//     - 因为第一个 setAge 和第二个 setAge 都是调用的同一个 useReducer，所以 queue 是同一个
// action：setAge 传入的参数
function dispatchReducerAction(fiber, queue, action) {
  const update = { action, next: null };
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  // scheduleUpdateOnFiber 会调用 finishQueueingConcurrentUpdates
  // finishQueueingConcurrentUpdates 是由 requestIdleCallback 触发，所以下面是异步的
  scheduleUpdateOnFiber(root);
}

// 更新时执行，如果有多个 useReducer，这个函数会多次运行
function updateReducer(reducer) {
  // 这里的前提的是在一个函数组件中：
  // 每写一个 hook(不管是 useReducer 还是 useState 等) mountReducer 就会执行一次
  // 从第一个 hook 到最后一个 hook 通过链表的方式连接起来，也就是 next 属性
  // 第一个 hook 的 next 指向第二个 hook，第二个 hook 的 next 指向第三个 hook，直到最后一个 hook，它的 next 为 null
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;
  const pendingQueue = queue.pending;
  let newState = hook.memoizedState;
  // 只在第一次执行函数组件时执行
  // 执行一次函数组件会运行两次 updateReducer
  if (pendingQueue !== null) {
    // 这一步很关键
    // 这个 queue.pending = null 就是为了断开链表
    // 因为函数组件第二次执行时，这个队列已经没有任何待处理的数据了
    queue.pending = null;
    const firstUpdate = pendingQueue.next;
    let update = firstUpdate;
    // do...while 循环，至少会执行一次
    do {
      const action = update.action;
      // 调用 useReducer 传入的 reducer 函数，更新 state
      newState = reducer(newState, action);
      update = update.next;
    } while (update !== null && update !== firstUpdate);
  }
  hook.memoizedState = newState;
  // 将最新的状态返回出去
  return [hook.memoizedState, queue.dispatch];
}

function updateWorkInProgressHook() {
  // updateWorkInProgressHook 函数第一运行时 currentHook 为 null
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    currentHook = current.memoizedState;
  } else {
    currentHook = currentHook.next;
  }
  const newHook = {
    memoizedState: currentHook.memoizedState,
    queue: currentHook.queue,
    next: null,
  };
  if (workInProgressHook === null) {
    // 这一步很巧妙，改变了 currentlyRenderingFiber.memoizedState 的引用
    // 因为 newHook 是新对象，所以 currentlyRenderingFiber.memoizedState 是一个全新的对象，和之前的 currentlyRenderingFiber.memoizedState 没有关系了
    // 其次 currentlyRenderingFiber.memoizedState 和 workInProgressHook 是同一个对象，之后在改变 workInProgressHook.next 时，也会改变 currentlyRenderingFiber.memoizedState.next
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    workInProgressHook = workInProgressHook.next = newHook;
  }
  return workInProgressHook;
}

function baseStateReducer(state, action) {
  return typeof action === "function" ? action(state) : action;
}

function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;
  const queue = {
    pending: null,
    dispatch: null,
    lastRenderedReducer: baseStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  queue.dispatch = dispatchSetStateAction.bind(
    null,
    currentlyRenderingFiber,
    queue
  );
  return [hook.memoizedState, queue.dispatch];
}

function updateState() {
  return updateReducer(baseStateReducer);
}

function dispatchSetStateAction(fiber, queue, action) {
  const update = {
    action,
    hasEagerState: false,
    eagerState: null,
    next: null,
  };
  const { lastRenderedReducer, lastRenderedState } = queue;
  const eagerState = lastRenderedReducer(lastRenderedState, action);
  update.eagerState = eagerState;
  update.hasEagerState = true;
  if (Object.is(eagerState, lastRenderedState)) return;
  const root = enqueueConcurrentHookUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(root);
}

// 这个函数是 beginWork 时调用
// current 表示已经渲染在页面中的 DOM 树
// workInProgress 表示正在处理的 DOM 树
export function renderWithHooks(current, workInProgress, Component, props) {
  // 将 workInProgress 保存到全局中
  currentlyRenderingFiber = workInProgress;
  // 如果 current 有值，说明是更新，否则是初次渲染
  // 当然，如果没有要更新的 state，也不用走更新逻辑
  if (current !== null && current.memoizedState !== null) {
    // 更新，setXXX 时，给 useReducer 赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // 初始渲染，给 useReducer 赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
  // 函数组件执行
  const children = Component(props);

  // 函数执行完之后需要将这三个值重置
  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;

  return children;
}
