我们在上一篇中实现了 `useState` 和 `useReducer`

这一篇来实现 `useEffect`

它也是和 `useState` 一样，定义在 `react` 包中

```js
// react/src/ReactHooks.js
function useEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}
```

然后通过 `react/index.js` 暴露给开发者使用，`__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` 给内部包使用

在 `ReactFiberHooks` 文件中分别给 `HooksDispatcherOnMount` 和 `HooksDispatcherOnUpdate` 添加 `useEffect` 方法

```js
// 函数组件挂载时执行的 hooks
const HooksDispatcherOnMount = {
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect,
};

// 函数组件更新时执行的 hooks
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect,
};
```

这两个对象实在 `renderWithHooks` 中调用的，而 `renderWithHooks` 又是在 `beginWork` 阶段调用的，所以也就是说 `useEffect` 初次挂载和更新都是在 `beginWork` 时执行

## mountEffect

`mountEffect` 方法初始渲染时调用的

第一个参数是 `useEffect` 的函数，第一个参数是 `useEffect` 的依赖，内部调用了 `mountEffectImpl` 方法，传入的两个副作用的标记 `PassiveEffect` 和 `HookPassive`

`PassiveEffect` 和 `HookPassive` 都是 `Passive`，这里是给它重命名了一下

他们的区别是：

- `PassiveEffect` 是一个 `FiberFlags` 表示当前的 `Fiber` 有一个副作用
- `HookPassive` 是一个 `HookFlags` 表示当前的 `Hook` 有一个副作用

他们使用要到 `commitWork` 阶段，所以这里暂时先不用管

```js
// react-reconciler/src/ReactFiberHooks.js
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps);
}
```

### mountEffectImpl

这个函数主要做了这种；

1. 为当前的 `useEffect` 初始化一个 `hook`
   - 通过 `mountWorkInProgressHook` 初始化，这个函数我们在 `useReducer` 中已经讲过了，它的作用就是初始化一个 `hook` 等待更新时使用
   - 这个 `hook` 是保存在 `currentRenderingFiber.memoizedState` 中的，从当前的 `Fiber` 中的第一个 `hook` 依次向下通过 `next` 的链接在一起
2. 将当前的 `Fiber.flags` 设置为 `Passive`
3. 将刚刚初始化的 `hook.memoizedState` 挂载一个副作用函数 `effect`
   - `useReducer` 的 `memoizedState` 中挂载的是 `useReducer` 的初始值

```js
// react-reconciler/src/ReactFiberHooks.js
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  // 创建一个 hook 这个 hook 会关联在 currentlyRenderingFiber.memoizedState 上
  // currentyRenderingFiber 是从函数组件中编写的的第一个 hook 开始一次将里面的 hook 用 next 的方式串联起来
  const hook = mountWorkInProgressHook();
  // useEffect 的依赖
  const nextDeps = deps === undefined ? null : deps;
  // 将当前的 Fiber 标记为 PassiveEffect
  currentlyRenderingFiber.flags |= fiberFlags;
  // 当前的 hook.memoizedState 是一个 effect 函数
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}
```

### pushEffect

`pushEffect` 作用是创建一个 `effect` 对象，并将 `useEffect` 之间形成链表，通过 `lastEffect` 链接

如果当前的 `Fiber` 上不存在 `updateQueue`，说明现在处理的是第一个 `useEffect`，就初始化一个 `updateQueue`，并将创建的 `effect` 放入 `updateQueue` 中

如果当前的 `Fiber` 上存在 `updateQueue`，说明现在处理的 `hook` 不是 `Fiber` 中的第一个 `hook`，由于 `pushEffect` 只处理 `useEffect`，就有可能没有 `lastEffect`

没有 `lastEffect`，就将 `effect` 赋值 `lastEffect`，如果有的话就将 `useEffect` 单独做成一个链表，`lastEffect` 是指向最后一个 `useEffect` 的 `effect`

```js
// react-reconciler/src/ReactFiberHooks.js
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
```

## updateEffect

`updateEffect` 方法是在更新时调用的，它的参数和 `mountEffect` 一样

```js
// react-reconciler/src/ReactFiberHooks.js
function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
```

至于什么时候调用 `mountEffect` 和 `updateEffect`，是在 `renderWithHooks` 中决定的

```js
// react-reconciler/src/ReactFiberHooks.js
function renderWithHooks(current, workInProgress, Component, props) {
  // 这一步骤其实很关键，在更新时如果 updateQueue 没有设置为 null
  // 那么更新时的 effect 会和初次渲染的 effect 组成链表，这是有问题的
  // 所有 react 在 renderWithHooks 执行时将 updateQueue 设置为 null
  workInProgress.updateQueue = null;
  // 如果 current 有值，说明是更新，否则是初次渲染
  // 当然，如果没有要更新的 state，也不用走更新逻辑
  if (current !== null && current.memoizedState !== null) {
    // 更新，setXXX 时，给 useReducer, useEffect 等 hook 赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate;
  } else {
    // 初始渲染，给 useReducer, useEffect 等 hook 赋值
    ReactCurrentDispatcher.current = HooksDispatcherOnMount;
  }
}
```

