import { createRoot } from "react-dom/client";
let element = (
  <div>
    <div>uccs</div>
    <div>react 源码学习</div>
  </div>
);
const root = createRoot(document.getElementById("root"));
root.render(element);
console.log("index.jsx", element);
