`hooks` 是 `react16.8` 新增加的功能，它能够让我们在不编写类组件时拥有状态

`hooks` 本质是一个函数，在特定的时间点 `react` 会自动调用它

## useState

`useState` 的作用是声明一个状态变量，返回一个数组，数组的第一个元素是状态变量，第二个元素是改变状态变量的函数

```js
function FunctionComponent() {
  // 第一个参数是状态变量，第二个参数是改变状态变量的函数
  const [count, setCount] = useState(0);
}
```

我们怎么来实现 `useState` 呢？

首先定义两个变量 `hookIndex` 和 `states`

`states` 是一个数组，用来保存每个 `useState` 的状态， `hookIndex` 是用来记录当前是第几个 `useState`

```js
function FunctionComponent() {
  const [count, setCount] = useState(1); // hookIndex = 0   states = [1]
  const [count2, setCount2] = useState(2); // hookIndex = 1  states = [1, 2]
}
```

我们先定义一个 `useState` 函数，接收一个初始值

```js
function useState() {
  // hookIndex 用来记录当前是第几个 useState
  // 所以我们可以通过 hookIndex 来获取当前的状态
  // 如果从 states 有当前状态，那么就取出当前状态，如果没有就用 initialValue
  states[hookIndex] = states[hookIndex] || initialValue;
  // 定义一个可以修改状态的函数
  const setState = () => {
    // 从 states 中取出当前的状态
    states[hookIndex] = newValue;
  };
  // 返回值是一个数组，第一个元素是状态，第二个元素是修改状态的函数
  // hookIndex++ 这里是先从 states 中取出当前的状态，然后再将 hookIndex 加 1
  return [states[hookIndex++], setState];
}
```

这样编写有一个问题，`hookIndex` 是全局变量，如果我们有多个 `useState` 的话，那么 `hookIndex` 就会被覆盖，我们就拿不到对应的状态了

怎么解决这个问题呢？

我们可以利用闭包的特性保存`hookIndex`

```js
function useState() {
  // hookIndex 用来记录当前是第几个 useState
  // 所以我们可以通过 hookIndex 来获取当前的状态
  // 如果从 states 有当前状态，那么就取出当前状态，如果没有就用 initialValue
  states[hookIndex] = states[hookIndex] || initialValue;
  // 定义一个 currentIndex 来保存当前的 hookIndex
  // 这里是利用了闭包
  const currentIndex = hookIndex;
  // 定义一个可以修改状态的函数
  const setState = () => {
    // 从 states 中取出当前的状态
    states[currentIndex] = newValue;
  };
  // 返回值是一个数组，第一个元素是状态，第二个元素是修改状态的函数
  // hookIndex++ 这里是先从 states 中取出当前的状态，然后再将 hookIndex 加 1
  return [states[hookIndex++], setState];
}
```

这样我们就可以拿到对应的状态了

但是怎么更新页面呢？

之前我们在 `react-dom` 中实现了一个 `updateDomTree` 函数

我们调用这个函数就可以了，不是在 `setState` 中直接调用，而是 `react-dom` 提供一个调用 `updateDomTree` 的方法

定义 `emitUpdateForHooks` 的函数，这个在 `render` 时声明做两件事情：

- 重置 `hookIndex`
  - 重置 `hookIndex` 的函数是 `hooks` 中提供，将 `hookIndex` 重置为 0
- 调用 `updateDomTree` 函数
  - `hooks` 更新是从根元素开始的，这里传入的 `VNode` 是根元素

```js
// react-dom.js
// 声明一个变量，这个变量是用来保存更新 DOM 的函数
export let emitUpdateForHooks;

function render(VNode, containerDOM) {
  mount(VNode, containerDOM);
  // hooks 用来更新页面，在调用 render 时赋值
  emitUpdateForHooks = function () {
    // 重置 hookIndex 为 0
    resetHookIndex();
    // 调用 updateDomTree 函数，传入 VNode 和 VNode 对应的 DOM
    // 这里传入的 VNode 是根元素
    updateDomTree(VNode, VNode, findDOMByVNode(VNode));
  };
}

// hooks.js
function resetHookIndex() {
  // 将 hookIndex 重置为 0
  hookIndex = 0;
}
```

这里要说明一点 `emitUpdateForHooks` 函数执行后会更新页面，更新页面时又会把所有的组件执行一遍，组件的内部的代码也会被执行，比如 `useState`，那它的 `hookIndex` 还是从头开始的

```js
function Component() {
  const [count, setCount] = useState(0); // 初始化时 hookIndex 是 0，执行 emitUpdateForHooks 后 hookIndex 还是 0
  const [count2, setCount2] = useState(0); // 初始化时 hookIndex 是 1，执行 emitUpdateForHooks 后 hookIndex 还是 1
}
```

