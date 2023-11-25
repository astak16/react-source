import React from "./react";
import ReactDOM from "./react-dom";

class MyClassComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: "0" };
    this.domRef = React.createRef();
    this.functionRef = React.createRef();
  }
  onClickClassComponent() {
    this.domRef.current.focus();
  }
  onClickFunctionComponent() {
    this.functionRef.current.focus();
  }
  updateCount = () => {
    this.setState({ count: "100" });
  };
  render() {
    return (
      <div>
        My Class Component state: {this.state.count}
        <div onClick={() => this.onClickClassComponent()}>
          聚焦到 ClassComponent
        </div>
        <div onClick={() => this.onClickFunctionComponent()}>
          聚焦到 FunctionComponent
        </div>
        <MyFunctionComponent ref={this.functionRef} />
        <input type="text" ref={this.domRef} placeholder="ClassComponent" />
      </div>
    );
  }
}

class MyClassComponent2 extends React.Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }
  onClick = () => {
    this.myRef.current.updateCount();
  };
  render() {
    return (
      <div>
        <div onClick={this.onClick}>修改 MyClassComponent state</div>
        <MyClassComponent ref={this.myRef} />
      </div>
    );
  }
}

const MyFunctionComponent = React.forwardRef((props, ref) => {
  return <input ref={ref} placeholder="FunctionComponent" />;
});
console.log(MyFunctionComponent);

ReactDOM.render(<MyClassComponent2 />, document.getElementById("root"));
