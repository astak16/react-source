`react` 中有两个组件，`PureComponent` 和 `memo`，它们都是用来优化性能的，那么它们是如何实现的呢？

`PureComponent` 是用于类组件性能优化的，在 `props` 和 `state` 没有变化时，就不重新渲染类组件

`memo` 是函数组件的 `PureComponent`，用 `memo` 包裹的函数组件，在 `props` 没有变化时，函数组件时不会重新渲染的，

由于函数组件没有 `state`，所以 `memo` 只能用来优化 `props` 没有变化的情况

## PureComponent

`PureComponent` 是实现了 `shouldComponentUpdate` 的 `Component` 它是对 `state` 或 `props` 进行浅比较

什么是浅比较？

就是只比较第一层，如果第一层的值相同，就认为两个对象相同，不会再继续比较下去

那如何实现浅比较呢？

1. 首先判断两个对象是否相同，如果相同，直接返回 `true`
2. 如果两个对象中有一个不是对象，那么直接返回 `false`
   - 可以用上文中的 `getType` 函数来判断
3. 获取两个对象的所有 `key`，如果 `key` 的数量不相同，直接返回 `false`
4. 遍历其中一个对象，如果这个对象的 `key` 在另一个对象中不存在，或者这两个对象这个 `key` 的所对应的 `value` 不一样，返回 `false`
5. 直接返回 `true`

```js
function shallowCompare(obj1, obj2) {
  // 如果两个对象相同，直接返回 true
  if (obj1 === obj2) return true;
  // 如果两个对象中有一个不是对象，直接返回 false
  if (getType(obj1) !== "object" || getType(obj2) !== "object") return false;

  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);
  // 如果两个对象的 key 的数量不相同，直接返回 false
  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    // 如果 obj2 中不存在 obj1 的 key，或者 obj1 和 obj2 的 key 对应的值不相同，直接返回 false
    if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) return false;
  }
  // 直接返回 true
  return true;
}
```

`PureComponent` 的实现

```js
class PureComponent extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    return (
      !shallowCompare(this.props, nextProps) ||
      !shallowCompare(this.state, nextState)
    );
  }
}
```

## memo

`memo` 是用于函数组件，如果 `props` 没有变化，就不会渲染这个函数组件

使用 `memo` 包裹后的函数组件返回是个什么呢？

我们将它打印出来

```js
const MemoChild = memo(function MemoChild(props) {
  return <div>{props.name}</div>;
});
console.log(MemoChild);
```

打印出来我们看到这是一个 `$$typeof` 为 `Symbol("react.memo")` 的对象，这不是虚拟 `DOM`，它是 `memo` 对象，它的 `type` 是一个函数组件

```js
// 输出
{
  $$typeof: Symbol("react.memo"), // memo 兑现
  compare: null,
  type: () => {}, // 函数组件
}
```

虚拟 `DOM` 是一个 `JSX` 对象，它的 `$$typeof` 是 `Symbol("react.element")`

```js
console.log(<MemoChild />);
// 输出
{
  $$typeof: Symbol("react.element"),  // jsx
  key: null,
  props: {},
  ref: null,
  type: {
    $$typeof: Symbol("react.memo"), // memo 对象
    compare: null,
    type: () => {},   // 函数组件
  }
}
```

下面就来实现 `memo` 函数

首先在 `react.js` 中定义一个 `memo` 函数，返回一个 `memo` 对象，这个对象包括三个属性：

- `$$typeof`：用来标识这是一个 `memo` 对象
- `type`：函数组件
- `compare`：决定是否渲染函数组件，如果返回 `false` 就渲染，返回 `true` 就不渲染
  - 正好和 `shouldComponentUpdate` 函数相反

```js
function memo(type, compare) {
  return {
    $$typeof: REACT_MEMO,
    type,
    compare,
  };
}
```

我们在处理 `memo` 函数时，有两处需要处理：

- 初次渲染时，需要对 `memo` 包裹的组件特殊处理
- 之后在每次更新时，如果是个函数组件，需要进行特殊处理

我们先来看初次渲染时，`memo` 组件如何处理

### 初次渲染

初次渲染实在 `createDOM` 函数中处理

这里还是要强调一遍，`<MemoChild />` 这不是 `memo` 对象，这是 `jsx` 对象，它的 `type` 才是 `memo` 对象

```js
function createDOM(VNode) {
  let { type, props, $$typeof, ref } = VNode;
  let dom;
  // <MemoChild /> 这不是 memo 对象，这是 jsx 对象，这里会递归处理，第二次进来时，type 是 memo 对象
  if (type && type.$$typeof === REACT_MEMO) {
    return getDomByMemoFunctionComponent(VNode);
  }
  // ...
}
```

