import React from "./react";
import ReactDOM from "./react-dom";
class Text extends React.Component {
  constructor(props) {
    super(props);
  }
  shouldComponentUpdate(nextProps, nextState) {
    console.log(nextProps);
    return true;
  }
  render() {
    return <h2>It is {this.props.date.toLocaleTimeString()}.</h2>;
  }
}

class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date() };
  }

  // https://reactjs.org/docs/react-component.html#componentdidmount
  // 1. 它是在组件挂载到页面上后调用
  // 2. 可以操作 DOM，也就是说可以使用 document.getElementById(xxx)
  // 3. 可以进行网络请求
  // 4. 可以做事件订阅，但需要在 componentWillUnmount 中取消订阅
  // 5. 不适合在这里调用 setState，会触发一次更新，state 初始值最好在 constructor 中赋值
  componentDidMount() {
    console.log("componentDidMount", document.getElementById("h1"));
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  // https://reactjs.org/docs/react-component.html#componentdidupdate
  // 1. 更新完成后调用，初始化渲染不会调用
  // 2. 当组件完成更新，需要对 DOM 进行某种操作的时候，适合在这个函数中进行
  // 3. 当 props 有所变化时，可以进行一些操作，比如网络请求
  // 4. 这里虽然可以调用 setState，但这是有条件的调用，否则会陷入死循环
  // 5. 如果 shouldComponentUpdate 返回 false，componentDidUpdate 不会执行
  // 6. 如果实现了 getSnapshotBeforeUpdate，componentDidUpdate 会接收第三个参数
  // 7. 如果将 props 中的内容拷贝到 state，可以考虑直接使用 props，而不是在这里进行拷贝
  // https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
  componentDidUpdate(prevProps, prevState, snapshot) {
    // console.log(
    //   "componentDidUpdated",
    //   prevProps,
    //   this.state,
    //   prevState,
    //   snapshot
    // );
  }

  // https://reactjs.org/docs/react-component.html#componentwillunmount
  // 1. 组件从 DOM 树上卸载完成的时候调用该函数
  // 2. 执行一些清理操作，比如清除定时器，取消事件订阅，取消网络请求等
  // 3. 不要在这里调用 setState，不会产生任何效果，卸载后不会重新渲染
  componentWillUnmount() {
    console.log("componentWillUnmount");
    clearInterval(this.timerID);
  }

  // https://reactjs.org/docs/react-component.html#shouldcomponentupdate
  // 1.界面展示不受到 props 和 state 的变化的影响的时候使用
  // 2.默认行为是返回 true，也就是需要更新
  // 3.该函数在 render 函数执行之前调用
  // 4.初始化渲染，或者执行 forceUpdate 的时候，不会调用该函数
  // 5.仅仅作为性能优化的手段，建议不手动编写，而是使用 PureComponent
  // 6.返回 false，render 和 componentDidUpdate 都不会执行
  shouldComponentUpdate(nextProps, nextState) {
    // console.log("shouldComponentUpdate", nextState, this.state);
    return true;
  }

  tick() {
    this.setState({ date: new Date() });
  }

  render() {
    return (
      <div>
        <h1 id="h1">Hello, world!</h1>
        <Text date={this.state.date} />
        {/* <h2>It is {this.state.date.toLocaleTimeString()}.</h2> */}
      </div>
    );
  }
}

ReactDOM.render(<Clock />, document.getElementById("root"));
