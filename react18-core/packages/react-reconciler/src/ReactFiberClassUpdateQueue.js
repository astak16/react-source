import assign from "shared/assign";
import { markUpdateLaneFromFiberToRoot } from "./ReactFiberConcurrentUpdates";

export const UpdateState = 0;

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
  const update = { tag: UpdateState };
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

export function processUpdateQueue(workInProgress) {
  // workInProgress.updateQueue 是来自 current.updateQueue
  const queue = workInProgress.updateQueue;
  // 从 updateQueue 中取出 pending
  // 取出的 pending 是 lastPendingUpdate
  const pendingQueue = queue.shared.pending;
  if (pendingQueue !== null) {
    // 取出后，将 updateQueue 清空
    queue.shared.pending = null;
    // lastPendingUpdate 是最后进入队列的 update
    // 链表结构：updateD -> updateA -> updateB -> updateC -> updateD
    const lastPendingUpdate = pendingQueue;
    // firstPendingUpdate 是最先进入队列的 update
    const firstPendingUpdate = lastPendingUpdate.next;
    // 断开 lastPendingUpdate 和 firstPendingUpdate 的联系，是为了在循环遍历 update 时不会死循环
    lastPendingUpdate.next = null;
    let newState = workInProgress.memoizedState;
    // 从 firstPendingUpdate 开始遍历，一直遍历到 lastPendingUpdate
    // 将每个 update 的 payload 合并到 newState 中
    // update 结构是 { payload: { element } }
    // 最后 newState 中有 lastPendingUpdate 中的 element
    let update = firstPendingUpdate;
    while (update) {
      newState = getStateFromUpdate(update, newState);
      update = update.next;
    }

    // 最后将 newState 赋值给 memoizedState
    // workInProgress.memoizedState 是处理后的 state
    workInProgress.memoizedState = newState;
  }
}
function getStateFromUpdate(update, prevState) {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update;
      // 合并prevState和payload为新状态
      return assign({}, prevState, payload);
  }
}