## useReducer

`useReducer` 是 `useState` 的原始版本，或者说 `useState` 是 `useReducer` 的语法糖，可以实现更复杂的逻辑

它接收两个参数：

- `reducer` 函数
  - 函数接收两个参数
    - `state` 当前状态
    - `action` 传入的参数
  - 函数返回值是新的状态
- `initialValue` 初始值

```js
const [state, dispatch] = useReducer(reducer, { age: 42 });
function reducer(state, action) {
  if (action.type === "incremented_age") {
    return {
      age: state.age + 1,
    };
  }
  throw Error("Unknown action.");
}
// 使用
dispatch({ type: "incremented_age" });
```

那它的源码怎么实现呢？

`useReducer` 源码和 `useState` 非常像，区别就是 `states[currentIndex]` 的值是调用 `reducer` 函数返回的新的状态

其实 `useState` 内部就是调用的 `useReducer` 函数，只不过我在这里分开写了，没有进行封装

```js
// 接收两个参数 reducer 和 initialState
function useReducer(reducer, initialState) {
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
```

## useEffect 和 useLayoutEffect

`useEffect` 它的作用类似于类组件的三个生命周期函数：

- `componentDidMount`：在组件挂载时执行
- `componentDidUpdate`：在依赖更新时执行
- `componentWillUnmount`：在组件卸载时执行

```js
// 第二个参数是个空数组，类似于 componentDidMount
useEffect(() => {}, []);
// 第二个参数不传，类似于 componentDidMount 和 componentDidUpdate
useEffect(() => {});
// 第二个参数有依赖，类似于 componentDidUpdate
useEffect(() => {}, [count]);
// 函数返回一个函数时，类似于 componentWillUnmount
useEffect(() => {
  return () => {};
}, []);
```

虽然 `useEffect` 可以模拟类组件的生命周期函数，但并不完全等价于类组件的生命周期函数

比如下面这几种情况：

1. 并不完全等价于 `componentDidUpdate`
   ```js
   // count 是初始值时，useEffect 会执行
   // count 变化时，useEffect 也会执行
   useEffect(() => {}, [count]);
   // 也就是说 count 值只要变化，useEffect 就会执行，所以第一次拿到的是一个 undefined，你会写很多这样的代码
   useEffect(() => {
     if (count === undefined) return;
   }, [count]);
   ```
2. 并不完全等价于 `componentWillUnmount`
   ```js
   // count 变化时，return 的函数都会执行，先调用上一次的 return 函数，再调用这一次的 useEffect 传入的函数
   useEffect(() => {
     // useEffect 执行时，先调用上一次的 return 函数，再调用这一次的 useEffect 传入的函数
     return () => {};
   }, [count]);
   ```
3. 组件更新就会执行
   ```js
   useEffect(() => {
     // 这里的代码会在组件更新时执行，每次都会执行
   });
   ```

所以对于 `useEffect` 来说，不能直接按照类组件的生命周期函数去理解

`useLayoutEffect` 和 `useEffect` 其实是很像的，主要的区别是：

- `useLayoutEffect` 会在 `DOM` 挂载之前执行，不会阻止浏览器的重绘
- `useEffect` 会在 `DOM` 挂载之后执行，会阻止浏览器的重绘

那它的源码怎么实现呢？

具体分为这六步骤：

1. 这个 `hooks` 也是用到了 `states` 和 `hookIndex`，首先需要保存 `hookIndex`
   ```js
   // 定义一个 currentIndex 来保存当前的 hookIndex
   const currentIdnex = hookIndex;
   ```
2. 从 `states` 中取出 `currentIndex` 位置的 `state`，`useEffect` 保存到 `states` 中的是一个数组，数组中保存的是 `effectFunction` 的返回函数 `destroyFunction` 和 `useEffect` 的第二个参数 `deps`
   ```js
   // 从 states 中取出 currentIndex 位置的 state
   // 第一项是 effectFunction 的返回函数 destroyFunction
   // 第二项是 useEffect 的第二个参数 deps
   const [destroyFunction, preDeps] = states[currentIndex] || [null, null];
   ```
3. 这两个条件不满足时，就会执行 `effectFunction`
   - 判断 `deps` 是否存在，如果 `deps` 不存在，那么 `states[currentIndex]` 就是 `null`
   - 判断 `deps` 中的每一项是否和 `preDeps` 中的每一项相等
   ```js
   // 依赖不存在，或者依赖相比与上一次有变化时更新，需要执行 effectFunction
   if (
     !states[currentIndex] ||
     (deps && deps.some((item, index) => item !== preDeps[index]))
   ) {
     // ...
   }
   ```