### updateEffectImpl

`updateWorkInProgressHook` 我们在 `useState` 文章中讲到过，在一个组件中更新时，每一个 `hook` 都会运行一遍 `updateEffectImpl`

因为 `hook` 是由链表串联起来的，所以这里就用 `updateWorkInProgressHook` 取出当前正在运行的 `hook`

具体来说，你在一个组件中写了一个 `useState`，一个 `useEffect`，可以通过 `updateWorkInProgressHook` 函数找到 `useState` 或者 `useEffect` 对应的 `hook`

```js
const [number, setNumber] = useState(1);
useEffect(() => {
  console.log("useEffect");
}, []);
```

其实这里 `hook` 的值是从 `currentHook` 中拷贝过来的，但不是同一个对象

如果当前的 `useEffect` 依赖有变化，就将当前的 `Fiber` 标记一个 `PassiveEffect` 的 `Flags`，同时将 `effect` 中的 `tag` 标记为 `HookHasEffect`

也就是说在更新时需要比较 `nextDeps` 和 `prevDeps` 是否相同

相同时：

- 当前的 `Fiber.flags` 不标记
- 将当前处理的 `useEffect` 的 `effect.tag` 为 `HookPassive`

不同时：

- 将当前的 `Fiber.flags` 标记为 `PassiveEffect`
- 将当前处理的 `useEffect` 的`effect.tag` 标记为`HookHasEffect | HookPassive`

```js
// react-reconciler/src/ReactFiberHooks.js
function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  // 取出当前 Fiber 中正在运行的 hook
  // 有一个 hook，这个函数就会运行一次，运行之后这个 hook 就是当前需要处理的 hook
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy;
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
```

使用 `Object.is` 比较两个依赖是否相同

```js
// react-reconciler/src/ReactFiberHooks.js
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return null;
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    // 是同一个对象
    if (Object.is(nextDeps[i], prevDeps[i])) continue;
    return false;
  }
  return true;
}
```

## commitWork

`beginWork` 阶段主要做的事情是将 `useEffect` 的 `effect` 函数和依赖保存起来

保存之后，在什么时候使用呢？

那肯定是在 `commitWork` 阶段使用了

`commitWork` 的入口函数是 `commitRoot`

我们检查 `root` 节点上有没有 `Passive` 这个标记，如果有存在的话，就执行 `scheduleCallback`

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function commitRoot(root) {
  const { finishedWork } = root;
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    // 如果根节点上没有 Passive 这个标记，就将根节点标记为 Passive
    // 这么设置的原因是防止在同一个 useEffect 中多次执行 commitWork
    if (!rootDoseHavePassiveEffect) {
      rootDoseHavePassiveEffect = true;
      scheduleCallback(flushPassiveEffects);
    }
  }
}
```

设置了之后就需要释放，释放是要等到 `commitWork` 执行结束之后

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function commitRoot(root) {
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  // 查看 RootFiber 是否有处理
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffects || rootHasEffect) {
    // commitWork
    commitMutationEffectsOnFiber(finishedWork, root);
    // 释放 rootDoseHavePassiveEffect
    if (rootDoseHavePassiveEffect) {
      rootDoseHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }
}
```

### flushPassiveEffects

`flushPassiveEffects` 函数的主要逻辑就是执行 `useEffect` 的 `effect` 函数和 `destroy` 函数

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function flushPassiveEffects() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    // 先执行 useEffect 的 destroy 函数
    commitPassiveUnmountEffects(root.current);
    // 再执行 useEffect 的 effect 函数
    commitPassiveMountEffects(root, root.current);
  }
}
```

### commitPassiveMountEffects

`commitPassiveMountEffects` 函数是 `useEffect` 的 `effect` 函数，内部直接调用了 `commitPassiveMountOnFiber`

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitPassiveMountEffects(root, finishedWork) {
  commitPassiveMountOnFiber(root, finishedWork);
}
```

`commitPassiveMountOnFiber` 函数的作用是根据 `tag` 做不同的处理

因为 `useEffect` 只会出现在函数组件中，也就是说 `tag` 是 `FunctionComponent`

`tag` 是其他值的话，继续往下遍历，与 `recursivelyTraversePassiveMountEffects` 组成递归

如果是函数组件的话，就检查当前的 `Fiber` 是否有 `Passive` 标记，如果有的话就执行 `commitHookPassiveMountEffects` 函数

