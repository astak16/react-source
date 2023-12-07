import {
  createContainer,
  updateContainer,
} from "react-reconciler/src/ReactFiberReconciler";

function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot;
}

/*
  const root = createRoot(document.getElementById("root"));
  这个 render 方法是在 ReactDOMRoot 的原型上定义的
  root.render(<App />);
*/
ReactDOMRoot.prototype.render = function (children) {
  const root = this._internalRoot;
  // children 就是 <App />，root 是 FiberRoot
  updateContainer(children, root);
};

export function createRoot(container) {
  // 调用 createContainer 创建一个容器
  // 返回一个包装过的的节点
  // container 是页面的真是节点：document.getElementById("root")
  // root 是 FiberRoot
  const root = createContainer(container);
  return new ReactDOMRoot(root);
}
