const randomKey = Math.random().toString(36).slice(2);
// 通过真实 DOM 节点找到 Fiber，也就是 workInProgress
const internalInstanceKey = `__reactFiber$${randomKey}`;
// 通过真实 DOM 节点找到 props
const internalPropsKey = `__reactProps$${randomKey}`;

// targetNode 是原生事件源
export function getClosesInstanceFromNode(targetNode) {
  const targetInst = targetNode[internalInstanceKey];
  return targetInst;
}

// 将真实 DOM 节点和 workInProgress 关联起来
// hostInst 是 Fiber，也就是 workInProgress
// node 是真实的 DOM 节点
export function preCacheFiberNode(hostInst, node) {
  node[internalInstanceKey] = hostInst;
}

// 将最新的 props 挂载到真实 DOM 节点上
// node 是真实 DOM 节点
// props 是最新的 props
export function updateFiberProps(node, props) {
  node[internalPropsKey] = props;
}

// 拿到真实 DOM 节点上的 props
export function getFiberCurrentPropsFromNode(node) {
  return node[internalPropsKey] || null;
}
