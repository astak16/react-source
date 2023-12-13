export function shouldSetTextContent(type, props) {
  return (
    // 节点是 string 或者 number 类型，就认为是文本节点
    typeof props.children === "string" || typeof props.children === "number"
  );
}
