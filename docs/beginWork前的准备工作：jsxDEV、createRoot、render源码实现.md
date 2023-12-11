`react@18` 由于引入了 `fiber`，目录结构有了很大的变化，它的主要目录结构如下：

- react
  - react 相关 api
- react-dom
  - 渲染相关
- react-dom-bindings
  - 对真实 DOM 的操作
  - 事件的绑定
- react-reconciler
  - fiber 相关内容
- scheduler
  - 优先级相关调度
- shared
  - 工具函数

`react@18` 初始化渲染分层三步骤：

1.  `jsxDEV`：创建节点，将 `jsx` 转换成虚拟 `DOM`
2.  `createRoot`：创建根节点，根节点有一个 `render` 方法
3.  `render`：调用根节点的 `render` 方法，将虚拟 `DOM` 渲染到页面上

## jsxDEV

在 `react@18` 中，虚拟 `DOM` 不在是由 `React.createElement` 创建，而是由 `jsxDEV` 这个函数创建，使用这个函数的好处是无需在引入 `React`

```js
import React from "react"; // 无需再写这段代码了
```

我们先来通过 `babel` 工具来看下 `jsx` 转换成虚拟 `DOM` 是什么样的结构

工具地址：[babel](https://babeljs.io/repl#?browsers=&build=&builtIns=false&corejs=3.6&spec=false&loose=false&code_lz=FBA&debug=false&forceAllTransforms=false&modules=false&shippedProposals=false&circleciRepo=&evaluate=true&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=env%2Creact&prettier=false&targets=Electron-1.8%252CNode-20&version=7.23.5&externalPlugins=&assumptions=%7B%22superIsCallableConstructor%22%3Atrue%2C%22skipForOfIteratorClosing%22%3Atrue%2C%22setSpreadProperties%22%3Atrue%7D)

```js
// jsx 代码
let element = (
  <div style={{ color: "red" }} key="key">
    uccs
  </div>
);
🔽
// 通过 babel 转换后的代码
let element = /*#__PURE__*/ jsxDEV(
  "div",
  {
    style: {
      color: "red",
    },
    children: "uccs",
  },
  "key"
);
```

我们可以看到 `jsxDEV` 接收三个参数：

- 第一个参数是标签名：这里是 `div`，如果是组件的话，这里就是组件的名字
- 第二个参数是标签属性：`jsx` 上的属性（不包括 `key`）和 `children`
- 第三个参数是 `key`

根据这个转换的结果，我们来实现一下 `jsxDEV` 函数

首先我们在 `react` 下新建两个文件

- `jsx-dev-runtime.js`
- `src/jsx/ReactJSXElement.js`

`jsxDEV` 函数是在 `ReactJSXElement.js` 中实现的，从 `jsx-dev-runtime.js` 中导出

从上面分析中，我们知道 `jsxDEV` 接收三个参数，这三个参数分别是 `type`，`config`，`maybeKey`

> PS：在 `react@18` 中，`react` 把函数拆分的更颗粒了，比如下面的 `ReactElement`，`hasValidRef`，`hasValidKey` 函数，下面不在说明了

`react@18` 的虚拟 `DOM` 和之前版本一样，有这几个参数

- `$$typeof`：标识，它是什么类型的虚拟 `DOM`
- `key`：标签 `key` 属性
- `ref`：标签 `ref` 属性
- `type`：标签名，比如 `div`、`MyApp` 等
- `props`：标签属性，包括 `children`，不包括 `key` 和 `ref`

### ReactElement

我们需要在 `jsxDEV` 中返回一个这样结构的虚拟 `DOM`，这个结构由 `ReactElement` 函数实现，其中 `$$typeof` 是用来标识这个虚拟 `DOM` 是什么类型的，这里我们用 `REACT_ELEMENT_TYPE` 来标识

`REACT_ELEMENT_TYPE` 是定义在 `shared/ReactSymbols.js` 文件中：`Symbol.for("react.element")`

`Symbol.for("react.element")` 和 `Symbol("react.element")` 的区别是：`Symbol.for` 会先去全局 `Symbol` 注册表中查找，如果有就返回，没有就创建一个新的 `Symbol`，而 `Symbol` 是每次都会创建一个新的 `Symbol`

```js
Symbol.for("react.element") === Symbol.for("react.element"); // true
Symbol("react.element") === Symbol("react.element"); // false
```

```js
function ReactElement(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
}
```

有 `ReactElement` 函数之后，现在要对 `key`，`ref`，`props` 进行处理

### 处理 key/ref/props

`maybeKey` 是标签属性的 `key`，如果存在，直接将 `maybeKey` 赋值给 `key`

但是 `config` 中可能存在 `key`，那么 `config.key` 的优先级更高，将 `config.key` 赋值给 `key`

我们知道 `key` 属性是来自于 `jsx` 的标签属性，那什么情况下 `config` 中会存在 `key` 呢？

```js
// maybeKey 是 jsx 上的 key
<div key="uccs">uccs</div>;

// config 的 key，使用展开运算法，将 props 的属性展开到 div 上，这时如果 props 中存在 key，那么这 key 就会在 config 中
const props = {
  key: "configKey",
};
<div style={{ color: "red" }} {...props}></div>;
```

`hasValidKey` 和 `hasValidRef` 函数比较简单，是用来判断 `config` 是否有 `key` 和 `ref` 的属性

```js
function hasValidKey(config) {
  return config.key !== undefined;
}
function hasValidRef(config) {
  return config.ref !== undefined;
}
```

遍历 `config` 属性，将 `config` 中的属性一个个的赋值到 `props` 中

这里要注意两点：

- 只复制 `config` 自身的属性
- 不复制 `RESERVED_PROPS` 中的属性
  - `RESERVED_PROPS` 是一个常量，包括 `key`，`ref`，`__self`，`__source` 等几个属性
  ```js
  const RESERVED_PROPS = {
    key: true,
    ref: true,
    __self: true,
    __source: true,
  };
  ```

到这里 `props`，`key`，`ref` 都已经处理完了，调用 `ReactElement` 函数，返回一个虚拟 \`DOM

源码如下：

```js
// type：标签名，如果是原生标签，就是标签名，比如 div；如果是组件，就是组件名，比如 MyApp
// config：标签属性，包括 children，但不包括 key
// maybeKey：标签属性为 key
function jsxDEV(type, config, maybeKey) {
  let propName;
  const props = {};
  let key = null;
  let ref = null;
  // maybeKey 是 jsx 上的 key
  // <div key="uccs">uccs</div>
  if (typeof maybeKey !== undefined) {
    key = maybeKey;
  }
  // config 的 key，使用展开运算法，将 props 的属性展开到 div 上，这时如果 props 中存在 key，那么这 key 就会在 config 中
  /*
    const props = {
      key: "configKey",
    };
    <div style={{ color: "red" }} {...props}></div>;
  */
  if (hasValidKey(config)) {
    key = config.key;
  }
  if (hasValidRef(config)) {
    key = config.ref;
  }

  for (propName in config) {
    // 1. 只复制 config 自身的属性
    // 2. 不复制 RESERVED_PROPS 中的属性
    // hasOwnProperty 函数是从 Object.prototype 结构出来的
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }
  // 调用 ReactElement 返回虚拟 DOM
  return ReactElement(type, key, ref, props);
}
```

## createRoot

`ReactDOM.render` 是 `react` 传统的渲染方法，它是在同步模式下运行的，`createRoot` 是 `react@18` 引入的新方法，它允许在并发模式下运行

`react` 并发模式并不意味着真正的并发，而是在渲染和更新时利用时间切片，使得渲染组件时间可以中断，从而提高程序的性能

`createRoot` 函数的源码是怎么实现的呢？

`createRoot` 函数由 `react-dom` 提供的，在文件 `react-dom/src/client/ReactDOM.js` 中

`createRoot` 函数接受一个参数 `container`，返回一个`FiberRoot` 节点

- `container`：根节点，是页面的真实节点，`document.getElementById("root")` 的方式获取
- `FiberRoot`：根节点对应的 `fiber` 节点

`FiberRoot` 是通过 `createContainer` 函数创建的，通过构造函数 `ReactDOMRoot` 返回

```js
// react-dom/src/client/ReactDOM.js
function createRoot(container) {
  // 调用 createContainer 创建一个容器
  // 返回一个包装过的的节点
  // container 是页面的真实节点：document.getElementById("root")
  // root 是 FiberRoot
  const root = createContainer(container);
  return new ReactDOMRoot(root);
}
```

`ReactDOMRoot` 构造函数接收一个参数 `FiberRoot`，将 `FiberRoot` 赋值给私有变量 `_internalRoot`

然后在 `ReactDOMRoot` 的原型上定义一个 `render` 方法

```js
const root = createRoot(document.getElementById("root"));
// 这个 render 方法是在 ReactDOMRoot 的原型上定义的
root.render(<App />);
```

`ReactDOMRoot` 的 `render` 方法接收一个参数 `children`，调用 `updateContainer` 函数，将 `children` 和 `FiberRoot` 传入

```js
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

/*
  const root = createRoot(document.getElementById("root"));
  // 这个 render 方法是在 ReactDOMRoot 的原型上定义的
  root.render(<App />);
*/
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  // children 就是 <App />，root 是 FiberRoot
  updateContainer(children, root);
};
```

我们先来看 `createContainer` 函数，

### createContainer

`createContainer` 函数接收一个 `containerInfo` 作为参数

- `containerInfo` 是页面的根节点

然后在内部调用了 `createFiberRoot` 函数，创建 `FiberRoot` 节点

`createContainer` 函数定义在 `react-reconciler/src/ReactFiberReconciler.js` 文件中

```js
// react-reconciler/src/ReactFiberReconciler.js
function createContainer(containerInfo) {
  // 调用 createFiberRoot 创建一个 FiberRoot 节点
  return createFiberRoot(containerInfo);
}
```

`createFiberRoot` 函数定义在 `react-reconciler/src/ReactFiberRoot.js` 文件中

`createFiberRoot` 函数内部做的事情比较复杂，主要做了五件事情

1.  首先调用构造函数 `FiberRootNode`
2.  然后创建一个 `uninitializedFiber` 节点，这是 `RootFiber`
3.  将 `RootFiber` 和 `FiberRoot` 节点关联
    - `FiberRoot.current = RootFiber`
    - `RootFiber.stateNode = FiberRoot`
4.  初始化 `Fiber` 的 `updateQueue`
5.  将 `FiberRoot` 返回出去

我们一步步来看具体的实现

#### 1. FiberRootNode

`FiberRootNode` 是构造函数，将 `containerInfo` 赋值给 `FiberRoot` 的 `containerInfo` 属性

通过之前的介绍，我们已经知道了 `containerInfo` 是页面的根节点，也是真实节点

```js
// react-reconciler/src/ReactFiberRoot.js
function FiberRootNode(containerInfo) {
  // containerInfo 是页面的根节点，也是真实节点
  this.containerInfo = containerInfo;
}
```

#### 2. createHostRootFiber

`createHostRootFiber` 通过调用 `createFiber` 创建一个未初始化的 `RootFiber` 节点

```js
// react-reconciler/src/ReactFiber.js
function createHostRootFiber() {
  // 创建一个 RootFiber
  return createFiber(HostRoot, null, null);
}
```

`createFiber` 函数调用构造函数 `FiberNode` 创建 `Fiber` 节点

`createFiber` 接收三个参数：

- `tag`：`Fiber` 节点类型，比如原生节点(`div`)、函数组件(`<MyApp />`)
- `pendingProps`： 还未更新的属性，比如 `children`，`style` 等
- `key`：`jsx` 属性的 `key`

```js
// react-reconciler/src/ReactFiber.js
function createFiber(tag, pendingProps, key) {
  // 创建 fiber 节点
  return new FiberNode(tag, pendingProps, key);
}
```

`FiberNode` 是个构造函数，给 `fiber` 提供一些属性

```js
function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
  this.key = key;
  this.type = null;
  // 目前可以理解为真实 dom 节点
  this.stateNode = null;

  // 指向父节点
  this.return = null;
  // 指向兄弟节点
  this.sibling = null;
  // 指向第一个子节点
  // child
  // 等待生效的 props
  this.pendingProps = pendingProps;
  // 已经生效的 props
  this.memoizedProps = null;
  // 已经生效的 state
  this.memoizedState = null;
  // 等待更新的东西存入更新队列
  this.updateQueue = null;
  // 更新相关的操作
  // fiber 本身的更新
  this.flags = NoFlags;
  // fiber 子节点的更新
  this.subtreeFlags = NoFlags;
  // 两颗 fiber 树
  // 一个是当前页面上的 fiber 树
  // 一个是要更新的 fiber 树
  // alternate 指向的是需要更新的 fiber 树
  this.alternate = null;
  // 第几个节点
  this.index = 0;
}
```

#### 3. 关联 FiberRoot 和 RootFiber

`FiberRoot` 是页面的根节点，`RootFiber` 是 `Fiber` 的根节点

`FiberRoot.current` 属性指向 `RootFiber`，`RootFiber.stateNode` 的属性指向 `FiberRoot`

```js
           ---current--->
