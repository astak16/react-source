import { createFiberRoot } from "./ReactFiberRoot";

export function createContainer(containerInfo) {
  // 调用 createFiberRoot 创建一个 FiberRoot 节点
  return createFiberRoot(containerInfo);
}

export function updateContainer(element, container) {
  console.log("updateContainer", element, container);
}
