import {
  HostComponent,
  HostRoot,
  HostText,
  IndeterminateComponent,
} from "react-reconciler/src/ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";

export function FiberNode(tag, pendingProps, key) {
  this.tag = tag;
  this.key = key ?? null;
  this.type = null;
  // 目前可以理解为真实 dom 节点
  this.stateNode = null;
  this.child = null;

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
  // 保存需要删除的节点
  this.deletions = null;
}

export function createFiber(tag, pendingProps, key) {
  // 创建 fiber 节点
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber() {
  // 创建一个 RootFiber
  return createFiber(HostRoot, null, null);
}

// current 是 RootFiber
// pendingProps 是还未更新的属性，比如 children，style 等，初次渲染时是 null
// 返回
//    初次渲染时，current.alternate 是 null，所以 workInProgress 是一个新的 fiber 树，它的 alternate 是 current，也就是 RootFiber
export function createWorkInProgress(current, pendingProps) {
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
    current.alternate = workInProgress;
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

export function createFiberFromElement(element) {
  const { type, props: pendingProps, key } = element;
  return createFiberFromTypeAndProps(type, key, pendingProps);
}

function createFiberFromTypeAndProps(type, key, pendingProps) {
  // 初始设为未知类型
  let tag = IndeterminateComponent;
  // 如果 type 是 string 类型，就将 tag 设置为 HostComponent
  if (typeof type === "string") {
    tag = HostComponent;
  }
  // 创建 fiber
  const fiber = createFiber(tag, pendingProps, key);
  // 将 type 赋值给 fiber.type
  fiber.type = type;
  return fiber;
}

export function createFiberFromText(content) {
  return createFiber(HostText, content, null);
}
