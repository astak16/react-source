## createElement

我们知道 `jsx` 是一段最终呈现出来的是一段普通的 `js` 代码

比如下面的 `jsx` 代码

```js
const element = <div>Hello, world!</div>;
```

实际对应的 `js` 代码是

```js
React.createElement("div", null, "hello world");
```

`jsx` 代码转换成 `js` 的这个过程由 `babel` 完成，转换完之后，会调用 `createElement` 函数，所以我们需要提供一个 `createElement` 函数

### 参数说明

`createElement` 接收三个参数 `type`，`props`，`children`：

- `type`：标签名称，比如 `div`，`span` 等
- `props`：标签的属性，比如 `className`，`style`，`id`，`children` 等
- `children`：标签的子元素，比如 `div` 的子元素可以是 `span` 等

返回五个参数 `$$typeof`，`type`，`ref`，`key`，`props`：

- `$$typeof`：标识这个对象是什么类型，比如 `Symbol(react.element)`，`Symbol(react.text)` 等
- `type`：标签名称，比如 `div`，`span` 等
- `ref`：`ref` 属性
- `key`：`key` 属性
- `props`：标签的属性，比如 `className`，`style`，`id`，`children` 等

在 `react` 中 `ref` 和 `key` 有额外的作用，所以我们需要将 `ref` 和 `key` 从 `props` 中提取出来，并从 `props` 中删除

### children 处理

我们在编写 `jsx` 时，可能会有多个 `children`：

```js
<div>
  study
  <div>react source</div>
</div>
```

根元素 `div` 下面有一个文本节点 `study` 和一个 `div` 元素

我们在根元素的 `div` 下拿到的 `children` 是 `2` 个，我们在第二个 `div` 下拿到的 `children` 是 `1` 个

所以就需要对这两种情况分别处理，也就是说如果是多个 `children` 的话，`props.children` 应该是一个数组，如果是一个 `children` 的话，`props.children` 就是一个 `children`

我们怎么处理这个逻辑呢？

我们可以通过 `arguments` 拿到函数所有的参数，由于 `arguments` 不是一个数组，需要使用 `Array.prototype.slice.call(arguments, 2)` 的方式将 `arguments` 转换成数组

```js
if (arguments.length > 3) {
  props.children = Array.prototype.slice.call(arguments, 2);
} else {
  props.children = children;
}
```

为什么这里通过 `arguments.length > 3` 来判断

这是一个 `children` 对应的 `arguments`

```js
// jsx
<div>source</div>
🔽
// arguments
{
  "0": "div",
  "1": {},
  "2": "react source"
}
```

这是多个 `children` 对应的 `arguments`

```js
// jsx
<div>
  study
  <div>react source</div>
</div>
🔽
// arguments
{
  "0": "div",
  "1": {},
  "2": "study",
  "3": {
    "type": "div",
    "ref": null,
    "key": null,
    "props": {
      "children": "react source"
    }
  }
}
```

如果 `argument.length > 3` 说明有多个 `children`，需要将这些 `children` 放在一个数组中，`argument.length <=3 ` 说明只有一个或者没有 `children`

### createElement 源码

最终 `createElement` 的源码如下：

```js
function createElement(type, properties, children) {
  // 将 ref 和 key 从 properties 中提取出来
  let ref = properties.ref || null;
  let key = properties.key || null;
  // 将 ref 和 key 从 properties 中删除
  // __self 和 __source 是 babel 转换后添加的属性，这里不讨论，直接删除
  ["key", "ref", "__self", "__source"].forEach(
    (prop) => delete properties[prop]
  );
  // 将剩余的 properties 放到 props 中
  let props = { ...properties };
  // 对 children 进行处理，如果有多个 children，放到一个数组中，如果只有一个或者没有 children，直接赋值给 props.children
  if (arguments.length > 3) {
    props.children = Array.prototype.slice.call(arguments, 2);
  } else {
    props.children = children;
  }
  // 返回一个虚拟 dom 对象，这个对象就是 createElement 的返回值
  return {
    $$typeof: REACT_ELEMENT,
    type,
    ref,
    key,
    props,
  };
}
```

用 `createElement` 将 `jsx` 转换成 `js` 效果如下