也就说 `useEffect` 是深度优先函数，叶子节点的 `useEffect` 会先执行

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitPassiveMountOnFiber(finishedRoot, finishedWork) {
  const { flags } = finishedWork;
  switch (finishedWork.tag) {
    case HostRoot: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    }
    case FunctionComponent: {
      // 深度优先
      // 因为 recursivelyTraversePassiveMountEffects 内部会检查当前 Fiber 的子节点，如果有子节点又会继续调用 commitPassiveMountOnFiber，形成深度优先
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      // 当前 Fiber 有 Passive 标记
      if (flags & Passive) {
        // 处理当前 Fiber 的 effect 函数
        commitHookPassiveMountEffects(
          finishedWork,
          HookHasEffect | HookPassive
        );
      }
      break;
    }
    default: {
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork);
      break;
    }
  }
}
```

`recursivelyTraversePassiveMountEffects` 函数检查当前 `Fiber` 是否有兄弟节点，如果有兄弟节点的话就依此调用 `commitPassiveMountOnFiber`

```js
// react-reconciler/src/ReactFiberCommitWork.js
function recursivelyTraversePassiveMountEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveMountOnFiber(root, child);
      child = child.sibling;
    }
  }
}
```

### commitHookPassiveMountEffects

`commitHookPassiveMountEffects` 函数转发到 `commitHookEffectListMount`

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitHookPassiveMountEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}
```

`useEffect` 的 `effect` 函数主要就是由 `commitHookEffectListMount` 函数处理

从当前 `Fiber` 中取出 `updateQueue`，因为在 `beginWork` 阶段时，一个函数组件所有 `useEffect` 都会放入 `updateQueue` 中形成链表