FiberRoot                   RootFiber
           <--stateNode--

```

#### 4. 初始化 Fiber 的 updateQueue

每个 `Fiber` 都有一个 `updateQueue` 队列，这个队列保存的是待更新的 `Fiber`

`initializedUpdateQueue` 函数接受一个参数 `fiber`

`Fiber` 中保存的队列结构如下：

每个队列都有一个 `shared` 的属性，`shared` 属性中有一个 `pending` 属性，`pending` 属性指向第一个待更新的 `Fiber`

```js
const queue = {
  shared: {
    // pending 指向第一个待更新的 Fiber
    pending: null,
  },
};
```

```js
// react-reconciler/src/ReactFiberClassUpdateQueue.js
function initializeUpdateQueue(fiber) {
  const queue = {
    shared: {
      // pending 指向第一个待更新的 Fiber
      pending: null,
    },
  };
  // 初始化 fiber 的 updateQueue 属性
  fiber.updateQueue = queue;
}
```

#### 5. 将 FiberRoot 返回出去

将创建好的 `FiberRoot` 返回出去

#### tag 和 HostRoot

`tag` 是用来表示当前是啥元素：

- `FunctionComponent`：`0`
  - 表示函数组件
- `ClassComponent`：`1`
  - 表示类组件
- `IndeterminateComponent`：`2`
  - 表示不确定类型的组件
- `HostRoot`：`3`
  - 表示宿主环境的根节点，对应的是 `RootFiber`
  - 不同的宿主环境，节点不一样
- `HostComponent`：`5`
  - 表示原生节点，比如 `div`，`span` 等
- `HostText`：`6`
  - 表示文本节点

`HostRoot` 是 `32` 位的二进制数，用来表示当前要做啥操作，目前取值有：

- `NoFlags`：`0b00000000000000000000000000000000`
  - 表示无操作
- `Placement`：`0b00000000000000000000000000000010`
  - 表示插入操作
- `Update`：`0b00000000000000000000000000000100`
  - 表示更新操作
- `MutationMask`：`Placement | Update`
  - 表示插入和更新操作

#### 源码

```js
function createFiberRoot(containerInfo) {
  // 创建 FiberRoot 节点
  const root = new FiberRootNode(containerInfo);
  // 创建一个 RootFiber 节点
  const uninitializedFiber = createHostRootFiber();
  // 将 FiberRoot 和 RootFiber 互相关联
  // FiberRoot.current 指向 RootFiber
  root.current = uninitializedFiber;
  // RootFiber.stateNode 指向 FiberRoot
  uninitializedFiber.stateNode = root;
  // 给 RootFiber 初始化 updateQueue 属性
  initializeUpdateQueue(uninitializedFiber);
  // 将 FiberRoot 节点返回出去
  return root;
}
```

#### 总结

`FiberRoot` 是页面的根节点，`RootFiber` 是 `Fiber` 的根节点，他们之间的关系如下：

    FiberRoot
      - containerInfo -> div#root
      - current -> RootFiber
        - stateNode -> FiberRoot
        - updateQueue
        - tag -> HostRoot
        - ...

## render

`react@18` 之前，`react` 是直接把虚拟 `DOM` 转成真实的 `DOM`

在 `react@18` 推出 `fiber` 架构后，`react` 先把虚拟 `DOM` 转成 `fiber` 树，然后再把 `fiber` 树转成真实的 `DOM`

`react@18` 的 `render` 可以分为两个阶段：

- 渲染阶段
  - `beginWork`，对应虚拟 `DOM` 转成 `fiber` 树的过程
  - `completeWork`，对应 `fiber` 树转成真实的 `DOM` 树的过程
- 提交阶段
  - `commitWork`，真实的 `DOM` 树挂载到页面上的过程

在 `beginWork` 之前，`react` 还做了一些其他事情，我们会在本篇中重点介绍

### updateContainer

`updateContainer` 是 `render` 函数的入口

`updateContainer` 函数接收两个参数：

- `element`：真实节点，通过 `document.getElementById("root")` 获取的
- `container`：`createContainer` 创建的 `FiberRoot` 节点

主要做了四件事情：

1.  创建一个更新对象 `update`
2.  将需要更新的内容 `element` 赋值给更新对象 `update`
3.  将更新对象添加到 `Fiber` 的更新队列中 `updateQueue`
4.  将这个 `Fiber` 添加到调度队列中

流程图如下：

![1.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/44dbc15aa5cf4fbb8a5827049e74d318~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2668&h=1170&s=179636&e=png&b=fdf8f6)

源码：

```js
// react-reconciler/src/ReactFiberReconciler.js
function updateContainer(element, container) {
  // container 是 FiberRoot
  // container.current 是 RootFiber
  const { current } = container;
  // 创建一个更新对象 update
  const update = createUpdate();
  // 将 element 添加到 update.payload
  update.payload = { element };
  // 将 update 添加到 current.updateQueue
  // 拿到 fiber 所在应用的根节点
  const root = enqueueUpdate(current, update);
  // 从根节点开始调度
  scheduleUpdateOnFiber(root);
}
```

### createUpdate

首先需要创建一个 `update` 对象，`update` 对象是用来保存更新内容的

`createUpdate` 源码比较简单，就是创建了一个空对象

```js
// react-reconciler/src/ReactFiberClassUpdateQueue.js
function createUpdate() {
  const update = {};
  return update;
}
```

在 `updateContainer` 函数中把需要更新的虚拟 `DOM` 赋值给了 `update.payload`

### enqueueUpdate

创建完 `update` 对象后，需要将 `update` 对象添加到 `Fiber` 的更新队列中

`enqueueUpdate` 函数接收两个参数和一个返回值：

- 参数：
  - `fiber`：`Fiber` 节点，初次渲染时是 `RootFiber` 节点
  - `update`：更新对象
- 返回值：
  - `FiberRoot`：当前 `fiber` 对应的应用程序的根节点 `FiberRoot`

主要做了这几件事情：

1.  拿到 `fiber` 中的 `pending`
2.  判断 `pending` 是否为 `null`
    - 如果为 `null`，将 `update` 赋值给 `update.next`
    - 如果不为 `null`
      - 将 `update.next` 赋值给 `pending.next`
      - 将 `pending.next` 赋值给 `update`
3.  将 `update` 放入 `fiber` 的 `pending` 中

我们重点来看一下 `pending` 和 `update` 的关系

`pending` 和 `update` 它们是链表结构，通过 `next` 关联

            ---next-->
    update              pending
            <--next---

当 `updateQueue` 执行时，外界会传入一个 `fiber` 和 `update`

这时 `fiber.updateQueue.shared.pending` 可能不存在，所以直接将 `update` 的 `next` 指向自己就好了，然后将 `update` 赋值给 `updateQueue.shared.pending`，如图所示：

![2.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/62847e59f35b4245ab043c8ed5b34952~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2018&h=421&s=66866&e=png&b=fdf8f6)

```js
// pending 不存在
const pending = updateQueue.shared.pending;
if (pending === null) {
  update.next = update;
}
updateQueue.shared.pending = update;
```

`fiber.updateQueue.stared.pending` 存在时，说明 `updateQueue` 中存在待更新的 `pendingUpdate`，需要将这个 `pendingUpdate` 和传入的 `update` 关联起来(`pendingUpdate` 后面就用 `pending` 代替了)

- 由于 `pending.next` 指向的是 `pending` 自身
- 将传进来的 `update.next` 指向 `pending.next`，也就实现了将 `update` 和 `pending` 关联起来
- 然后再将 `pending.next` 指向 `update`，也就实现了将 `pending` 和 `update` 关联起来了
  ![3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/97f2b4226a6e443a8720d6bf8b8c7124~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2077&h=478&s=92751&e=png&b=fdf8f6)

```js
// pending 存在
const pending = updateQueue.shared.pending;
if (pending) {
  update.next = pending.next;
  pending.next = update;
}
updateQueue.shared.pending = update;
```

那这里出现一个问题了，假如说现在链表中有多个 `update`，那么他们之间的顺序是咋样的

我们来看一下这个过程：

假如现在 `updateQueue` 为 `null`

1.  第一个 `update` 进来，记为 `updateA`
    - `pending = updateQueue.shard.pending`, `pending` 为 `null`
    - `updateA.next = updateA`
    - 得到的链表关系：`updateA` => `updateA`
    - `updateQueue.shard.pending = updateA`
    ```js
    updateA = { a: 1 };
    // ...
    updateQueue = {
      shared: {
        pending: updateA,
      },
    };
    updateA = { a: 1, next: updateA };
    ```
2.  第二个 `update` 进来，记为 `updateB`
    - `pending = updateQueue.shard.pending`, `pending` 为 `updateA`
    - `updateB.next = pending.next`, 将 `pending` 代入 `updateA`，也就是 `updateB.next = updateA.next` => `updateB.next = updateA`
    - `pending.next = updateB`
      ```js
      pending = updateQueue.shared.pending; // updateQueue.shared.pending 得到 updateA
      🔽
      updateB.next = pending.next; // ∵ pending 是 updateA
      🔽
      --> updateB.next = updateA.next; // ∴ 将 pending.next 替换成 updateA.next
      🔽
      --> updateB.next = updateA; // ∴ updateA.next 得到 updateA，将 updateA 赋值给 updateB.next
      🔽
      pending.next = updateB; // ∵ pending 是 updateA
      🔽
      --> updateA = updateB; // ∴ 将 pending.next 替换成 updateA，将 updateB 赋值给 updateA
      ```
    - 得到的链表关系：`updateB` => `updateA` => `updateB`
    - `updateQueue.shard.pending = updateB`
      ```js
      updateB = { b: 1 };
      // ...
      updateQueue = {
        shared: {
          pending: updateB,
        },
      };
      updateB = { b: 1, next: updateA };
      updateA = { a: 1, next: updateB };
      ```
3.  第三个 `update` 进来，记为 `updateC`
    - `pending = updateQueue.shard.pending`, `pending` 为 `updateB`
    - `updateC.next = pending.next`, `pending.next` 为 `updateA`
    - `pending.next = updateC`
      ```js
      pending = updateQueue.shared.pending; // updateQueue.shared.pending 得到 updateB
      🔽
      updateC.next = pending.next; // ∵ pending 是 updateB
      🔽
      --> updateC.next = updateB.next; // ∴ 将 pending.next 替换成 updateB.next
      🔽
      --> updateC.next = updateA; // ∴ updateB.next 得到 updateA，将 updateA 赋值给 updateC.next
      🔽
      pending.next = updateC; // ∵ pending 是 updateB
      🔽
      --> updateB = updateC;  // ∴ 将 pending.next 替换成 updateB，将 updateC 赋值给 updateB
      ```
    - 得到的链表关系 `updateC` => `updateA` => `updateB` => `updateC`
    - `updateQueue.shard.pending = updateC`
    ```js
    updateC = { C: 1 };
    // ...
    updateQueue = {
      shared: {
        pending: updateC,
      },
    };
    updateC = { c: 1, next: updateA };
    updateA = { a: 1, next: updateB };
    updateB = { b: 1, next: updateC };
    ```
4.  第四个 `update` 进来，记为 `updateD`
    - `pending = updateQueue.shard.pending`, `pending` 为 `updateC`
    - `updateD.next = pending.next`, `pending.next` 为 `updateA`
    - `pending.next = updateD`
      ```js
      pending = updateQueue.shared.pending; // updateQueue.shared.pending 得到 updateC
      🔽
      updateD.next = pending.next; // ∵ pending 是 updateC
      🔽
      --> updateD.next = updateC.next; // ∴ 将 pending.next 替换成 updateC.next
      🔽
      --> updateD.next = updateA; // ∴ updateC.next 得到 updateA，将 updateA 赋值给 updateD.next
      🔽
      pending.next = updateD; // ∵ pending 是 updateC
      🔽
      --> updateC = updateD;  // ∴ 将 pending.next 替换成 updateC，将 updateD 赋值给 updateC
      ```
    - 得到的链表关系 `updateD` => `updateA` => `updateB` => `updateC` => `updateD`
    - `updateQueue.shard.pending = updateD`
    ```js
    updateD = { D: 1 };
    // ...
    updateQueue = {
      shared: {
        pending: updateD,
      },
    };
    updateD = { d: 1, next: updateA };
    updateA = { a: 1, next: updateB };
    updateB = { b: 1, next: updateC };
    updateC = { c: 1, next: updateD };
    ```
5.  依次类推，第五个 `update` 进来，记为 `updateE`，得到的链表关系 `updateE` => `updateA` => `updateB` => `updateC` => `updateD` => `updateE`
    ```js
    updateE = { E: 1 };
    // ...
    updateQueue = {
      shared: {
        pending: updateE,
      },
    };
    updateE = { e: 1, next: updateA };
    updateA = { a: 1, next: updateB };
    updateB = { b: 1, next: updateC };
    updateC = { c: 1, next: updateD };
    updateD = { d: 1, next: updateE };
    ```

总结：每次 `update` 进来，最新的 `update` 放在链表的开头，然后它的 `next` 指向最早的 `update`，之后就是按照顺序依次排列，如图所示

![4.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b936b6e92dac40f28f3a33422b905ca3~tplv-k3u1fbpfcp-jj-mark:0:0:0:0:q75.image#?w=2357&h=2141&s=237163&e=png&b=fdf8f6)

再处理完成 `updateQueue` 之后，需要为这个 `fiber` 设置优先级，然后将 `RootFiber` 返回出去

关于优先级的设置交给 `markUpdateLaneFromFiberToRoot` 函数来处理

#### markUpdateLaneFromFiberToRoot

在初次渲染时，暂时还不涉及到优先级的问题，所以这里暂时不做优先级相关的处理，等后面更新时再来处理

这里先实现如何通过 `fiber` 找到 `fiber` 所在应用的根节点 `FibeRoot`

`markUpdateLaneFromFiberToRoot` 函数接受一个参数：`fiber`，通过循环遍历 `fiber` 的父节点，直到找到 `HostRoot` 节点，然后返回 `HostRoot` 节点（`fiber` 对应的真实节点是 `stateNode` 属性）

```js
function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let fiber = sourceFiber;
  // 拿到 parent
  let parent = sourceFiber.return;
  // 循环遍历 parent，如果 parent 存在，就将 parent 赋值给 node，然后将 parent 的父节点赋值给 parent，继续遍历
  if (parent !== null) {
    fiber = parent;
    parent = parent.return;
  }
  // 遍历结束后，如果 fiber.tag 是页面的根节点，那么就返回 fiber.stateNode，也就是 FiberRoot
  if (fiber.tag === HostRoot) {
    return fiber.stateNode;
  }
  return null;
}
```

#### 源码

`enqueueUpdate` 源码逻辑如下：

```js
// react-reconciler/src/ReactFiberClassUpdateQueue.js
// 初次渲染时 fiber 是 RootFiber
// 返回的是 FiberRoot
function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  // 拿到 updateQueue 中的 pending
  // pending 和 update 的区别：pending 是从 updateQueue 中读取的，update 是最新传入的
  // 假如说 updateQueue 中多个 pending，那么 pending.next 指向下一个 pending，最后一个 pending.next 指向第一个 pending，形成一个链表
  // 假如说 updateQueue 只有一个 pending，那么 pending.next 指向自己
  // updateQueue.shared.pending 拿到的第一个 pending 是上一次放入的 update，这个 update.next 指向的是最早进入 updateQueue 的 update
  // 当有新的 update 进入时，将 update.next 指向最早的 update，然后将最早的 update.next 指向最新传入的 update
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    // 如果 updateQueue 中不存在 pending，将 update.next 指向自己
    update.next = update;
  } else {
    // 如果 updateQueue 中存在 pending
    // pending 是上一次传入的 update，我们知道上一次传入的 update.next 指向最早的 update，所以 pending.next 指向最早的 update
    // 当有新的 update 进入时，将 update.next 指向最早的 update
    update.next = pending.next;
    // 将最早的 update.next 指向最新传入的 update
    pending.next = update;
  }
  // 将最新的 update 赋值给 updateQueue.shared.pending
  updateQueue.shared.pending = update;
  // 给当前 fiber 设置优先级，并返回 FiberRoot
  return markUpdateLaneFromFiberToRoot(fiber);
}
```

### scheduleUpdateOnFiber

更新对象创建好后，也放入了更新队列后，就要开始调度了，调度的入口是 `scheduleUpdateOnFiber` 函数

`scheduleUpdateOnFiber` 函数接受一个 `FiberRoot` 作为参数，负责从根节点开始调度

`FiberRoot` 作为参数从 `scheduleUpdateOnFiber` 函数传入 `ensureRootIsScheduled` 函数，再传入 `perormConcurrentWorkOnRoot` 函数

在实际的 `react` 源码中逻辑是比较复杂的，这里我们只实现最核心的逻辑，

调度的核心逻辑是 `performConcurrentWorkOnRoot` 函数中完成的

`ensureRootIsScheduled` 就不说了，内部就调用了 `scheduleCallback`

`scheduleCallback` 函数是时间切片，我们先用 `requestIdleCallback` 来模拟一下，实际 `react` 是自己写了一套时间切片的实现，我们后面再实现

```js
// react-reconciler/src/ReactFiberWorkLoop.js
// 这个 root 是 FiberRoot
function scheduleUpdateOnFiber(root) {
  ensureRootIsScheduled(root);
}

