import React from "./react";
import ReactDOM from "./react-dom";

class MyClassComponent extends React.Component {
  isReset = false;
  oldArr = ["A", "B", "C", "D", "E"];
  newArr = ["C", "B", "E", "F", "A"];
  constructor(props) {
    super(props);
    this.state = { arr: this.oldArr };
  }
  updateShowArr() {
    this.setState({
      arr: this.isReset ? this.oldArr : this.newArr,
    });
    this.isReset = !this.isReset;
  }
  render() {
    return (
      <div>
        <div
          className="test-class"
          style={{
            color: "red",
            cursor: "pointer",
            border: "1px solid gray",
            borderRadius: "6px",
            display: "inline-block",
            padding: "6px 12px",
          }}
          onClick={() => this.updateShowArr()}>
          Change The Text
        </div>
        <div>
          {this.state.arr.map((item) => {
            return <div key={item}>{item}</div>;
          })}
        </div>
      </div>
    );
  }
}
ReactDOM.render(<MyClassComponent />, document.getElementById("root"));