这里就是取出 `effect` 链表，挨个执行 `effect` 函数

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  // 取出 updateQueue 中保存的 effect 链表
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    // 第一个 effect 函数
    let effect = firstEffect;
    do {
      // 如果 effect.tag  是  HookHasEffect | HookPassive 标记就执行 effect.create 函数，并将返回的函数保存到 destroy 中，等待 Unmount 时执行
      if ((effect.tag & flags) === flags) {
        const create = effect.create;
        // 执行 create 函数，得到 destroy 函数
        // 将 destroy 函数保存到 effect.destroy 中
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

### commitPassiveUnmountEffects

`commitPassiveUnmountEffects` 的逻辑和 `commitPassiveMountEffects` 一样，只是调用的函数不一样

这里需要知道的一点是，整个 `Fiber` 树的 `destroy` 函数执行完之后，才会执行 `effect` 函数

`destroy` 执行也是遵循深度优先的策略，叶子节点的 `destroy` 会先执行

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitPassiveUnmountEffects(finishedWork) {
  commitPassiveUnmountOnFiber(finishedWork);
}
```

最后会调用 `commitHookEffectListUnmount` 函数，执行 `useEffect` 的 `destroy` 函数

```js
function commitHookEffectListUnmount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  let lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy;
        // 执行 destroy 函数
        if (destroy !== undefined) {
          destroy();
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

## useLayoutEffect

`useLayoutEffect` 和 `useEffect` 特别像，它们的区别是 `useEffect` 是在渲染后执行，`useLayoutEffect` 是在渲染时执行的

`useEffect` 是异步执行的，`useLayoutEffect` 是同步执行

`commitLayoutEffects` 是 `useLayoutEffect` 提交阶段的入口函数，我们看下是实在哪里执行的

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function commitRoot(root) {
  const { finishedWork } = root;
  const subtreeHasEffects =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;
  if (subtreeHasEffects || rootHasEffect) {
    // commitWork 入口函数
    commitMutationEffectsOnFiber(finishedWork, root);
    // useLayoutEffect commitWork 阶段的入口函数
    commitLayoutEffects(finishedWork, root);

    if (rootDoseHavePassiveEffect) {
      rootDoseHavePassiveEffect = false;
      rootWithPendingPassiveEffects = root;
    }
  }

  root.current = finishedWork;
}
```

所以 `useLayoutEffect` 是在 `commitWork` 执行完成之后立马就会执行，

作为对比 `useEffect` 提交阶段是在 `flushPassiveEffects` 中执行，而 `flushPassiveEffects` 是异步执行的

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function commitRoot(root) {
  const { finishedWork } = root;

  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoseHavePassiveEffect) {
      rootDoseHavePassiveEffect = true;
      // useEffect commitWork 阶段的入口函数，异步执行
      scheduleCallback(flushPassiveEffects);
    }
  }
」
function flushPassiveEffects() {
  if (rootWithPendingPassiveEffects !== null) {
    const root = rootWithPendingPassiveEffects;
    commitPassiveUnmountEffects(root.current);
    commitPassiveMountEffects(root, root.current);
  }
}
```

`useLayoutEffect` 函数是先于 `useEffect` 执行的，也就是说 `useLayoutEffect` 的 `destroy` 都执行完了之后会执行 `useLayoutEffect` 的 `effect` 函数

等到当前 `useLayoutEffect` 所有函数都执行完了之后才会一次执行 `useEffect`(这个所有指的是整个 `Fiber` 树的 `useLayoutEffect` 函数)

### useLayoutEffect 的 effect 函数

`useLayoutEffect` 的 `effect` 函数是在 `destroy` 函数之后执行的，这里先看 `effect` 函数

`commitLayoutEffects` 函数是 `useLayoutEffect` 的入口函数，它的作用就是调用 `commitLayoutEffectOnFiber` 根据节点的 `tag`，递归处理，如果处理到了函数组件的话就调用 `commitHookLayoutEffects` 函数

执行 `commitHookLayoutEffects` 函数会传入 `HookLayout`，也就是说当前 `Fiber` 的 `useLayoutEffect` 的 `effect` 函数都会执行

```js
// react-reconciler/src/ReactFiberCommitWork.js
// 递归处理 Fiber 节点，如果 Fiber 是函数组件的话，就调用 commitHookLayoutEffects 函数，处理 useLayoutEffect 的 effect 函数
function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
  const flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & Update) {
        // useLayoutEffect 执行 mount 阶段的 effect 函数
        commitHookLayoutEffects(finishedWork, HookLayout | HookHasEffect);
      }
      break;
    }
    default: {
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    }
  }
}

function recursivelyTraverseLayoutEffects(root, parentFiber) {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child;
    while (child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child);
      child = child.sibling;
    }
  }
}

function commitHookLayoutEffects(finishedWork, hookFlags) {
  commitHookEffectListMount(hookFlags, finishedWork);
}
```

### useLayoutEffect 的 destroy 函数

`useLayoutEffect` 的 `destroy` 函数是在哪里执行的呢？

刚开始在看的源码的时候不理解，`commitLayoutEffectOnFiber` 函数中只有执行了 `commitHookEffectListMount`，这个函数是执行 `effect` 函数

那 `destroy` 函数是在哪里执行的呢，源码翻了很久才找到的

其实 `useLayoutEffect` 的 `destroy` 函数是在 `commitWork` 阶段执行的

`commitMutationEffecsOnFiber` 是 `commitWork` 的入口函数，`react` 在 `FunctionComponent` 分支中加了一行代码用来执行 `useLayoutEffect` 的 `destroy` 函数

```js
// react-reconciler/src/ReactFiberCommitWork.js
function commitMutationEffectsOnFiber(finishedWork, root) {
  const flags = finishedWork.flags;
  const current = finishedWork.alternate;
  switch (finishedWork.tag) {
    case FunctionComponent: {
      recursivelyTraverseMutationEffects(root, finishedWork);
      commitReconciliationEffects(finishedWork);
      // LayoutMask 中是有 Update 属性的，所以这里会执行 useLayoutEffect 的 destroy 函数
      if (flags & Update) {
        // useLayoutEffect 会先执行 unmount 阶段的 destroy 函数
        commitHookEffectListUnmount(HookLayout | HookHasEffect, finishedWork);
      }
      break;
    }
    default: {
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      return;
    }
  }
}
```

## 总结

`useLayoutEffect` 和 `useEffect` 相同点：

1. 他们会互相组成链表，保存在 `updateQueue.lastEffect` 属性中
2. 初始渲染时执行 `effect` 函数，更新是先执行 `destroy` 函数，再执行 `effect` 函数

不同点：

1. `useEffect` 是异步执行的，`useLayoutEffect` 是同步执行的
2. `useEffect` 是在渲染后执行的，`useLayoutEffect` 是在渲染时执行的
3. `useLayoutEffect` 所有函数(`effect` 和 `destroy` 函数)都是在 `useEffect` 函数执行执行的
4. `useLayoutEffect` 的标识是 `HookLayout`，`useEffect` 的标识是 `HookPassive`

## 源码

1. `useEffect-beginWork` 阶段
   - [mountEffect](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberHooks.js#L218)
   - [updateEffect](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberHooks.js#L222)
2. [useEffect-commitWork 阶段](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberWorkLoop.js#L291)
3. `useLayoutEffect-beginWork` 阶段
   - [mountLayoutEffect](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberHooks.js#L314)
   - [updateLayoutEffect](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberHooks.js#L318)
4. `useLayoutEffect-commitWork` 阶段
   - [effect](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberWorkLoop.js#L107)
   - [destroy](https://github.com/astak16/react-source/blob/1cc16b53cef9f5ed46fd37da4851816028fac028/react18-core/packages/react-reconciler/src/ReactFiberCommitWork.js#L503)
