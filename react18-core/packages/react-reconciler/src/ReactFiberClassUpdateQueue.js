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