4. 在执行 `effectFunction` 之前，需要先执行上一次的 `effectFunction` 返回的 `destroyFunction`
   ```js
   // 执行上一次的 effectFunction 返回的 destroyFunction
   destroyFunction && destroyFunction();
   // 执行 effectFunction 函数，并拿到 effectFunction 返回的 destroyFunction
   const nextDestroyFunction = effectFunction();
   ```
5. 将 `effectFunction` 的返回的 `destroyFunction` 和 `deps` 保存到 `states[currentIndex]` 中
   - 在保存前需要先判断一下 `deps` 是否存在，如果 `deps` 不存在，那么 `states[currentIndex]` 就是 `null`
   ```js
   // 将 effectFunction 的返回的 destroyFunction 和 deps 保存到 states[currentIndex] 中
   // 在保存前需要先判断一下 deps 是否存在，如果 deps 不存在，那么 states[currentIndex] 就是 null
   states[currentIndex] = deps ? [nextDestroyFunction, deps] : null;
   ```
6. 最后 `hookIndex++`

这里要注意的是，因为 `useEffect` 的 `effectFunction` 是在页面挂载后执行的，在 `effectionfunction` 可以操作 `DOM`，所以我们这里在要用 `setTimeout` 来模拟

```js
function useEffect(effectFunction, deps) {
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
```

`useLayoutEffect` 和 `useEffect` 的源码是差不多的，只不过它是在`DOM` 挂载之前执行，所以它和 `useEffect` 的区别就是执行 `effectFunction` 的时机不同

`setTimeout` 是宏任务，需要等到浏览器的重绘完成后才会执行，但是 `useLayoutEffect` 会打断浏览器的重绘，所以需要使用微任务 `queueMicrotask`

```js
function useLayoutEffect(effectFunction, deps) {
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
```

## useRef

`useRef` 和 `createRef` 其实差不多，都会返回一个 `{ current: null }` 的对象

不同的是 `useRef` 只在第一次返回 `{ current: null }` 的对象，之后就会返回对应的 `ref`

那怎么实现 `useRef` 的源码呢

```js
function useRef(initialValue) {
  states[hookIndex] = states[hookIndex] || { current: initialValue };
  return states[hookIndex++];
}
```

它的源码就这么简单

你可能会觉得 `ref` 怎么绑定

因为 `useRef` 返回的是 `{ current: null }` 的对象，我们把这个对象赋值给 `DOM` 的 `ref` 属性

`DOM` 的 `ref` 属性会在 `createDOM` 函数中绑定

```js
function createDOM(VNode) {
  // ...
  // 将 dom 赋值给 ref.current
  ref && (ref.current = dom);
  return dom;
}
```

我们就能够拿到 `ref` 对应的 `DOM`

`useRef` 还可以接收一个初始值：`useRef(10)`

那为什么我们在 `setState` 后依然能够拿到最新个值呢？

这是因为 `states[hookIndex]` 作用，如果 `states[hookIndex]` 值，就会取出 `states[hookIndex]` 的值，如果没有就用 `initialValue`

## useImperativeHandle

`useImperativeHandle` 作用是提供给父组件一个可以调用子组件的方法

我们先看一下不使用 `useImperativeHandle`，直接使用 `ref` 的话，有什么问题，具体看下面代码

```js
const MyInput = React.forwardRef(function MyInput(props, ref) {
  return <input {...props} ref={ref} />;
});

function Form() {
  const ref = useRef(null);

  function handleClick() {
    ref.current.focus();
    ref.current.value = "Hello, world!"; // 父组件可以直接操作子组件的 DOM，这样就会对子组件造成破坏
  }

  return (
    <form>
      <MyInput label="Enter your name:" ref={ref} />
      <button type="button" onClick={handleClick}>
        Edit
      </button>
    </form>
  );
}
```

直接使用 `ref`，父组件就可以直接操作子组件的 `DOM`，去做一些其他事情，这并不是子组件想要的方式

所以就需要子组件对 `ref` 做一层代码，只给父组件提供一些可以给父组件操作的方法，具体使用方式如下代码：

```js
const MyInput = React.forwardRef(function MyInput(props, ref) {
  const inputRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputRef.current.focus();
      },
    }),
    []
  );

  return <input {...props} ref={inputRef} />;
});

function Form() {
  const ref = useRef(null);

  function handleClick() {
    ref.current.focus();
  }

  return (
    <form>
      <MyInput label="Enter your name:" ref={ref} />
      <button type="button" onClick={handleClick}>
        Edit
      </button>
    </form>
  );
}
```

那源码怎么实现呢？

其实 `useImperativeHandle` 源码很简单，接收两个参数，第一个参数是 `ref`，第二个参数是一个函数，函数返回值是一个对象，这个对象就是父组件可以调用的方法

