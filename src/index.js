import React from "./react";
import ReactDOM from "./react-dom";

const element = (
  <div className="react" style={{ color: "red" }}>
    study
    <div style={{ color: "blue" }}>react source</div>
  </div>
);

const App = () => {
  return element;
};

class MyApp extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return <div>{this.props.name}</div>;
  }
}
// console.log(App);
ReactDOM.render(<MyApp name="uccs" />, document.getElementById("root"));