`getDomByMemoFunctionComponent` 函数比较简单，和处理函数组件 `getDomByFunctionComponent` 几乎一样，唯一不同的是，`type` 是 `memo` 对象，`type.type` 才是函数组件

```js
function getDomByMemoFunctionComponent(VNode) {
  let { type, props } = VNode;
  // 和函数不一样的是：type 是 memo 对象，type.type 才是函数组件
  let renderVNode = type.type(props);
  if (!renderVNode) return null;
  VNode.oldRenderVNode = renderVNode;
  return createDOM(renderVNode);
}
```

### 更新

相比初次渲染，更新时处理有点复杂

首先在 `deepDOMDiff` 函数中需要增加对 `memo` 类型的处理条件

```js
function deepDOMDiff(oldVNode, newVNode) {
  let diffTypeMap = {
    // ...
    // memo 节点，type 是一个 memo 对象，需要拿到 $$typeof 属性，
    MEMO: oldVNode.type.$$typeof === REACT_MEMO,
  };
  const DIFF_TYPE = Object.keys(diffTypeMap).filter(
    (key) => diffTypeMap[key]
  )[0];
  switch (DIFF_TYPE) {
    // ...
    case "MEMO":
      // 处理 memo 节点
      updateMemoFunctionComponent(oldVNode, newVNode);
      break;
    default:
      break;
  }
}
```

具体的处理逻辑在 `updateMemoFunctionComponent` 函数中

具体分为这几步：

1. 首先我们从 `oldVNode` 中拿到 `type`，这个 `type` 是 `memo` 对象
2. 重新渲染有两种情况：
   - 如果 `type.compare` 不存在，我们则使用 `shallowCompare` 函数进行浅比较，`shallowCompare` 返回 `false` 时，我们才进行重新渲染
     - `shallowCompare` 函数在 `PureComponent` 中实现了，它是对 `prevProps` 和 `nextProps` 进行浅比较
   - 如果 `type.compare` 且 `type.compare` 返回 `false`时，我们才进行重现渲染
3. 重新渲染时，和函数组件一样，唯一的区别还是：`type` 不是函数组件，`type.type` 才是函数组件

```js
function updateMemoFunctionComponent(oldVNode, newVNode) {
  let { type } = oldVNode;
  // 如果 type.compare 不存在，我们则使用 shallowCompare 函数进行浅比较，shallowCompare 返回 false 时，我们才进行重新渲染
  // 如果 type.compare 且 type.compare 返回 false 时，我们才进行重现渲染
  if (
    (!type.compare && !shallowCompare(oldVNode.props, newVNode.props)) ||
    (type.compare && !type.compare(oldVNode.props, newVNode.props))
  ) {
    const oldDOM = (newVNode.dom = findDOMByVNode(oldVNode));
    if (!oldDOM) return;
    const { type } = newVNode;
    // 和函数不一样的是：type 是 memo 对象，type.type 才是函数组件
    let renderVNode = type.type(newVNode.props);
    updateDomTree(oldVNode.oldRenderVNode, renderVNode, oldDOM);
    newVNode.oldRenderVNode = renderVNode;
  } else {
    // 不重新渲染
    newVNode.oldRenderVNode = oldVNode.oldRenderVNode;
  }
}
```

## 总结

1. `PureComponent` 和 `memo` 都是用来优化性能的，它们都是对 `props` 进行浅比较，如果 `props` 没有变化，就不会重新渲染
2. `PureComponent` 是类组件使用，可以比较 `state` 和 `props`，内部实现了 `shouldComponentUpdate` 生命周期函数，返回 `false` 不会重新渲染
3. `memo` 是函数组件使用，只能比较 `props`，内部通过浅比较 `props` 来决定是否重新渲染
   - 它也接收一个 `compare` 函数，如果 `compare` 函数返回 `true` 不会重新渲染

## 源码

1. [shallowCompare](https://github.com/astak16/simple-react/blob/5c24163a39cbe0af7d0829df8ee3bbd4b08bb71a/src/utils.js#L58)
2. [PureComponent](https://github.com/astak16/simple-react/blob/5d0aca6e68418e0d6cad4d6733f7e376bdf0bedd/src/react.js#L49)
3. `memo`:
   - [初次渲染](https://github.com/astak16/simple-react/blob/5c24163a39cbe0af7d0829df8ee3bbd4b08bb71a/src/react-dom.js#L30)
   - [更新](https://github.com/astak16/simple-react/blob/5c24163a39cbe0af7d0829df8ee3bbd4b08bb71a/src/react-dom.js#L263)
