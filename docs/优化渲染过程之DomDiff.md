我们在 `setState` 时，会触发试图的更新

之前的实现是将整个 `dom` 树替换掉，这里的 `oldDOM` 是函数组件或者类组件 `render` 出来的 `dom` 树，这里是整体替换

```js
// 这里的 oldDOM 是函数组件或者类组件 render 出来的 dom 树
function updateDomTree(oldDOM, newVNode) {
  let parentNode = oldDOM.parentNode;
  parentNode.removeChild(oldDOM);
  let newDOM = createDOM(newVNode);
  parentNode.appendChild(newDOM);
}
```

这样做，性能是比较差的，因为我们只是改变了一小部分，但是却要替换整个 `dom` 树

这里我们要做的是实现 `diff` 算法，只更新改变的部分

我们知道 `react` 在渲染时分为三个步骤

1. 生成虚拟 `DOM`
2. 将虚拟 `DOM` 转换为真实 `DOM`
3. 将真实 `DOM` 挂载到页面上

不管是初始化渲染，还是更新渲染，都会经过这三个步骤

初始化渲染时，是 `0 - 1` 的过程，所有节点都要渲染，这里没有什么可以优化的地方

但是在更新时，更新的部分只是一小块，没有必要重新渲染整个 `dom` 树，所以这里就有优化空间了

所以就有了 `diff` 算法，`diff` 算法的目的就是找出两个对象的差异

## diff 算法

`diff` 在没有 `key` 的情况下比较，如下结构：

```js
// 变化前
<div className="a">a</div>
<spn className="b">b</spn>
<p className="c">c</p>
<img className="d"/>

// 变化后
<img className="d"/>
<div className="b" style={{color: "red"}}>b</div>
<div className="a">a</div>
```

变化前的 `div.a` 不知道和变化后的哪个 `div` 进行比较，只能按照顺序进行比较，也就是说 `div.a` 和 `img.d` 进行比较

发现 `div.a` 和 `img.d` 不一样，那就删除 `div.a`，并创建 `img.d` 的标签，这是比较低效的

因为 `div.a` 和 `img.d` 在原有的虚拟 `DOM` 上是存在的，而现在需要重新创建

变化前的 `div.b` 和变化后的 `div.b` 进行比较，发现变化后的 `div.b` 多了一个 `style` 属性，直接更新属性就行了

基于这种情况，我们可以得出结论：按照顺序比较，如果不一样，就删除原来的，创建新的

这种比较方式相比我们直接替换整个 `dom` 树，性能是有提升的，但是 `react` 并没有满足于此

它引入了 `key`，通过 `key` 来找到变化前后的节点，这样就不需要按照顺序比较了，拿到变化前的 `key` 找到变化后的 `key`，这两个直接进行比较

## 代码优化

在开始 `diff` 算法之前，先把之前写的代码优化一下

之前我们在处理文本时，直接使用 `document.createTextNode`，后面处理文本节点的地方有点多，需要将它统一一下，方便后续处理

首先我们创建一个 `toVNode` 函数，用来处理文本节点

```js
const toVNode = (node) => {
  // 如何 node 是 string 或者 number，就认为是文本节点
  // 返回一个对象，对象中有 type 和 props 属性
  // 否则返回 node
  return typeof node === "string" || typeof node === "number"
    ? { type: REACT_TEXT, props: { text: node } }
    : node;
};
```

在 `createDOM` 中，我们增加一个文本节点的判断

```js
if (type === REACT_TEXT) {
  dom = document.createTextNode(props.text);
}
```

在 `createElement` 中，对 `children` 处理时，先进行判断一下，如果是文本节点，返回一个文本节点对象

```js
if (arguments.length > 3) {
  // 将 children 中的每一项都使用 toVNode 方法进行处理
  props.children = Array.prototype.slice.call(arguments, 2).map(toVNode);
} else {
  // 对 children 使用 toVNode 方法进行处理
  props.children = toVNode(children);
}
```

