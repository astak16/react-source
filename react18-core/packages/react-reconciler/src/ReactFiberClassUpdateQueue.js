import { markUpdateLaneFromFiberToRoot } from "./ReactFiberConcurrentUpdates";

export function initializeUpdateQueue(fiber) {
  const queue = {
    shared: {
      // pending 指向第一个待更新的 Fiber
      pending: null,
    },
  };
  // 初始化 fiber 的 updateQueue 属性
  fiber.updateQueue = queue;
}

export function createUpdate() {
  const update = {};
  return update;
}

// 初次渲染时 fiber 是 RootFiber
// 返回的是 FiberRoot
export function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  // 拿到 updateQueue 中的 pending
  // pending 和 update 的区别：pending 是从 updateQueue 中读取的，update 是最新传入的
  // 假如说 updateQueue 中多个 pending，那么 pending.next 指向下一个 pending，最后一个 pending.next 指向第一个 pending，形成一个链表
  // 假如说 updateQueue 只有一个 pending，那么 pending.next 指向自己
  // updateQueue.shared.pending 拿到的第一个 pending 是上一次放入的 update，这个 update.next 指向的是最早进入 updateQueue 的 update
  // 当有新的 update 进入时，将 update.next 指向最早的 update，然后将最早的 update.next 指向最新传入的 update
  const pending = updateQueue.shared.pending;
  if (pending === null) {
    // 如果 updateQueue 中不存在 pending，将 update.next 指向自己
    update.next = update;
  } else {
    // 如果 updateQueue 中存在 pending
    // pending 是上一次传入的 update，我们知道上一次传入的 update.next 指向最早的 update，所以 pending.next 指向最早的 update
    // 当有新的 update 进入时，将 update.next 指向最早的 update
    update.next = pending.next;
    // 将最早的 update.next 指向最新传入的 update
    pending.next = update;
  }
  // 将最新的 update 赋值给 updateQueue.shared.pending
  updateQueue.shared.pending = update;
  // 给当前 fiber 设置优先级，并返回 FiberRoot
  return markUpdateLaneFromFiberToRoot(fiber);
}
