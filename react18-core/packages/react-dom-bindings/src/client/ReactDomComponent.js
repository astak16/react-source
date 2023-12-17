import { setValueForStyles } from "./CSSPropertyOperations";
import { setValueForProperty } from "./DOMPropertyOperations";
import { setTextContent } from "./setTextContent";

export function setInitialProperties(domElement, tag, props) {
  setInitialDOMProperties(tag, domElement, props);
}

function setInitialDOMProperties(tag, domElement, nextProps) {
  // 遍历属性
  for (const propKey in nextProps) {
    // 只处理 props 上自身的属性
    if (nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey];
      // 处理 style
      if (propKey === "style") {
        setValueForStyles(domElement, nextProp);
      } else if (propKey === "children") {
        // 如果是 children 属性，且是文本节点，就设置文本内容
        /**
         * <div>
         *   text-1
         *   <div>text-2</div>
         * </div>
         */
        // 处理 "text-2" 这种文本节点
        if (typeof nextProp === "string" || typeof nextProp === "number") {
          setTextContent(domElement, `${nextProp}`);
        }
      } else {
        // 处理其他属性
        setValueForProperty(domElement, propKey, nextProp);
      }
    }
  }
}