// root 是 FiberRoot
function ensureRootIsScheduled(root) {
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root));
}

// scheduler/index.js
function scheduleCallback(callback) {
  requestIdleCallback(callback);
}
```

`performConcurrentWorkOnRoot` 函数是从根节点 `FiberRoot` 开始调度，可以实现同步调度和异步调度

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function performConcurrentWorkOnRoot(root) {
  // 同步调度
  renderRootSync(root);
  // 同步调度结束后， alternate 已经完成处理了，可以将它渲染在页面上了
  // 所以就将 alternate 赋值给 finishedWork
  root.finishedWork = root.current.alternate;
  // 进入 commitWork 阶段
  commitRoot(root); // commitWork 阶段
}
```

我们这里先来实现同步调度，同步调度是由 `renderRootSync` 函数实现的

#### renderRootSync

`renderRootSync` 函数接受 `FiberRoot` 作为参数

主要做两件事情：

1.  创建一个 `workInProgress` 工作树，你可以把它理解为是页面中正在工作的 `fiber` 树：由 `prepareFreshStack` 函数完成
2.  循环遍历 `workInProgress` 工作树，调用 `performUnitOfWork` 函数，完成工作：由 `workLoopSync` 函数完成

```js
// react-reconciler/src/ReactFiberWorkLoop.js
// root 是 FiberRoot
function renderRootSync(root) {
  // 创建一个 workInProgress 工作树，你可以把它理解为是页面中正在工作的 fiber 树
  prepareFreshStack(root);
  // 循环遍历 workInProgress 工作树，调用 performUnitOfWork 函数
  workLoopSync();
}
```

