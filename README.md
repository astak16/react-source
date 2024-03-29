最近在学习慕课网 [手写 React 高质量源码迈向高阶开发](https://coding.imooc.com/class/650.html)，之前自己也尝试看过源码，不过最终放弃了

放弃的最主要原因是 `react` 内部的调用链太长了，每天在缕清调用链上都花了不少时间，`createRoot` 都没有看完

最近看到慕课网有一个 `react` 源码课，就想着跟着课程然后在自己源码，看看这次能够看到什么地步

它这个课程前八章 是 `react@16` 的源码，从第九章开始才是 `react@18` 的源码

下面是学习笔记：

- `react@16`
  1. [初始渲染，实现 createElement 和 render 函数](./docs/初始渲染,实现createElement和render函数.md)
  2. [函数组件和类组件及 ref 和 setState 的实现](./docs/函数组件和类组件及ref和setState的实现.md)
  3. [优化渲染过程之 DomDiff](./docs/优化渲染过程之DomDiff.md)
  4. [类组件增强——生命周期函数 ](./docs/类组件增强——生命周期函数.md)
  5. [性能优化—— PureComponent 和 memo](./docs/性能优化——PureComponent和memo.md)
  6. [hooks——useEffect、useState、useMemo 等源码实现](./docs/hooks——useEffect、useState、useMemo等源码实现.md)
- `react@18`
  1. [beginWork 前的准备工作：jsxDEV、createRoot、render 源码实现](./docs/beginWork前的准备工作：jsxDEV、createRoot、render源码实现.md)
  2. [beginWork 工作原理](./docs/beginWork工作原理.md)
  3. [4 张图带你看懂 beginWork 和 completeWork 工作过程](./docs/4张图带你看懂beginWork和completeWork工作过程.md)
  4. [一张图看懂 React 合成事件原理](./docs/一张图看懂React合成事件原理.md)
  5. [commitWork 工作原理](./docs/commitWork工作原理.md)
  6. [Fiber 架构的 DOM Diff 原理](./docs/Fiber架构的DOM-Diff原理.md)
  7. [图解 useState 原理](./docs/图解useState原理.md)
  8. [useEffect 和 useLayoutEffect 源码实现](./docs/useEffect和useLayoutEffect源码实现.md)
