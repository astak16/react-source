export const FunctionComponent = 0;
export const ClassComponent = 1;
export const IndeterminateComponent = 2;
export const HostRoot = 3; // 表示宿主环境的根节点，对应的是 FiberRoot，比如 document.getElementById('root')
export const HostComponent = 5; // div/span
export const HostText = 6; // 文本节点
