import { createRoot } from "react-dom/client";
let element = (
  <div className="first">
    <div className="first-A">uccs</div>
    <div className="first-B">react 源码学习</div>
    <div className="second">
      <div className="second-A">手写</div>
      <div className="second-B">react 源码</div>
    </div>
  </div>
);
const root = createRoot(document.getElementById("root"));
root.render(element);
console.log("index.jsx", element);
