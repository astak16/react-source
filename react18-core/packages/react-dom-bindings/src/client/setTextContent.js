// 这个函数只是修改 DOM 节点的 textContent 属性
// 也就是说给 <div></div> 这种节点设置文本内容
export function setTextContent(node, text) {
  node.textContent = text;
}