之前在 `mountArray` 中和 `createDOM` 中处理文本节点的地方都可以将它删除

在 `mountArray` 中需要为 `children` 增加一个 `index` 属性，方便后面进行 `diff` 比较

```js
function mountArray(children, parent) {
  // ...
  for (let i = 0; i < children.length; i++) {
    // 为每一个子元素添加 index 属性
    children[i].index = i;
    // ...
  }
}
```

## updateTree

`diff` 算法从 `updateTree` 开始

我们如何知道现在是要删除、新增、还是修改呢？

我们可以通过 `oldVNode` 和 `newVNode` 的来进行判断

但是之前 `updateTree` 只接收两个参数：`oldDOM` 和 `newVNode`

所以现在要改成三个参数：`oldVNode`、`newVNode`、`oldDOM`

更新有这五种情况：

- 新节点，旧节点都不存在
- 新节点存在，旧节点不存在
- 新节点不存在，旧节点存在
- 新节点存在，旧节点也存在，但是类型不一样
- 新节点存在，旧节点也存在，类型一样 --> 我们需要进行深入的比较

基于这五种情况，可以使用一个对象来表示，最后一种情况可以认为是默认情况

```js
const typeMap = {
  // 不需要进行任何操作
  NO_OPERATE: !oldVNode && !newVNode,
  // 新增节点
  ADD: !oldVNode && newVNode,
  // 删除节点
  DELETE: oldVNode && !newVNode,
  // 替换节点
  REPLACE: oldVNode && newVNode && oldVNode.type !== newVNode.type,
};
```

如何知道当前是哪种情况呢？

使用 `filter` 方法，过滤出是 `true` 的结果，然后取第一个

```js
const UPDATE_TYPE = Object.keys(typeMap).filter((key) => typeMap[key])[0];
```

使用 `switch` 语法根据不同的情况进行不同的操作：

- `NO_OPERATE`：不需要进行任何操作
  - 因为 `oldVNode` 和 `newVNode` 都不存在
- `DELETE`：删除节点
  - 因为 `oldVNode` 存在，`newVNode` 不存在，删除节点交给 `removeVNode` 函数处理
- `ADD`：新增节点
  - 因为 `oldVNode` 不存在，`newVNode` 存在
  - 直接调用 `createDOM` 创建新节点，并添加到父节点中
- `REPLACE`：替换节点
  - 因为 `oldVNode` 和 `newVNode` 都存在，但是类型不一样
  - 先删除旧节点，再创建新节点，添加到父节点中
    - 删除节点，直接调用 `removeVNode` 函数
- 默认情况：新旧节点都一样，且类型也相同
  - 这种情况下，我们需要对它内部的属性，子元素进行比较，是 `DOM Diff` 的核心，我们将它放到 `deepDOMDiff` 函数讲解

```js
switch (UPDATE_TYPE) {
  case "NO_OPERATE":
    break;
  case "DELETE":
    removeVNode(oldVNode);
    break;
  case "ADD":
    oldDOM.parentNode.appendChild(createDOM(newVNode));
    break;
  case "REPLACE":
    removeVNode(oldVNode);
    oldDOM.parentNode.appendChild(createDOM(newVNode));
    break;
  default:
    // 深度的 dom diff，新老虚拟 DOM 都存在且类型相同
    deepDOMDiff(oldVNode, newVNode);
    break;
}
```

`removeVNode` 函数比较简单，直接调用 `findDOMByVNode` 找到 `dom` 节点，然后删除即可

```js
function removeVNode(VNode) {
  // 找到 dom 节点
  const currentDOM = findDOMByVNode(VNode);
  // 删除 dom 节点
  if (currentDOM) currentDOM.remove();
}
```

### deepDOMDiff

`deepDOMDiff` 函数是 `DOM Diff` 的核心

它是在新老节点都一样的情况下，对其内部的属性、子元素进行比较

所以它有这 `4` 种情况：

- 原生节点，比如 `div`、`span`、`p`、`img` 等
- 函数组件
- 类组件
- 文本节点