```js
function useImperativeHandle(ref, dataFactory) {
  ref.current = dataFactory();
}
```

`ref.current` 就是 `DOM` 节点，我们将 `ref.current` 的结果修改为 `dataFactory` 函数返回值，就实现了对 `ref` 的代理

## useMemo 和 useCallback

`useMemo` 和 `useCallback` 作用是缓存数据，他们的区别是：

- `useMemo` 缓存的是数据，比如有一个值需要依赖几个值计算出来
- `useCallback` 缓存的是函数，比如有一个函数，函数内部依赖了几个值

每次 `setState` 函数都会重新执行，函数重新执行，函数内部的逻辑就会执行，有些复杂的逻辑多次执行的化，会影响页面性能

所以 `react` 就推出了 `useMemo` 来缓存数据，依赖的值变了，`useMemo` 内部的逻辑才会重新执行，否则不会执行，提供了页面的性能，`useCallback` 同理

我们来看下 `useMemo` 源码是如何实现的

它的源码实现其实和 `useEffect` 差不多，具体的流程可以看 `useEffect`，区别就是 `useEffect` 不需要返回数据，而 `useMemo` 需要将数据返回出去

```js
function useMemo(dataFactory, deps) {
  // 从 states 中取出 hookIndex 位置的 state
  // 这里为啥不用 currentIndex 进行缓存，因为这里不需要改变 states 中的值
  let [preData, preDeps] = states[hookIndex] || [null, null];
  // 依赖不存在，或者依赖相比与上一次有变化时更新，需要执行 dataFactory 函数
  if (
    !states[hookIndex] ||
    (deps && deps.some((item, index) => item !== preDeps[index]))
  ) {
    // 执行 dataFactory 函数，并拿到 dataFactory 函数返回的数据 newData
    let newData = dataFactory();
    // 将 newData 和 deps 保存到 states[hookIndex] 中
    // 在保存前需要先判断一下 deps 是否存在，如果 deps 不存在，那么 states[hookInex] 就是 null
    states[hookIndex++] = deps ? [newData, deps] : null;
    // 将 newData 返回出去
    return newData;
  }
  // 依赖没有变化，不需要执行 dataFactory 函数，直接返回上一次 dataFactory 函数返回的数据 preData
  hookIndex++;
  return preData;
}
```

`useCallback` 源码和 `useMemo` 差不多，区别就是 `useCallback` 返回的是一个函数

```js
function useCallback(callback, deps) {
  let [preCallback, preDeps] = states[hookIndex] || [null, null];
  if (
    !states[hookIndex] ||
    (deps && deps.some((item, index) => item !== preDeps[index]))
  ) {
    // 和 useMemo 区别这里，callback 无需执行，直接保存起来，并将 callback 返回出去
    states[hookIndex++] = deps ? [callback, deps] : null;
    return callback;
  }
  hookIndex++;
  return preCallback;
}
```

## 总结

1. 大部分 `hooks` 都用到了 `states` 和 `hookIndex` 这两个变量，也就是说 `hooks` 本质将将你传入的函数，数据保存到 `states` 中，然后组件执行时，拿到 `hooks` 对应的 `state`，通过对比 `preState` 和 `newState` 是否相等，决定是否执行
2. 大部分的 `hooks` 的源码都比较相似，比如 `useMemo` 和 `useCallback`，`useState` 和 `useReducer` 等
3. `useRef` 比较特殊，它不依赖 `state`，所以用它保存的数据，不会触发页面的更新

## 源码

1. [useState](https://github.com/astak16/simple-react/blob/848bc481ff52f37c2ac6547caaa024f6c87867d4/src/hooks.js#L11)
2. [useReducer](https://github.com/astak16/simple-react/blob/f5936cd1ca82614b123a025fb358aea02081d508/src/hooks.js#L30)
3. [useEffect](https://github.com/astak16/simple-react/blob/a791099d2294dc59e17f1430b05d6094f950d81d/src/hooks.js#L44)
4. [useLayoutEffect](https://github.com/astak16/simple-react/blob/a791099d2294dc59e17f1430b05d6094f950d81d/src/hooks.js#L71)
5. [useRef](https://github.com/astak16/simple-react/blob/223819b702a81e0672c8842b6a59f6baf5e69d7b/src/hooks.js#L88)
6. [useImperativeHandle](https://github.com/astak16/simple-react/blob/e7f004fe66321be69f8375ce31d9784059a2e714/src/hooks.js#L93)
7. [useMemo](https://github.com/astak16/simple-react/blob/b4d18f93beab20525a7948bf099efd5547f4aaba/src/hooks.js#L98)
8. [useCallback](https://github.com/astak16/simple-react/blob/b4d18f93beab20525a7948bf099efd5547f4aaba/src/hooks.js#L120)
