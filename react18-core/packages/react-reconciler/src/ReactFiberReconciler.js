import { createFiberRoot } from "./ReactFiberRoot";
import { createUpdate, enqueueUpdate } from "./ReactFiberClassUpdateQueue";
import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

export function createContainer(containerInfo) {
  // 调用 createFiberRoot 创建一个 FiberRoot 节点
  return createFiberRoot(containerInfo);
}

export function updateContainer(element, container) {
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
