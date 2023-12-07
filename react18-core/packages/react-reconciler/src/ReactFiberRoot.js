import { createHostRootFiber } from "./ReactFiber";
import { initializeUpdateQueue } from "./ReactFiberClassUpdateQueue";

function FiberRootNode(containerInfo) {
  // containerInfo 是页面的根节点，也是真实节点
  this.containerInfo = containerInfo;
}

export function createFiberRoot(containerInfo) {
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
