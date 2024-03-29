import ReactSharedInternals from "shared/ReactSharedInternals";
import { enqueueConcurrentHookUpdate } from "./ReactFiberConcurrentUpdates";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";
import {
  Passive as PassiveEffect,
  Update as UpdateEffect,
} from "./ReactFiberFlags";
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout,
} from "./ReactHookEffectTags";

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
// 在执行完 updateWorkInProgressHook 后，currentHook 和 workInProgressHook 内容是一样的，但不是同一个对象
let currentHook = null;

// 函数组件挂载时执行的 hooks
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
  useLayoutEffect: mountLayoutEffect,
};

// 函数组件更新时执行的 hooks
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
  useLayoutEffect: updateLayoutEffect,
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
  const current = currentHook;
  let newState = current.memoizedState;
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
  // updateWorkInProgressHook 函数第一次运行时 currentHook 为 null
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

function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}

function pushEffect(tag, create, destroy, deps) {
  const effect = { tag, create, destroy, deps, next: null };
  // 如果当前的 Fiber 上不存在 updateQueue，说明当前处理的是 Fiber 的第一个 hook 是 useEffect
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  // 如果不存在 updateQueue，就初始化一个 updateQueue
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    // lastEffect 指向 Fiber 中最后一个 useEffect
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    // 如果存在 updateQueue，说明当前处理的不是 Fiber 的第一个 hook
    const lastEffect = componentUpdateQueue.lastEffect;
    // 如果不存在 lastEffect，说明当前处理的的是 Fiber 中的第一个 useEffect
    if (lastEffect === null) {
      // lastEffect 指向 Fiber 中最后一个 useEffect
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      // 如果存在 lastEffect，说明当前处理的是 Fiber 中的第二个及之后的 useEffect
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      // lastEffect 指向 Fiber 中最后一个 useEffect
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function createFunctionComponentUpdateQueue() {
  return { lastEffect: null };
}

function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  // 取出当前 Fiber 中正在运行的 hook
  // 有一个 hook，这个函数就会运行一次，运行之后这个 hook 就是当前需要处理的 hook
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;
  // 老 hook 存在
  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    // 拿到上一个 hook 的 effect
    destroy = prevEffect.destroy;
    // 有依赖
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // 依赖相同的情况
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 给 effect tag 标记为 HookHasEffect | HookPassive
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }
  // 依赖不相同的情况，说明当前的 Fiber 需要处理副作用
  currentlyRenderingFiber.flags |= fiberFlags;
  // 给 effect tag 标记为 HookHasEffect | HookPassive
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  );
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null;
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // 是同一个对象
    if (Object.is(nextDeps[i], prevDeps[i])) continue;
    return false;
  }
  return true;
}

function mountLayoutEffect(create, deps) {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}

function updateLayoutEffect(create, deps) {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}

// 这个函数是 beginWork 时调用
// current 表示已经渲染在页面中的 DOM 树
// workInProgress 表示正在处理的 DOM 树
export function renderWithHooks(current, workInProgress, Component, props) {
  // 将 workInProgress 保存到全局中
  currentlyRenderingFiber = workInProgress;
  // 这一步骤其实很关键，在更新时如果 updateQueue 没有设置为 null
  // 那么更新时的 effect 会和初次渲染的 effect 组成链表，这是有问题的
  // 所有 react 在 renderWithHooks 执行时将 updateQueue 设置为 null
  workInProgress.updateQueue = null;
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