我们先来看一下 `prepareFreshStack` 函数，这个函数用来准备一个最新的工作栈，换句话说就是准备一颗渲染在页面中的 `fiber` 树

```js
// react-reconciler/src/ReactFiberWorkLoop.js
// root 是 FiberRoot
function prepareFreshStack(root) {
  // 创建一颗 fiber 树，root.current 是 RootFiber
  // workInProgress 是 RootFiber.alternate
  workInProgress = createWorkInProgress(root.current, null);
}
```

创建 `workInProgress` 工作树的过程是由 `createWorkInProgress` 函数完成的

`createWorkInProgress` 函数接收两个参数：

- `current`：当前的 `fiber` 树，也就是 `RootFiber`
- `pendingProps`：还未更新的属性，比如 `children`，`style` 等，初次渲染时是 `null`

```js
// react-reconciler/src/ReactFiber.js
// current 是 RootFiber
// pendingProps 是还未更新的属性，比如 children，style 等，初次渲染时是 null
// 返回
//    初次渲染时，current.alternate 是 null，所以 workInProgress 是一个新的 fiber 树，它的 alternate 是 current，也就是 RootFiber
function createWorkInProgress(current, pendingProps) {
  // workInProgress 是一个新的 fiber 树
  // current.alternate 指向的是上一次渲染的 fiber 树
  let workInProgress = current.alternate;
  // 如果 workInProgress 不存在，那么就创建一个新的 fiber 树
  if (workInProgress === null) {
    // 创建一个新的 fiber 树
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type;
    // 创建的 workInProgress 不存在 stateNode 属性
    workInProgress.stateNode = current.stateNode;
    // 创建时 workInProgress 的 alternate 不存在
    // 所以 workInProgress.alternate 是 RootFiber
    workInProgress.alternate = current;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;
    // 创建的 workInProgress，它的属性 flags 和 subtreeFlags 都是 NoFlags
    // 这里是为了保持统一，都将这个值设置为 NoFlags
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
  }
  // 将 current 中的属性一个个赋值给 workInProgress
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;

  return workInProgress;
}
```

