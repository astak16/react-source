import { HostRoot } from "./ReactWorkTags";

/**
 *  const [age1, setAge1] = useReducer(() => {}, 0) ===> useReducer1
 *  const [age2, setAge2] = useReducer(() => {}, 10) ==> useReducer2
 *
 *  onClick = () => {
 *    setAge({ type: "add", value: 1 })
 *    setAge({ type: "add", value: 2 })
 *    setAge2({ type: "add", value: 11 })
 *  }
 */

/**
 * concurrentQueue = [
 *   fiber,
 *   { pending: null },     --> 是 useReducer1 的 queue
 *   { action: { type: "add", value: 1 }, next: null },
 *   fiber,
 *   { action: { type: "add", value: 2 }, next: null },
 *   { pending: null },     --> 是 useReducer1 的 queue
 *   fiber,
 *   { action: { type: "add", value: 11 }, next: null },
 *   { pending: null },     --> 是 useReducer2 的 queue
 * ];
 */

const concurrentQueue = [];
let concurrentQueuesIndex = 0;

function enqueueUpdate(fiber, queue, update) {
  concurrentQueue[concurrentQueuesIndex++] = fiber;
  concurrentQueue[concurrentQueuesIndex++] = queue;
  concurrentQueue[concurrentQueuesIndex++] = update;
}

// fiber 是当前正在处理的 fiber
// queue 初始时是 { pending: null }
// update 封装了 action
// 运行结束后 [fiber, queue, update, fiber, queue, update, fiber, queue, update]
export function enqueueConcurrentHookUpdate(fiber, queue, update) {
  enqueueUpdate(fiber, queue, update);
  return getRootForUpdateFiber(fiber);
}

// sourceFiber 是当前正在处理的 fiber，也就是 workInProgress
function getRootForUpdateFiber(sourceFiber) {
  let node = sourceFiber;
  let parent = sourceFiber.return;
  while (parent !== null) {
    node = parent;
    parent = parent.return;
  }
  return node.tag === HostRoot ? node.stateNode : null;
}

// 连续调用多次 setXXX，这个函数会多次运行，但是循环只有一次
export function finishQueueingConcurrentUpdates() {
  const endIndex = concurrentQueuesIndex;
  concurrentQueuesIndex = 0;
  let i = 0;
  while (i < endIndex) {
    const fiber = concurrentQueue[i++];
    const queue = concurrentQueue[i++];
    const update = concurrentQueue[i++];
    if (queue !== null && update !== null) {
      const pending = queue.pending;
      if (pending === null) {
        update.next = update;
      } else {
        update.next = pending.next;
        pending.next = update;
      }
      queue.pending = update;
    }
  }
}

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
