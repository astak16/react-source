import { HostRoot } from "react-reconciler/src/ReactWorkTags";
import { NoFlags } from "./ReactFiberFlags";

export function FiberNode(tag, pendingProps, key) {
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

export function createFiber(tag, pendingProps, key) {
  // 创建 fiber 节点
  return new FiberNode(tag, pendingProps, key);
}

export function createHostRootFiber() {
  // 创建一个 RootFiber
  return createFiber(HostRoot, null, null);
}