在内存中处理的不是 `workInProgress`，而是 `workInProgress.alternate`，为什么？

因为 `workInProgress.alternate === root.current`，`root.current` 是 `RootFiber`

初次渲染时 `RootFiber.alternate` 是 `null`，会创建一个 `workInProgress`，然后将 `RootFiber` 赋值给 `workInProgress.alternate`

也就是说 `workInProgress.alternate` 才是 `beiginWork` 处理的对象

接着我们看 `workLoopSync` 函数内部是循环遍历 `workInProgress`，并调用 `performUnitOfWork` 函数，传入 `workInProgress`

```js
// react-reconciler/src/ReactFiberWorkLoop.js
function workLoopSync() {
  // 第一个 workInProgress 是 RootFiber.alternate
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

`performUnitOfWork` 函数接收一个参数 `workInProgress`，主要做的事情：

1.  开始调用 `beginWork`，将 `DOM`树 转化为 `Fiber` 树，
2.  调用 `beginWork` 函数后，返回的是下一个待处理的工作单元
3.  经过 `beginWork` 函数处理后，`pendingProps` 已经处理完了，可以赋值给 `memoizedProps`
4.  如果有就将下一个工作单元赋值给 `workInProgress`，如果没有就调用 `completeUnitOfWork` 函数，进入 `completeWork` 阶段

```js
function performUnitOfWork(unitOfWork) {
  // 拿到 workInProgress 的 alternate 属性
  const current = unitOfWork.alternate;
  // 调用 beginWork 函数，beginWork 函数返回的是下一个工作单元
  let next = beginWork(current, unitOfWork); // beginWork
  // 在经过 beingWork 处理之后，pendingProps 已经处理完了，可以赋值给 memoizedProps
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  // 如果 next 为 null，说明没有下一个工作单元了，那么就调用 completeUnitOfWork 函数
  if (next === null) {
    completeUnitOfWork(unitOfWork); // completeWork
  } else {
    workInProgress = next;
  }
}
```

## 总结

1.  `jsxDEV` 函数负责将 `jsx` 转换成虚拟 `DOM`
2.  `createRoot` 函数负责创建 `FiberRoot` 和 `RootFiber`
    - `FiberRoot` 是页面根节点 ==> `document.getElementById("root")`
    - `RootFiber` 是 `Fiber` 根节点 `root.current`
    - 他们通过 `RootFiber = FiberRoot.current` 和 `FiberRoot = RootFiber.stateNode` 互相关联
3.  `render` 函数负责页面渲染：
    - 渲染阶段
      - `beginWork`，对应虚拟 `DOM` 转成 `fiber` 树的过程
      - `completeWork`，对应 `fiber` 树转成真实的 `DOM` 树的过程
    - 提交阶段
      - `commitWork`，真实的 `DOM` 树挂载到页面上的过程
4.  渲染阶段 `beginWork` 前有很多准备工作
    - 更新对象准备 `update`
    - 更新队列准备 `updateQueue`
    - 调度准备（`beginWork` 在这个阶段）
5.  `updateQueue` 中 `update` 是链表结构
    - 从 `updateQueue` 中取出的 `update` 是最新传入的 `update`
    - `update.next` 指向最早传入的 `update`
    - 以此类推，形成一个链表结构：`updateD` => `updateA` => `updateB` => `updateC` => `updateD`
6.  调度阶段要准备一颗 `workInProgress` 树，也就是页面中正在工作的 `fiber` 树
    - `workInProgress.alternate === root.current ==> true`
      - `root.current 是 RootFiber`
    - `beginWork` 处理的是 `workInProgress.alternate`
    - `completeWork` 处理的是 `workInProgress`
    - `commitWork` 处理的是 `root.current.alternate`

## 源码

1.  [jsxDEV](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react/src/jsx/ReactJSXElement.js#L29)
2.  [createRoot](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react-dom/src/client/ReactDOMRoot.js#L21)
3.  [render](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react-dom/src/client/ReactDOMRoot.js#L15)
    - [updateContainer](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react-reconciler/src/ReactFiberReconciler.js#L10)
    - 核心逻辑：[enqueueUpdate](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react-reconciler/src/ReactFiberClassUpdateQueue.js#L21)
    - 核心逻辑：[performConcurrentWorkOnRoot](https://github.com/astak16/react-source/blob/1185e18012a4613f0354419899892327b400a9d5/react18-core/packages/react-reconciler/src/ReactFiberWorkLoop.js#L17)