```js
let diffTypeMap = {
  // 原生节点，type 是一个字符串
  ORIGIN_NODE: typeof oldVNode.type === "string",
  // 类组件，type 是一个函数，但是有 IS_CLASS_COMPONENT 属性
  CLASS_COMPONENT:
    typeof oldVNode === "function" && oldVNode.type.IS_CLASS_COMPONENT,
  // 函数组件，type 是一个函数
  FUNCTION_COMPONENT: typeof oldVNode === "function",
  // 文本节点，type 是一个字符串，值是 REACT_TEXT
  TEXT: oldVNode.type === REACT_TEXT,
};
```

然后通过 `filter` 方法过滤出是 `true` 的结果，取第一个

因为上面的 `4` 种情况是互斥的，所以只会有一个结果

```js
const DIFF_TYPE = Object.keys(diffTypeMap).filter((key) => diffTypeMap[key])[0];
```

通过 `switch` 判断不同的情况，然后进行不同的操作：

- `ORIGIN_NODE`：原生节点
- `CLASS_COMPONENT`：类组件
- `FUNCTION_COMPONENT`：函数组件
- `TEXT`：文本节点

### 文本节点

文件节点更新比较简单

首先通过 `findDOMByVNode` 找到 `oldVNode` 所对应的 `oldDOM`，然后将 `oldDOM` 赋值给 `newVNode` 的 `dom` 属性

然后直接更新 `newVNode.dom.textContent`，新的文本在 `newVNode.props.text`

```js
// 找到 oldDOM 节点
// 赋值给 newVNode.dom
newVNode.dom = findDOMByVNode(oldVNode);
// 更新文本节点的值
newVNode.dom.textContent = newVNode.props.text;
```

### 函数组件

首先需要对 `getDomByFunctionComponent` 做一些小改动

需要在 `VNode` 上挂载一个属性：`oldRenderVNode` 旧的渲染树

```js
function getDomByFunctionComponent(VNode) {
  let renderVNode = type(props);
  // 将 renderVNode 挂载到 VNode.oldRenderVNode 上
  VNode.oldRenderVNode = renderVNode;
  // ...
}
```

然后通过`findDOMByVNode`找到`oldVNode`所对应的`oldDOM`，然后将 `oldDOM`赋值给`newVNode`的`dom` 属性

这一步和文本节点一样

然后调用新的 `VNode` 获取到新的渲染树，再次调用 `updateDomTree` 更新 `DOM`（递归）

最后将新的 `DOM` 赋值给 `newVNode.oldRenderVNode`

```js
function updateFunctionComponent(oldVNode, newVNode) {
  // 找到 oldDOM 节点
  // 赋值给 newVNode.dom
  let oldDOM = (newVNode.dom = findDOMByVNode(oldVNode));
  if (!oldDOM) return;
  // 从 newVNode 中获取 type、props
  const { type, props } = newVNode;
  // 调用 type 函数，传入 props 获取新的 DOM 结构
  let newRenderVNode = type(props);
  // 递归调用 updateDomTree，更新整个 DOM 树
  updateDomTree(oldVNode.oldRenderVNode, newRenderVNode, oldDOM);
  // 将 newRenderVNode 赋值给 newVNode.oldRenderVNode
  newVNode.oldRenderVNode = newRenderVNode;
}
```

### 类组件

类组件也是，需要对 `getDomByClassComponent` 做一些小改动

需要在 `VNode` 上挂载一个属性：`classInstance` 类组件实例

```js
function getDomByClassComponent(VNode) {
  let instance = new type(props);
  // 将 instance 挂载到 VNode.classInstance 上
  VNode.classInstance = instance;
  // ...
}
```

类组件更新比较简单，我们获取到旧的组件实例后，将这个实例赋值给 `newVNode.classInstance`

