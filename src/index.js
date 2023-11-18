import React from "./react";
import ReactDOM from "./react-dom";

const element = (
  <div className="react" style={{ color: "red" }}>
    study
    <div style={{ color: "blue" }}>react source</div>
  </div>
);
console.log(element);
ReactDOM.render(element, document.getElementById("root"));
