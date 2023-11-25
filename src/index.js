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
    this.state = {
      name: "uccs",
    };
  }

  onClick = (e) => {
    console.log({ e, target: e.target, current: e.currentTarget }, "onClick");
    this.setState({ name: "uccs2" });
  };

  onClickDiv = (e) => {
    console.log(
      { e, target: e.target, current: e.currentTarget },
      "onClickDiv"
    );
  };

  render() {
    return (
      <div className="parentNode" onClick={this.onClickDiv}>
        astak
        <div className="childNode" onClick={this.onClick}>
          {this.state.name}
        </div>
      </div>
    );
  }
}
// console.log(App);
ReactDOM.render(<MyApp />, document.getElementById("root"));
