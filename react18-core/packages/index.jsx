import { createRoot } from "react-dom/client";
let element = (
  <div className="first">
    <div className="first-1">first-1</div>
    <div className="first-2">
      text-1
      <div className="second-21">second-21</div>
      <div className="second-22">
        <div className="third-221">third-221</div>
        text-2
        <div className="third-222">third-222</div>
      </div>
      <div className="second-23">second-23</div>
    </div>
    <div className="first-3">
      text-3
      <div className="second-31">second-31</div>
      <div className="second-32">second-32</div>
    </div>
  </div>
);
const root = createRoot(document.getElementById("root"));
root.render(element);
console.log("index.jsx", element);
