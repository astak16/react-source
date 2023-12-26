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
      } else if (nextProp !== null) {
        // 处理其他属性
        setValueForProperty(domElement, propKey, nextProp);
      }
    }
  }
}

// lastProps 是 oldProps
// nextProps 是 newProps
// 最终更新的结构，保存在 updatePayload 中
// null 不是需要删除
// 样式属性直接置为 ""
// ["zhangsan", null, "xiaohong", "女", "style", { color: "" }];
export function diffProperties(domElement, type, lastProps, nextProps) {
  let updatePayload = null;
  let propKey;
  let styleName;
  let styleUpdates = null;

  /**
   *  const obj1 = { zhangsan: "男" };
   *  const obj2 = { xiaohong: "女" };
   *  <div {...(condition ? obj1 : obj2)}></div>;
   */
  // 先处理处理 lastProps 中需要删除的 propKey
  for (propKey in lastProps) {
    // nextProps 有 oldKey
    // lastProps 没有 oldKey
    // lastProps[oldKey] === null
    // 跳过这次遍历
    if (
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] === null
    )
      continue;
    if (propKey === "style") {
      const lastStyle = lastProps[propKey];
      for (styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {};
          }
          // 删除一个 styleName 就是让这个值变成空字符串
          styleUpdates[styleName] = "";
        }
      }
    } else {
      (updatePayload = updatePayload || []).push(propKey, null);
    }
  }

  // 处理 nextProps 中的属性，找到需要更新的属性
  for (propKey in nextProps) {
    const nextProp = nextProps[propKey];
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined;
    // nextProps 没有 oldKey
    // 新的属性值不等于旧的属性值
    if (
      !nextProps.hasOwnProperty(propKey) ||
      nextProp === lastProp ||
      (nextProp === null && lastProp === null)
    )
      continue;

    // 先处理 style 属性
    if (propKey === "style") {
      // 如果 lastProp 存在，lastProp 是 style 的对象
      if (lastProp) {
        // 先处理 lastProps 的 style
        for (styleName in lastProp) {
          // lastProp 中存在，但是 nextProp 中不存在，则将这个 styleName 置为 ""
          if (
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = "";
          }
        }
        // 再处理 nextProp 的 style
        for (styleName in nextProp) {
          // nextProp 中存在，但是 lastProp 中和 nextProp 中的值不一样，则将这个 styleName 置为 nextProp[styleName]
          if (
            nextProp.hasOwnProperty(styleName) &&
            lastProp[styleName] !== nextProp[styleName]
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = nextProp[styleName];
          }
        }
      } else {
        // 否则直接将 styleUpdates 设置为 nextProp 的 style 对象
        styleUpdates = nextProp;
      }
    } else if (propKey === "children") {
      // 再处理 children 属性
      if (typeof nextProp === "string" || typeof nextProp === "number") {
        (updatePayload = updatePayload || []).push(propKey, nextProp);
      }
    } else {
      // 最后处理其他属性
      (updatePayload = updatePayload || []).push(propKey, nextProp);
    }
  }

  // 如果 style 需要更新，就将 styleUpdates 也放到 updatePayload 中
  if (styleUpdates) {
    (updatePayload = updatePayload || []).push("style", styleUpdates);
  }
  return updatePayload;
}

export function updateProperties(domElement, updatePayload) {
  updateDomProperties(domElement, updatePayload);
}

function updateDomProperties(domElement, updatePayload) {
  console.log(updatePayload, "propperties updatePayload");
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i];
    const propValue = updatePayload[i + 1];
    if (propKey === "style") {
      setValueForStyles(domElement, propValue);
    } else if (propKey === "children") {
      console.log(propKey, propValue, "propKey, propValue");
      setTextContent(domElement, propValue);
    } else {
      setValueForProperty(domElement, propKey, propValue);
    }
  }
}