```js
// jsx
<div>
  study
  <div>react source</div>
</div>
🔽
// js
{
  $$typeof: Symbol(react.element),
  "type": "div",
  "ref": null,
  "key": null,
  "props": {
    "children": [
      "study",
      {
        $$typeof: Symbol(react.element),
        "type": "div",
        "ref": null,
        "key": null,
        "props": {
          "children": "react source"
        }
      }
    ]
  }
}
```

## render

我们在实现了 `createElement` 之后，我们需要将创建的 `VNode` 转换成真实的 `dom` 并挂载在页面上，这个过程会交个 `render` 函数去完成

### 功能说明

`render` 函数接收两个参数 `VNode` 和 `containerDOM`：

- `VNode`：虚拟 `dom`，也就是 `createElement` 函数返回的对象
- `containerDOM`：虚拟 `dom` 挂载的容器

`render` 函数需要完成的功能是：

- 将 `VNode` 转换成真实的 `dom`
- 将真实的 `dom` 挂载到容器上

将真实的 `dom` 挂载到容器上比较好实现 `containerDOM.appendChild(dom)`，所以 `render` 函数的核心功能是将 `VNode` 转换成真实的 `dom`

```js
function render(VNode, containerDOM) {
  // 将 VNode 转换成真实 dom
  // 将真实 dom 挂载到容器上
  // 这里可能还有其他逻辑需要处理，所以将上面两个功能抽离成一个函数 mount
  mount(VNode, containerDOM);
}

function mount(VNode, containerDOM) {
  // 通过 VNode 创建真实 dom
  let newDOM = createDOM(VNode);
  // 将真实 dom 挂载到容器上
  newDOM && containerDOM.appendChild(newDOM);
}

function createDOM(VNode) {
  // 将 VNode 转换成真实 dom
}
```

如何将 `VNode` 转换成真实 `dom` 呢？

### VNode 转换成真实 dom

`createDOM` 接收一个 `VNode` 作为参数，它将完成三个功能：

1. 创建元素
2. 处理子元素
3. 处理属性

> 函数组件和类组件这些暂时先不考虑，后面会单独讲解

#### 怎么创建元素呢

我们在生成虚拟 `dom` 时添加了一个 `$$typeof` 的属性，这个属性是用来表示当前的节点是什么类型

如何是个元素，虚拟 `dom` 的 `type` 就是一个元素名，比如 `div`

也就是说，`$$typeof === REACT_ELEMENT`，那么 `type` 就是 `div`，`span` 这种标签名

所以可以直接调用 `document.createElement(type)` 创建元素

创建完元素后，这个元素可能还有子元素，所以我们需要对子元素单独处理

#### 处理子元素

```js
// jsx
<div>
  study
  <div>react source</div>
</div>
🔽
// js
{
  $$typeof: Symbol(react.element),
  "type": "div",
  "ref": null,
  "key": null,
  "props": {
    "children": [
      "study",
      {
        $$typeof: Symbol(react.element),
        "type": "div",
        "ref": null,
        "key": null,
        "props": {
          "children": "react source"
        }
      }
    ]
  }
}
```

根据这段的虚拟 `dom`，我们知道有三种类型的 `children`：

- 只有一个 `children`，所以 `children` 是对象，最外层的对象
- 有多个 `children`，所以 `children` 是数组，第一个 `props.children`
- `children` 是文本，第二个 `props.children`

1. 先看只有一个 `children` 的情况

   只有一个 `children` 说明这个 `children` 就是对象，判断 `children` 是不是对象，有多种方式：

   - `typeof props.children === "object" && props.children.type`，这种方式是通过 `type` 属性来判断，因为只有对象才有 `type` 属性
   - `props.children.constructor === Object && props.children.type`，这种方式是通过 `constructor` 属性来判断，但是由 `class` 创建的对象为 `false`
   - `Object.prototype.toString.call(props.children) === "[object Object]" && props.children.type`，这种方式是通过 `Object.prototype.toString` 来判断，由 `class` 创建的对象为 `true`

   至于使用哪一种方式，可以根据自己的喜好，因为在遇到 `class` 组件和函数组件时还是需要单独处理，这里不能完全识别出来

   `children` 内部可能还有 `children`，所以需要通过递归的方式处理

   ```js
   if (typeof props.children === "object" && props.children.type) {
     mount(props.children, dom);
   }
   ```

