import { HostRoot } from "./ReactWorkTags";

export function markUpdateLaneFromFiberToRoot(sourceFiber) {
  let fiber = sourceFiber;
  // 拿到 parent
  let parent = sourceFiber.return;
  // 循环遍历 parent，如果 parent 存在，就将 parent 赋值给 node，然后将 parent 的父节点赋值给 parent，继续遍历
  if (parent !== null) {
    fiber = parent;
    parent = parent.return;
  }
  // 遍历结束后，如果 fiber.tag 是页面的根节点，那么就返回 fiber.stateNode，也就是 FiberRoot
  if (fiber.tag === HostRoot) {
    return fiber.stateNode;
  }
  return null;
}