然后调用实例上的 `launchUpdate` 方法，忘记的可以查看这篇文章：[React 源码：函数组件和类组件及 ref 和 setState 的实现#立即更新预处理](./函数组件和类组件及ref和setState的实现.md)

`launchUpdate` 内部会进行 `state` 合并，并更新视图

```js
function updateClassComponent(oldVNode, newVNode) {
  // 对于当前界面，旧的实例是与页面上已渲染的组件是相对应的，在生命周期函数中，会尝试比较 newProps 和 oldProps
  const classInstance = (newVNode.classInstance = oldVNode.classInstance);
  classInstance.updater.launchUpdate();
}
```

不过这里为什么要舍去 `newVNode` 上的实例，转而使用 `oldVNode` 上的实例呢？

因为这是为之后的生命周期函数做考虑，

对于当前界面，旧的实例是与页面上已渲染的组件是相对应的，在生命周期函数中，会尝试比较 `newProps` 和 `oldProps`

这个在之后的生命周期函数章节中会提到，这里先暂时不表

### 原生节点

原生节点的更新也是 `DOM Diff` 的核心，也是最复杂的

其主要核心是 `updateChildren` 函数，这个函数我们会在下面讲解

首先我们需要找到 `oldVNode` 所对应的 `oldDOM`，然后将 `oldDOM` 赋值给 `newVNode` 的 `dom` 属性

然后调用 `setPropsForDOM` 更新 `DOM` 属性

最后调用 `updateChildren` 更新子元素，传入三个参数

- `currentDOM`：`DOM`，`oldVNode` 对应的真实 `DOM`
- `oldVNode.props.children`：旧的虚拟 `DOM` 的子节点
- `newVNode.props.children`：新的虚拟 `DOM` 的子节点

```js
let currentDOM = (newVNode.dom = findDOMByVNode(oldVNode));
setPropsForDOM(currentDOM, newVNode.props);
updateChildren(currentDOM, oldVNode.props.children, newVNode.props.children);
```

### 最终代码

```js
switch (DIFF_TYPE) {
  case "ORIGIN_NODE":
    let currentDOM = (newVNode.dom = findDOMByVNode(oldVNode));
    setPropsForDOM(currentDOM, newVNode.props);
    updateChildren(
      currentDOM,
      oldVNode.props.children,
      newVNode.props.children
    );
    break;
  case "CLASS_COMPONENT":
    updateClassComponent(oldVNode, newVNode);
    break;
  case "FUNCTION_COMPONENT":
    updateFunctionComponent(oldVNode, newVNode);
    break;
  case "TEXT":
    // 找到 oldDOM 节点
    // 赋值给 newVNode.dom
    newVNode.dom = findDOMByVNode(oldVNode);
    // 更新文本节点的值
    newVNode.dom.textContent = newVNode.props.text;
    break;
  default:
    break;
}
```

## updateChildren

`updateChildren` 函数是 `DOM Diff` 的核心，也是最复杂的

为什么它是最复杂的呢？

无论是函数组件还是类组件，最终都会渲染成原生节点

`updateChildren` 函数接受三个参数：

- `currentDOM`：`DOM`，`oldVNode` 对应的真实 `DOM`
- `oldVNode.props.children`：旧的虚拟 `DOM` 的子节点
- `newVNode.props.children`：新的虚拟 `DOM` 的子节点

首先处理 `children`，将 `oldVNodeChildren` 和 `newVNodeChildren` 的 `children` 都处理成数组，并过滤掉空的 `children`

```js
// 将 oldVNodeChildren 的 chidlren 处理成数组
oldVNodeChildren = (
  Array.isArray(oldVNodeChildren) ? oldVNodeChildren : [oldVNodeChildren]
).filter(Boolean);
// 将 newVNodeChildren 的 chidlren 处理成数组
newVNodeChildren = (
  Array.isArray(newVNodeChildren) ? newVNodeChildren : [newVNodeChildren]
).filter(Boolean);
```

然后将 `oldVNodeChildren` 中的每一项 `children` 和 `oldVNode` 做一个映射：

- 如果 `oldVNode` 有 `key`，就使用 `key`
- 如果 `oldVNode` 没有 `key`，就使用 `index`

```js
// 保存 oldVNodeChildren 中 key 和 children 的映射关系
let oldKeyChildMap = {};
oldVNodeChildren.forEach((oldVNode, index) => {
  // 如果没有 key，就使用 index
  let oldKey = oldVNode && oldVNode.key ? oldVNode.key : index;
  // 保存 key 和 children 的映射关系
  oldKeyChildMap[oldKey] = oldVNode;
});
```

在这些工作准备好之后，我们应该怎么处理 `newVNodeChildren` 呢？

通过遍历新的 `newVNodeChildren` 数组，完成以下四件事：

- 可以复用但需要移动的节点
- 需要重新创建的节点
- 需要删除的节点
- 可以复用且不用移动的节点

#### 将需要移动，创建，删除的节点找出来

我们声明一个 `actions` 数组用来保存遍历 `newVNodeChildren` 每项时 `children` 的状态，在这里 `children` 只有 `MOVE` 和 `CREATE` 两种状态

比如将 `ABCDE` 变为 `CBEFA`

```js
// oldVNodeChildren
<ul>
  <li key="A">A</li>
  <li key="B">B</li>
  <li key="C">C</li>
  <li key="E">D</li>
  <li key="D">E</li>
</ul>
🔽
// newVNodeChildren
CBEFA;
<ul>
  <li key="C">C</li>
  <li key="B">B</li>
  <li key="E">E</li>
  <li key="F">F</li>
  <li key="A">A</li>
</ul>
```

我们要知道的一点是，这里的遍历是遍历 `newVNodeChildren`，拿到 `newVNode`，然后跟 `oldVNodeChildren` 中的 `oldVNode` 进行比较

我们开始遍历 `newVNodeChildren`：

1. 第一次遍历时：
   - 拿到的 `newVNode` 是 `C`，同时 `lastNotChangedIndex` 为 `-1`，所以 `C.key`是 `C`
   - `newVNode C` 存在于 `oldKeyChildMap` 所以可以拿到 `oldVNode`
   - `oldVNode.index` 也就是 `C.index` 为 `2`
   - `oldVNode.index < lastNotChangedIndex` 也就是 `C.index < -1` => `2 < -1` 不成立
   - 所以 `C` 节点不需要动，`lastNotChangedIndex` 取 `C.index` 和 `lastNotChangedIndex` 的最大值，结果为 `2`
   - 将 `C` 节点从 `oldKeyChildMap` 中删除
2. 第二次遍历时：
   - 拿到的 `newVNode` 是 `B`，同时 `lastNotChangedIndex` 为 `2`，所以 `B.key` 是 `B`
   - `newVNode B` 存在于 `oldKeyChildMap` 所以可以拿到 `oldVNode`
   - `oldVNode.index` 就是 `B.index` 为 `1`
   - `oldVNode.index < lastNotChangedIndex` 也就是 `B.index < 2` => `1 < 2` 成立
   - 所以 `B` 节点需要移动，`lastNotChangedIndex` 取 `B.index` 和 `lastNotChangedIndex` 的最大值，结果不变，还是为 `2`
   - `action` 为 `{type: MOVE, oldVNode: B, newVNode: B, index: 1}`
   - 将 `B` 节点从 `oldKeyChildMap` 中删除
3. 第三次遍历时：
   - 拿到的 `newVNode` 是 `E`，同时 `lastNotChangedIndex` 为 `2`，所以 `E.key` 是 `E`
   - `newVNode E` 存在于 `oldKeyChildMap` 所以可以拿到 `oldVNode`
   - `oldVNode.index` 就是 `E.index` 为 `4`
   - `oldVNode.index < lastNotChangedIndex` 也就是 `E.index < 2` => `4 < 2` 不成立
   - 所以 `E` 节点不需要动，`lastNotChangedIndex` 取 `E.index` 和 `lastNotChangedIndex` 的最大值，结果为 `4`
   - 将 `E` 节点从 `oldKeyChildMap` 中删除
4. 第四次遍历时：
   - 拿到的 `newVNode` 是 `F`，同时 `lastNotChangedIndex` 为 `4`，`F.key` 是 `F`
   - `newVNode F` 不存在 `oldKeyChildMap`，所以拿不到 `oldVNode`
   - `action` 为 `{type: CREATE, newVNode: F, index: 3}`
   - 所以 `F` 节点需要创建，`lastNotChangedIndex` 不变
5. 第五次遍历时：
   - 拿到的 `newVNode` 是 `A`，同时 `lastNotChangedIndex` 为 `4`，所以 `A.key` 是 `A`
   - `newVNode A` 存在于 `oldKeyChildMap`，所以可以拿到 `oldVNode`
   - `oldVNode.index` 就是 `A.index` 为 `0`
   - `oldVNode.index < lastNotChangedIndex` 也就是 `A.index < 4` => `0 < 4` 成立
   - 所以 `A` 节点需要移动，`lastNotChangedIndex` 取 `A.index` 和 `lastNotChangedIndex` 的最大值，结果不变，还是 `4`
   - `action` 为 `{type: MOVE, oldVNode: A, newVNode: A, index: 4}`
   - 将 `A` 节点从 `oldKeyChildMap` 中删除
6. 遍历结束，退出循环

这段处理的源码如下：

```js
// lastNotChangedIndex 用来保存上一次没有变化的节点的索引，初始值为 -1
let lastNotChangedIndex = -1;
let actions = [];
newVNodeChildren.forEach((newVNode, index) => {
  // 将 newVNode.index 设置为 index
  newVNode.index = index;
  // 如果 newVNode.key 存在就用 key，否则用 index
  // 这个 key 是 <div key={xxx}></div> 中的 key
  let newKey = newVNode.key ? newVNode.key : index;
  // 通过 key 从 oldKeyChildMap 中找到有没有 oldVNode
  let oldVNode = oldKeyChildMap[newKey];
  if (oldVNode) {
    // 如果有，调用 deepDOMDiff 进行深度比较，里面可能还有子元素，属性需要比较
    deepDOMDiff(oldVNode, newVNode);
    // 如果 oldVNode.index < lastNotChangedIndex，说明这个节点需要移动
    if (oldVNode.index < lastNotChangedIndex) {
      actions.push({ type: MOVE, oldVNode, newVNode, index });
    }
    // 操作过的节点，从 oldKeyChildMap 中删除，oldKeyChildMap 中剩下的就是需要删除的节点
    delete oldKeyChildMap[newKey];
    // 更新 lastNotChangedIndex
    lastNotChangedIndex = Math.max(lastNotChangedIndex, oldVNode.index);
  } else {
    // 如果没有，说明这个这个节点需要创建
    actions.push({ type: CREATE, newVNode, index });
  }
});
```

在遍历结束后，`actions` 数组中就有了 `MOVE` 和 `CREATE` 两种状态，如下所示：

```js
{type: MOVE, oldVNode: B, newVNode: B, index: 1}
{type: CREATE, newVNode: F, index: 3}
{type: MOVE, oldVNode: A, newVNode: A, index: 4}
```

`oldKeyChildMap` 中剩下的是需要被删除的节点，如下所示：

```js
{
  D: VNode;
}
```

#### 将需要删除的节点从页面中删除

现在 `oldKeyChildMap` 中剩下的节点是需要从页面中删除的，`actions` 中标记为 `MOVE` 节点也需要从页面中删除

所以先从 `actions` 中找出需要移动的节点

```js
let VNodeToMove = actions
  // 过滤出 type 为 MOVE 的节点
  .filter((action) => action.type === MOVE)
  // 将节点对应的 oldVNode 取出来
  .map((action) => action.oldVNode);
```

将 `oldKeyChildMap` 中剩下的节点和 `VNodeToMove` 节点合并，然后遍历这个合并后的数组，将这些节点从页面中删除

```js
let VNodeToDelete = Object.values(oldKeyChildMap);
// 将 oldKeyChildMap 中剩下的节点和 VNodeToMove 节点合并
VNodeToMove.concat(VNodeToDelete).forEach((oldVNode) => {
  // 找到 oldVNode 对应的 dom 节点
  let currentDOM = findDOMByVNode(oldVNode);
  // 从页面中删除 dom 节点
  currentDOM.remove();
});
```

#### 处理需要创建的节点和需要移动的节点

`actions` 中的节点最终是要渲染到页面中的，但是它有两种状态：

- `CREATE`：对于 `CREATE` 的状态，我们调用 `createDOM` 创建新的 `DOM`，然后将这个 `DOM` 插入到页面中
- `MOVE`：对于 `MOVE` 的状态，我们调用 `findDOMByVNode` 找到 `oldVNode` 对应的 `DOM`，然后将这个 `DOM` 移动到 `index` 位置

具体的更新过程如下：

1. 我们拿到 `parentDOM` 中所有的 `childNodes`（这里的 `parentDOM` 是更新的 `root` 节点，也就是 `return` 中的 `root` 节点）
   - 此时页面中还剩 `C` 和 `E` 两个元素
2. 从 `action` 中拿到 `index`
   - 第一个 `action` 是 `B`，`B` 的 `index` 是 `1`
     - `childNodes` 索引为 `1` 的 `childNode` 是 `E`
     - 所以 `B` 是需要移动到 `E` 的前面
   - 第二个 `action` 是 `F`，`F` 的 `index` 是 `3`
     - `childNodes` 没有索引为 `3` 的 `childNode`
     - 所以直接插入到 `parentDOM` 的最后
   - 第三个 `action` 是 `A`，`A` 的 `index` 是 `4`
     - `childNodes` 没有索引为 `4` 的 `childNode`
     - 所以直接插入到 `parentDOM` 的最后

> 插入到某个 childNode 之前是使用 API insertBefore，插入到最后是使用 API appendChild

```js
actions.forEach((action) => {
  let { type, oldVNode, newVNode, index } = action;
  // 拿到需要更新的节点的 childNodes
  let childNodes = parentDOM.childNodes;
  // 通过 index 找到 childNodes 中的 childNode
  let childNode = childNodes[index];
  // 根据不同的 type，创建不同的 dom
  const getDomForInsert = () => {
    // 如果 type 是 CREATE，就创建新的 dom
    if (type === CREATE) {
      return createDOM(newVNode);
    }
    // 如果 type 是 MOVE，就找到 oldVNode 对应的 dom
    if (type === MOVE) {
      return findDOMByVNode(oldVNode);
    }
  };
  // 如果 childNode 存在，就插入到 childNode 之前
  if (childNode) {
    // 插入到某个 childNode 之前是使用 insertBefore
    parentDOM.insertBefore(getDomForInsert(), childNode);
  } else {
    // 如果 childNode 不存在，就插入到最后
    parentDOM.appendChild(getDomForInsert());
  }
});
```

## 总结

`diff` 算法是 `react` 的核心，通过比较新旧 `DOM` 树，找出差异，然后更新差异部分

更新分为五种情况：

- 不需要操作：新节点，旧节点都不存在
- 新增：新节点存在，旧节点不存在
- 删除：新节点不存在，旧节点存在
- 替换：新节点存在，旧节点也存在，但是类型不一样
- 更深入比较：新节点存在，旧节点也存在，类型一样 --> 我们需要进行深入的比较

`DOM` 树处理，主要是这四种，最终落脚点是原生节点：

- 原生节点
- 类组件
- 函数组件
- 文本节点

对于原生节点的处理，是 `DOM Diff` 的核心，也是最复杂的，通过 `key` 找到需要移动，创建，删除的节点，然后进行处理

## 源码

[updateDomTree](https://github.com/astak16/simple-react/blob/main/src/Component.js#L83)