2. 再看有多个 `children` 的情况

   有多个 `children` 说明 `children` 是个数组，判断 `children` 是不是数组比较简单，方式也有很多种：

   - `Array.isArray(props.children)`
   - `props.children.constructor === Array`
   - `Object.prototype.toString.call(props.children) === "[object Array]"`

   方式可以自行选择

   `children` 如果是数组的话，我们就需要对数组中的每一项都要处理，我们将这个处理过程提取为 `mountArray`

   数组中的每一项，只能是文本或者对象，不会是数组

   所以我们只需要判断数组中的每一项是不是对象，如果是对象，就调用 `mount` 函数，如果是文本，就创建文本节点，并将它添加到父元素上

   ```js
   function mountArray(children, parent) {
     // 如果不是数组，直接 return
     if (!Array.isArray(children)) return;
     // 遍历数组
     for (let i = 0; i < children.length; i++) {
       // 如果是文本，创建文本节点，并将它添加到父元素上
       if (typeof children[i] === "string") {
         parent.appendChild(document.createTextNode(children[i]));
       } else {
         // 如果是对象，调用 mount 函数，递归处理
         mount(children[i], parent);
       }
     }
   }
   ```

3. 最后再来看 `children` 是文本的情况，这种情况最简单，因为它已经是叶子节点了，不会在有子元素，

   所以直接创建文本节点 `const text document.createText(props.children)`，并将它添加到父元素上 `dom.appendChild(text)`，这个父元素就是上面通过 `let dom =document.createElement(type)` 创建的元素

#### 处理属性

还剩最后一步，`jsx` 的属性还没有处理，对于下面一段 `jsx` 转换成 `js`：

```js
// jsx
<div className="react" style={{ color: "red" }}>
  study
  <div style={{ color: "blue" }}>react source</div>
</div>
🔽
// js
{
  $$typeof: Symbol(react.element),
  "type": "div",
  "ref": null,
  "key": null,
  "props": {
    "children": [
      "study",
      {
        $$typeof: Symbol(react.element),
        "type": "div",
        "ref": null,
        "key": null,
        "props": {
          "children": "react source",
          "style": {
            "color": "blue",
          }
        }
      }
    ],
    "className": "react",
    "style": {
      "color": "red",
    }
  }
}
```

我们可以看到，`props` 中有一个 `style` 属性，这个 `style` 属性就是 `dom` 的样式

`VNode` 的属性有几种需要额外处理的：

- `children`：`children` 是 `dom` 的子元素，需要单独处理
- 事件：`on` 开头的属性，比如 `onClick`，`onMouseOver` 等
- `style`：样式属性，将 `VNodeProps.style` 中的属性赋值到 `dom.style` 中

不要这里要注意一点，`react` 中的 `className` 不用特殊处理，因为 `className` 是 `dom` 的属性，所以直接赋值给 `dom.className` 即可

```js
function setPropsForDOM(dom, VNodeProps = {}) {
  if (!dom) return;
  // 遍历虚拟 dom 的属性
  for (let key in VNodeProps) {
    // children 不处理
    if (key === "children") continue;
    // 事件单独处理，这里暂时先不处理
    if (/^on[A-Z].*/.test(key)) continue;
    // 处理 style 属性
    if (key === "style") {
      Object.keys(VNodeProps[key]).forEach((styleName) => {
        dom.style[styleName] = VNodeProps[key][styleName];
      });
    } else {
      // 其他属性直接挂到 dom 上，比如 className，id 等
      // 这里不需要判断是不是 dom 的属性，因为不是 dom 的属性，也会挂到 dom 上
      // className 不需要特殊处理，因为 className 本身就是 dom 的属性
      dom[key] = VNodeProps[key];
    }
  }
}
```

## 总结

1. `jsx` 是语法糖，最终会转换成 `js` 代码，由 `babel` 完成，转换后会变成 `React.createElement("div", null, "hello world")`
2. `createElement` 返回虚拟 `dom`，也就是 `VNode`，交个 `render` 函数去处理
3. `render` 函数负责将虚拟 `dom` 转换成真实 `dom`，并将真实的 `dom` 挂载到容器上
4. 将虚拟 `dom` 转换成真实 `dom` 有三个步骤
   - 创建元素
   - 处理子元素
   - 处理属性

## 源码

1. [createElement 源码](https://github.com/astak16/simple-react/blob/9d17d522f60983cccdcc59992ecf37761499949f/src/react.js#L3)
2. [render 源码](https://github.com/astak16/simple-react/blob/9d17d522f60983cccdcc59992ecf37761499949f/src/react-dom.js#L3)
