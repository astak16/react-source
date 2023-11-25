## 函数组件

函数组件通过 `babel` 转义后变成了 `React.createElement` 的调用

```js
// 函数组件
function MyComponent(props) {
  return <div>MyComponent</div>;
}
🔽
// babel 转义后
function MyComponent(props) {
  return /*#__PURE__*/ React.createElement("div", null, "MyComponent");
}
```

那我们使用函数组件时 `<MyComponent />` `babel` 是怎么转义的呢？

```js
// 函数组件使用
let element = <MyComponent />;
🔽
// babel 转义后
let element = /*#__PURE__*/ React.createElement(MyComponent, null);
```

`babel` 直接把函数传递给了 `createElement`

通过 [createElement 函数源码](https://github.com/astak16/simple-react/blob/574236a62241e5da57921ada2cd1b54fc6791547/docs/%E5%88%9D%E5%A7%8B%E6%B8%B2%E6%9F%93%2C%E5%AE%9E%E7%8E%B0createElement%E5%92%8Crender%E5%87%BD%E6%95%B0.md) 我们知道，`createElement` 第一个参数是 `type`

如果是 `dom`，这个 `type` 就是 `dom` 名称，比如：`div`、`span`；现在是函数组件，这个 `type` 就是函数引用

那这样就好办了，判断一下 `type` 是不是函数，如果是函数就先执行下

### 函数组件处理

将 `VNode` 转换成真实 `dom`，我们是在 `createDOM` 函数中进行的

我们需要在处理 `dom` 标签之前，处理函数组件（不管是函数组件还是 `VNode`，`$$typeof` 都是 `REACT_ELEMENT`）

```js
function createDOM(VNode) {
  // 处理函数组件
  // 不管是函数组件还是 VNode，$$typeof 都是 REACT_ELEMENT
  if (typeof VNode.type === "function" && $$typeof !== REACT_ELEMENT) {
    return getDomByFunctionComponent(VNode);
  }
  // 处理 dom 标签
  // ...
}
```

我们将函数组件的处理抽离成一个函数 `getDomByFunctionComponent`

```js
function getDomByFunctionComponent(VNode) {
  let { type, props } = VNode;
  // 因为 type 是函数，所以直接执行
  let renderVNode = type(props);
  // 有时候函数组件返回的事 null，这时候就不需要渲染了
  if (!renderVNode) return null;
  // 函数组件返回的是 VNode，所以需要递归处理
  return createDOM(renderVNode);
}
```

## 类组件

类组件是通过继承 `React.Component` 来实现的，`props` 是通过 `this.props` 获取的，也就是说 `Component` 需要提供一个 `props` 属性

```js
class MyClassComponent extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <div>name: {this.props.name}</div>;
  }
}
let element = <MyClassComponent name="uccs" />;
```

所以 `React` 需要提供一个 `Component` 的类供使用

```js
class Component {
  // 类组件标识
  static IS_CLASS_COMPONENT = true;
  constructor(props) {
    // 保存 props
    this.props = props;
  }
}
```

在 `js` 中 `class` 本质还是一个函数，所以它走到这里会报错：`Class constructor MyApp cannot be invoked without 'new'`，因为构造函数需要使用 `new` 来调用

```js
if (typeof type === "function" && $$typeof === REACT_ELEMENT) {
  return getDomByFunctionComponent(VNode);
}
```

### 类组件处理

所以我们需要通过 `IS_CLASS_COMPONENT` 来判断是否是类组件

```js
// 类组件，通过 IS_CLASS_COMPONENT 属性来判断
if (
  typeof type === "function" &&
  $$typeof === REACT_ELEMENT &&
  type.IS_CLASS_COMPONENT
) {
  return getDomByClassComponent(VNode);
}
```

类组件处理逻辑抽离成一个函数 `getDomByClassComponent`

```js
function getDomByClassComponent(VNode) {
  let { type, props } = VNode;
  // 因为 type 是 class，所以需要 new 一个实例
  let instance = new type(props);
  // 调用 render 方法，得到 VNode
  let renderVNode = instance.render();
  // 返回 null 就不需要渲染了
  if (!renderVNode) return null;
  // 函数组件返回的事 VNode，所以需要递归处理
  return createDOM(renderVNode);
}
```

## setState

`react` 中数据发生变化从而更新试图，我们需要手动调用 `this.setState({ name: "astak" })`

`setState` 这个函数我们并没有定义，那我们能想到，这一定是 `Component` 的一个方法

`setState` 需要做两件事情：

- 属性合并
  ```js
  // oldState
  this.state = {
    name: "uccs",
    age: 18,
  };
  // 调用 setState
  this.setState({ name: "astak", stature: 180 });
  // new State
  this.state = {
    name: "astak",
    age: 18,
    stature: 180,
  };
  ```
- 更新视图

我们需要在 `Component` 添加两个方法：`setState` 和 `update`

```js
class Component {
  // 类组件标识
  static IS_CLASS_COMPONENT = true;
  constructor(props) {
    // 保存 props
    this.props = props;
    // 保存 state
    this.state = {};
  }
  setState(partialState) {
    // 属性合并
    this.state = { ...this.state, ...partialState };
    // 更新视图
    this.update();
  }
  update() {
    // 视图更新
  }
}
```

我们在使用 `setState` 时，可能会多次调用，如果每次调用都跟新试图的话，会造成性能浪费，所以 `react` 会将多次调用合并成一次

我们怎么来实现这个过程呢？

更新是一个比较复杂的操作，我们把这部分操作抽离成一个新的类 `Updater`

### Updater

`Updater` 需要和 `Component` 有关联，所以我们需要在 `Component` 中添加一个 `updater` 属性

```js
class Component {
  // 类组件标识
  static IS_CLASS_COMPONENT = true;
  constructor(props) {
    // 保存 props
    this.props = props;
    // 保存 state
    this.state = {};
    // 将 Component 和 Updater 进行关联
    this.updater = new Updater(this);
  }
  setState(partialState) {
    // 设置属性
  }
  update() {
    // 视图更新
  }
}
```

`Updater` 需要接收 `Component` 实例，并提供一个更新 `state` 方法的函数

用 `addState` 来更新 `state`，用 `pendingStates` 保存多次调用 `setState` 传递的参数

```js
class Updater {
  constructor(ClassComponentInstance) {
    // 保存 Component 实例
    this.ClassComponentInstance = ClassComponentInstance;
    // 保存多次调用 setState 传递的参数
    this.pendingStates = [];
  }
  addState(partialState) {
    // 将 partialState 保存到 pendingStates 中
    this.pendingStates.push(partialState);
  }
}
```

调用 `this.setState` 后，我们将 `partialState` 保存到 `pendingStates` 中，然后进行更新

在 `react` 中，更新有两种，一种是立即更新，一种是批量更新

立即更新就是调用一次 `setState`，就更新一次视图；批量更新就是多次调用 `setState`，只在最后一次调用时更新视图

### 立即更新

立即更新就是调用一次 `setState`，合并一次 `state`，立即更新一次视图

我们怎么来实现这个过程呢？

#### 立即更新预处理

我们在更新前先进行判断，当前是立即更新还是批量更新，用函数 `preHandleForUpdate` 来处理

提供一个 `isBatch` 属性，用来标识当前是批量更新还是立即更新

```js
class Updater {
  // ...
  addState(partialState) {
    // 将 partialState 保存到 pendingStates 中
    this.pendingStates.push(partialState);
    // 更新预处理
    this.preHandleForUpdate();
  }
  preHandleForUpdate() {
    // 批量更新
    if (isBatch) {
    } else {
      // 立即更新
      this.launchUpdate();
    }
  }
  launchUpdate() {
    // 立即更新视图
  }
}
```

#### 执行立即更新逻辑

这个过程我们交给 `launchUpdate` 处理

`launchUpdate` 需要做三件事情：

- 合并 `state`，这里 `state` 合并只能合并第一层
  ```js
  ClassComponentInstance.state = pendingStates.reduce((state, partialState) => {
    return { ...state, ...partialState };
  }, ClassComponentInstance.state);
  ```
- 清空 `pendingStates`
  ```js
  pendingStates.length = 0;
  ```
- 更新视图
  ```js
  ClassComponentInstance.update();
  ```

完整代码如下：

```js
class Updater {
  // ...
  launchUpdate() {
    const { pendingStates, ClassComponentInstance } = this;
    // state 合并，只合并第一层
    ClassComponentInstance.state = pendingStates.reduce(
      (state, partialState) => {
        return { ...state, ...partialState };
      },
      ClassComponentInstance.state
    );
    // 清空 pendingStates
    pendingStates.length = 0;
    // 更新视图
    ClassComponentInstance.update();
  }
}
```

### 批量更新

批量更新指的是多次调用 `setState`，只在最后一次调用时更新视图

我们先来实现批量更新的逻辑，在事件部分再来讨论触发批量更新的时机

我们先定义一个队列，这个队列有个属性：

- `isBatch`，用来标识当前是批量更新还是立即更新
- `updaters`，用来保存需要更新的 `updater`

```js
// 批量更新队列
let updaterQueue = {
  // 是否是批量更新
  isBatch: false,
  // 更新队列
  updaters: new Set(),
};
```

#### 批量更新预处理

我们在立即更新的预处理函 `preHandleForUpdate` 中，只是简单的使用了 `isBatch`，先将 `isBatch` 修改为 `updateQueue.isBatch`

如果是批量更新的话，我们需要将当前 `updater` 添加到 `updaterQueue.updaters` 中

```js
class Updater {
  // ...
  addState(partialState) {
    // 将 partialState 保存到 pendingStates 中
    this.pendingStates.push(partialState);
    // 更新预处理
    this.preHandleForUpdate();
  }
  preHandleForUpdate() {
    // 批量更新
    if (updaterQueue.isBatch) {
      // 将当前 updater 添加到 updaterQueue.updaters 中
      updaterQueue.updaters.add(this);
    } else {
      // 立即更新
      this.launchUpdate();
    }
  }
  launchUpdate() {
    // 立即更新视图
  }
}
```

#### 清空批量更新队列

在批量更新时，这里只负责将当前的 `updater` 添加的队列中，那什么时候执行清空队列操作呢？

我们首先需要提供一个清空列队的方法 `flushUpdaterQueue`

```js
function flushUpdaterQueue() {
  // 将 isBatch 设置为 false
  updaterQueue.isBatch = false;
  // 执行队列中的每一个 updater 的 launchUpdate 方法
  // 在立即更新部分我们介绍了 launchUpdate 方法的作用，是用来合并 state
  for (let updater of updaterQueue.updaters) {
    updater.launchUpdate();
  }
  // 清空队列
  updaterQueue.updaters.clear();
}
```

### dom 更新

上面立即更新和批量更新，都是更新前的处理，真正的更新操作在 `Component.update` 函数中

如何更新虚拟 `DOM` 呢？

这里先不讲解 `Diff` 算法，之后有专门的章节讲解

我们拿到旧的 `VNode` 所对应的真实 `DOM`，然后将它整体替换成新的 `VNode` 所对应的真实 `DOM`

这么说的话，`update` 函数需要做三件事情：

1. 拿到旧的 `VNode`，并获取到 `VNode` 所对应的真实 `DOM`
2. 获取到新的 `VNode`
3. 然后将旧的 `DOM` 替换成新的 `DOM`

#### 拿到旧的 VNode

我们在之前的代码中，没有将 `VNode` 保存到 `Component` 中，所以我们需要在 `Component` 中添加一个 `VNode` 属性

```js
class Component {
  constructor(props) {
    // ...
    // 保存 VNode
    this.oldVNode = null;
  }
}
```

在 `createDOM` 函数中，处理类组件时，可以获取到 `VNode`，所以我们在这里将 `VNode` 保存到 `Component` 中

```js
function getDomByClassComponent(VNode) {
  // ...
  let renderVNode = instance.render();
  // 将类组件的 VNode 保存到 ClassComponentInstance 上，方便后面更新使用
  instance.oldVNode = renderVNode;
  // ...
}
```

#### 将 VNode 转换成真实 DOM

如何将 `VNode` 转换成真是 `DOM` 呢？

在 `createDOM` 函数中，我们实现了将 `VNode` 转换成真实的 `DOM`

我们只需要将真实的 `DOM` 挂载到 `VNode` 上即可

```js
function createDOM(VNode) {
  let { type, props, $$typeof } = VNode;
  let dom = xxxx;

  // 将真实的的 DOM 挂载到 VNode 上
  VNode.dom = dom;
}
```

通过 `findDOMByVNode` 函数，找到旧的 `VNode` 所对应的真实 `DOM`

```js
function findDOMByVNode(VNode) {
  if (!VNode) return;
  if (VNode.dom) return VNode.dom;
}
```

#### 拿到新的 VNode

直接调用 `this.render()` 就能拿到新的 `VNode` 后

#### 更新 DOM 并将新的 DOM 挂载到页面上

更新 `DOM` 的过程我们交给 `updateDOM` 函数来处理：

1. 我们通过 `oldDOM` 拿到 `parentNode`
2. 然后将 `parentNode` 子节点移除
3. 调用 `createDOM` 函数，将新的 `VNode` 转换成真实 `DOM`
4. 然后将新的 `DOM` 挂载到 `parentNode` 上

```js
function updateDomTree(oldDOM, newVNode) {
  // 获取到 oldDOM 的 parentNode
  let parentNode = oldDOM.parentNode;
  // 将 oldDOM 移除
  parentNode.removeChild(oldDOM);
  // 将 newVNode 转换成真实 DOM
  let newDOM = createDOM(newVNode);
  // 挂载到页面上
  parentNode.appendChild(newDOM);
}
```

#### 将新的 VNode 挂载到 Component 上

在 `update` 函数中，我们直接 `this.oldVNode = newVNode` 将新的 `VNode` 挂载到 `Component` 上

#### 最终 update 源码

```js
class Component {
  update() {
    // 拿到 oldVNode
    let oldVNode = this.oldVNode;
    // 将 oldVNode 转换成真实 DOM
    let oldDOM = findDOMByVNode(oldVNode);
    // 调用 render 方法，得到新的 VNode
    let newVNode = this.render();
    // 更新 DOM，并将新的 DOM 挂载到页面上
    updateDomTree(oldDOM, newVNode);
    // 将新的 VNode 挂载到 Component 上
    this.oldVNode = newVNode;
  }
}
```

## 合成事件

`react` 中的事件是通过合成事件来实现的，所谓合成事件就是将原生事件进行封装，然后统一管理

`react` 这么做的目的主要是为了解决两个问题：

1. 事件对象的兼容性问题
   - 事件源：`event.target`、`event.srcElement`
   - 阻止冒泡：`event.preventDefault()`，`cancelBubble = true`
   - 阻止默认行为：`event.stopPropagation()`，`window.event.returnValue = false`
2. 统一事件绑定
   - `react` 将所有事件都绑定到 `document` 上，然后通过事件冒泡来触发事件

### 处理事件

我们之前在 `setPropsForDOM` 函数中，处理 `DOM` 属性时，没有处理事件

```js
function setPropsForDOM(dom, VNodeProps = {}) {
  // ...
  for (let key in VNodeProps) {
    // 事件单独处理，这里暂时先不处理
    if (/^on[A-Z].*/.test(key)) continue;
  }
  // ...
}
```

这一章节来专门处理事件，这里我们不会实现所有的事件，只处理 `click` 事件，因为其他事件的处理方式都是一样的

我们将事件处理抽离成一个函数 `addEvent` 函数

### addEvent

`addEvent` 接收三个参数：

- `dom` 本身
- 事件名称
- 事件处理函数

```js
function setPropsForDOM(dom, VNodeProps = {}) {
  // ...
  for (let key in VNodeProps) {
    // 事件处理
    if (/^on[A-Z].*/.test(key)) {
      // dom 本身、事件名称、事件处理函数
      // 原生事件名称是小写，所以这里需要转换一下
      addEvent(dom, key.toLowerCase(), VNodeProps[key]);
      continue;
    }
  }
  // ...
}
```

主要做两件事：

1. 将事件处理函数保存在 `DOM` 上
2. 将事件注册到 `document`

为什么要将处理事件绑定的 `DOM` 上呢？

因为事件是绑定在 `document` 上的，在目标 `DOM` 上触发后，会通过冒泡的形式传递到 `document` 上，在冒泡的过程中，我们所经过的 `parentNode` 如果有事件处理函数，都要执行

怎么知道 `DOM` 上有没有事件处理函数呢？

所以我们需要将事件处理函数保存在 `DOM` 上，这样在冒泡的过程中，我们就可以通过 `event.target` 拿到当前触发事件的 `DOM`，然后从 `DOM` 上拿到事件处理函数，执行即可

这里不能直接挂在 `DOM` 上，需要通过一个属性 `attach` 来保存（叫其他属性也可以，这个属性名是自定义的），直接挂在 `DOM` 上，相当于给 `DOM` 也注册了事件

```js
function addEvent(dom, eventName, bindFunction) {
  // 将事件处理函数保存在 DOM 上
  dom.attach = dom.attach || {};
  dom.attach[eventName] = bindFunction;
  // 如果 document 上已经绑定了某个事件，就不需要再绑定了
  // 比如：document 上已经绑定了 onclick 事件，那么就不需要再绑定 onclick 事件了
  if (document[eventName]) return;
  // 事件绑定
  document[eventName] = dispatchEvent;
}
```

### dispatchEvent

`dispatchEvent` 函数是原生事件处理函数，我们将它提取成单独的函数，然后在 `addEvent` 中调用

```js
document["onclick"] = function (event) {
  console.log("原生事件处理函数");
};
```

这个函数需要完成三件事情：

1. 将 `setState` 设置为批量更新
2. 创建一个事件合成对象，`createSyntheticEvent`
3. 事件冒泡处理
4. 清空批量更新队列

#### 将 setState 设置为批量更新

在 `react` 事件处理函数中，批量 `setState` 是只会在最后一次 `setState` 时才会更新视图

所以我们需要在事件处理函数中，将 `updaterQueue.isBatch` 设置为 `true`

设置为 `true` 后，事件函数中的 `setState` 将会保存在 `updaterQueue.updaters` 中，

在事件函数执行完了之后，我们调用 `flushUpdaterQueue` 清空队列，这时候才会更新视图

#### 创建一个事件合成对象 createSyntheticEvent

`createSyntheticEvent` 函数返回的是一个 `syntheticEvent` 对象，这个对象中包含了所有的事件属性，所以我们需要将原生事件中的属性都拷贝到 `syntheticEvent` 中

```js
let nativeEventKeyValues = {};
// 这一步处理主要是为了将原生事件中的函数绑定 this
for (let key in nativeEvent) {
  nativeEventKeyValues[key] =
    typeof nativeEvent[key] === "function"
      ? nativeEvent[key].bind(nativeEvent)
      : nativeEvent[key];
}
```

然后将 `nativeEventKeyValues` 和 `nativeEvent` 合并，并抹平浏览器之间的差异

```js
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
```

#### 事件冒泡处理

合成事件处理完之后，就需要进行冒泡处理，也就说需要从事件触发的节点开始，一直到 `document`，依次执行事件处理函数

```js
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
```

这里你可能会对 `target` 和 `currentTarget` 有疑问，我简单的解释一下：

比如下面这段代码，父元素和子元素都有一个 `click` 事件，当点击子元素时，会触发子元素的 `click` 事件，然后冒泡到父元素，触发父元素的 `click` 事件

在冒泡的过程中，`target` 始终是触发事件的元素， `currentTarget` 始终是正在处理事件的元素

`syntheticEvent.currentTarget = target` 这段代码的作用是，更新 `syntheticEvent.currentTarget` 属性，使之始终指向正在处理该事件的元素

这样，事件处理函数就可以通过 `syntheticEvent.currentTarget` 得知当前正在处理事件的元素是哪一个，从而进行相应的处理

这种设计使得我们在处理事件时，可以明确知道事件的触发元素和当前处理事件的元素，提供了更大的灵活性

```js
class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "uccs",
    };
  }

  onClick = (e) => {
    console.log(
      {
        e,
        target: e.target, // div.childNode
        current: e.currentTarget, // div.childNode
      },
      "onClick"
    );
    this.setState({ name: "uccs2" });
  };

  onClickDiv = (e) => {
    console.log(
      {
        e,
        target: e.target, // div.childNode
        current: e.currentTarget, // div.parentNode
      },
      "onClickDiv"
    );
  };

  render() {
    return (
      <div className="parentNode" onClick={this.onClickDiv}>
        <div className="childNode" onClick={this.onClick}>
          {this.state.name}
        </div>
      </div>
    );
  }
}
```

文档：

- [currentTarget](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/currentTarget)
- [target](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/target)

## ref

`ref` 提供了一种访问 `DOM` 节点或者在 `render` 中创建的 `react` 元素的方式

`ref` 的使用分为三步：

1. 创建 `ref`：`this.myRef = React.createRef();`
2. 将 `ref` 传递给 `DOM`：`<div ref={this.myRef}>Simple React</div>`
3. 使用 `ref`：`console.log(this.myRef.current);`

`ref` 获取到的是 `DOM` 节点

```js
class MyClassComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: "0" };
    this.myRef = React.createRef();
  }
  updateShowText() {
    this.myRef.current.focus(); // 获取到的是 input 节点后，调用 focus 方法
  }
  updateCount = () => {
    this.setState({ count: "100" });
  };
  render() {
    return (
      <div>
        <div onClick={() => this.updateShowText("1000")}>
          Simple React Counter: {this.state.count}
        </div>
        <input type="text" ref={this.myRef} />
      </div>
    );
  }
}
```

`ref` 获取到的是 `MyClassComponent` 组件实例

```js
class MyClassComponent2 extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }
  onClick = () => {
    this.myRef.current.updateCount(); // 获取  MyClassComponent 组件实例后，调用 MyClassComponent 上的方法 updateCount
  };
  render() {
    return (
      <div>
        <div onClick={this.onClick}>修改 MyClassComponent state</div>
        <MyClassComponent ref={this.myRef} />
      </div>
    );
  }
}
```

`ref` 的实现还是比较简单的

首先我们提供一个 `createRef` 函数，用来创建 `ref`

```js
function createRef() {
  return { current: null };
}
```

我们可以在 `VNode` 上拿到 `ref`，还记得在上一篇 [createElement](https://github.com/astak16/simple-react/blob/574236a62241e5da57921ada2cd1b54fc6791547/docs/%E5%88%9D%E5%A7%8B%E6%B8%B2%E6%9F%93%2C%E5%AE%9E%E7%8E%B0createElement%E5%92%8Crender%E5%87%BD%E6%95%B0.md) 中，我们对 `ref` 进行了处理

对于 `DOM` 节点，在 `dom` 创建完成后，把 `DOM` 节点赋值给 `ref.current` 即可

```js
function createDOM(VNode) {
  let { ref } = VNode;
  let dom;
  // ... 处理 dom，函数组件，类组件等
  // 将 dom 赋值给 ref.current
  ref && (ref.current = dom);
  return dom;
}
```

对于类组件，在类组件实例化后，把类组件的实例赋值给 `ref.current` 即可

```js
function getDomByClassComponent(VNode) {
  let { ref } = VNode;
  let instance = new type(props);
  // 将类组件的实例赋值给 ref.current
  ref && (ref.current = instance);
}
```

### forwardRef

上面已经处理了类组件和 `DOM` 节点，那函数组件怎么处理呢？

首先函数组件没有实例，也就是说无法将函数组件实例赋值给 `ref.current`

那我们在想，`ref` 大多数时候都是用来获取 `DOM` 节点的

那我们将 `ref` 传递给函数组件中的 `DOM` 节点

那应该怎么实现这个呢？

```js
function MyFunctionComponent(props, ref) {
  return <div ref={ref}>my function component</div>;
}

<MyFunctionComponent ref={ref} />;
```

这样的实现违背了 `ref` 的设计理念

`ref` 这样写的话，我们期望的是获取到 `MyFunctionComponent` 组件实例，但是实际上获取到的 `MyFunctionComponent` 中的 `DOM` 节点

所以 `react` 提供了一个 `forwardRef` 函数，用来解决这个问题

```js
const MyFunctionComponent = React.forwardRef((props, ref) => {
  return <div ref={ref}>my function component</div>;
});
<MyFunctionComponent />;
console.log(MyFunctionComponent);
```

使用 `forwardRef`，`jsx` 转换成 `js` 代码后，

```js
{
  $$typeof: Symbol("react.forward_ref"),
  render: (props, ref) => {},
};
React.createElement(MyFunctionComponent);
```

我们知道 `createElement` 接收的第一个参数是 `type`，使用了 `forwardRef` 后，`type` 变成了一个对象

所以我们需要对 `react.forward_ref` 进行处理

首先定义一个 `forwardRef` 函数

这个函数返回一个对象，对象中有两个属性：

- `$$typeof` 属性，这个属性的值是 `Symbol("react.forward_ref")`
- `render` 属性，是一个函数组件

```js
function forwardRef(render) {
  return {
    $$typeof: REACT_FORWARD_REF,
    render,
  };
}
```

然后在 `createElement` 函数中，对 `forwardRef` 进行处理

```js
function createDOM(VNode) {
  // ...
  // 处理 forwardRef
  if (type && type.$$typeof === REACT_FORWARD_REF) {
    return getDomByForwardRefFunction(VNode);
  }
  // ...
}
```

处理 `ref` 的具体逻辑抽离成一个函数 `getDomByForwardRefFunction`

`getDomByForwardRefFunction` 函数处理逻辑和函数组件处理逻辑一样，只是在调用 `type` 时，需要将 `ref` 作为第二个参数传入

```js
function getDomByForwardRefFunction(VNode) {
  let { type, props, ref } = VNode;
  // 因为 type 是函数，所以直接执行
  let renderVNode = type.render(props, ref);
  // 有时候函数组件返回的是 null，这时候就不需要渲染了
  if (!renderVNode) return null;
  // 函数组件返回的是 VNode，所以需要递归处理
  return createDOM(renderVNode);
}
```

## 总结

1. `react` 中的组件分为函数组件和类组件
2. `setState` 在 `react` 合成事件中是批量更新，其他情况是立即更新
3. 合成事件
   - 事件对象的兼容性问题
   - 统一事件绑定，将事件绑定到 `document` 上，然后通过事件冒泡来触发事件
4. `ref`
   - 组件内获取 `DOM` 节点
   - 类组件获取到的是类组件的实例
   - 函数组件需要通过 `forwardRef` 拿到内部的 `DOM` 节点

## 源码

1. [处理函数组件](https://github.com/astak16/simple-react/blob/eca7eedd9648593df52f47d1aec963691cc1786f/src/react-dom.js#L26)
2. [处理类组件](https://github.com/astak16/simple-react/blob/eca7eedd9648593df52f47d1aec963691cc1786f/src/react-dom.js#L18)
3. [setState](https://github.com/astak16/simple-react/blob/eca7eedd9648593df52f47d1aec963691cc1786f/src/Component.js#L71)
4. [事件处理](https://github.com/astak16/simple-react/blob/9ab8a4711945a34ea43f915d1d8876d2383ed1ba/src/react-dom.js#L72)
5. [createRef](https://github.com/astak16/simple-react/blob/574236a62241e5da57921ada2cd1b54fc6791547/src/react.js#L31)
6. [forwardRef](https://github.com/astak16/simple-react/blob/574236a62241e5da57921ada2cd1b54fc6791547/src/react-dom.js#L19)
