import { findDOMByVNode, updateDomTree } from "./react-dom";

// 批量更新队列
export let updaterQueue = {
  // 是否是批量更新
  isBatch: false,
  // 更新队列
  updaters: new Set(),
};
export function flushUpdaterQueue() {
  // 将 isBatch 设置为 false
  updaterQueue.isBatch = false;
  // 执行队列中的每一个 updater 的 launchUpdate 方法
  // 在立即更新部分我们介绍了 launchUpdate 方法的作用，是用来合并 state
  for (let updater of updaterQueue.updaters) {
    updater.launchUpdate();
  }
  // 清空队列
  updaterQueue.updaters.clear();
}
class Updater {
  constructor(ClassComponentInstance) {
    this.ClassComponentInstance = ClassComponentInstance;
    // 保存多次调用 setState 传递的参数
    this.pendingStates = [];
  }
  addState(partialState) {
    // 将 partialState 保存到 pendingStates 中
    this.pendingStates.push(partialState);
    // 更新预处理
    this.preHandleForUpdate();
  }
  preHandleForUpdate() {
    // 批量更新
    if (updaterQueue.isBatch) {
      // 将当前 updater 实例添加到更新队列中
      updaterQueue.updaters.add(this);
    } else {
      // 立即更新
      this.launchUpdate();
    }
  }
  launchUpdate(nextProps) {
    const { ClassComponentInstance, pendingStates } = this;
    // 如果没有需要更新的 state，并且也米有需要更新的 props，直接返回
    if (pendingStates.length === 0 && !nextProps) return;
    // 用来控制是否需要调用 update 方法
    let isShouldUpdate = true;
    // 拿到 preState 和 preProps
    const preState = ClassComponentInstance.state;
    const preProps = ClassComponentInstance.props;
    // state 合并，只合并第一层
    let nextState = pendingStates.reduce((state, partialState) => {
      return { ...state, ...partialState };
    }, ClassComponentInstance.state);

    // 清空 pendingStates
    pendingStates.length = 0;
    // 调用 shouldComponentUpdate 生命周期函数，如果返回 true，将 isShouldUpdate 设置为 false
    if (
      ClassComponentInstance.shouldComponentUpdate &&
      !ClassComponentInstance.shouldComponentUpdate(nextProps, nextState)
    ) {
      isShouldUpdate = false;
    }
    // 将 state 和 props 更新为最新的
    ClassComponentInstance.state = nextState;
    if (nextProps) ClassComponentInstance.props = nextProps;
    // 如果 isShouldUpdate 为 false，则不用调用 update
    if (isShouldUpdate) {
      // 更新视图，将 preProps 和 preState 传递给 update 函数
      ClassComponentInstance.update(preProps, preState);
    }
  }
}

export class Component {
  // 类组件标识
  static IS_CLASS_COMPONENT = true;
  constructor(props) {
    // 保存 props
    this.props = props;
    // 保存 state
    this.state = {};
    // 将 Component 和 Updater 进行关联
    this.updater = new Updater(this);
    this.oldVNode = null;
  }
  setState(partialState) {
    // 调用 updater 的 addState 方法
    this.updater.addState(partialState);
  }
  update(preProps, preState) {
    // 拿到 oldVNode
    let oldVNode = this.oldVNode;
    // 将 oldVNode 转换成真实 DOM
    let oldDOM = findDOMByVNode(oldVNode);
    // 调用 render 方法，得到新的 VNode
    let newVNode = this.render();
    // 更新 DOM，并将新的 DOM 挂载到页面上
    updateDomTree(oldVNode, newVNode, oldDOM);
    // 将新的 VNode 挂载到 Component 上
    this.oldVNode = newVNode;
    // 如果存在生命周期函数 componentDidUpdate 函数，调用，并传入 preProps 和 preState
    if (this.componentDidUpdate) this.componentDidUpdate(preProps, preState);
  }
}
