import { createRoot } from "react-dom/client";
import { useReducer, useState, useEffect } from "react";

let MyComponent1 = () => {
  return <div className="my-component-1">MyComponent-1</div>;
};

let MyComponent2 = () => {
  return <div className="my-component-2">MyComponent-2</div>;
};

let MyComponent3 = () => {
  return (
    <div className="my-component-3">
      text-4
      <div className="third-311">third-311</div>
      <MyComponent4 className="MyComponent4" />
    </div>
  );
};

let MyComponent4 = () => {
  return <div className="my-component-4">MyComponent-4</div>;
};

function getAge(state, action) {
  switch (action.type) {
    case "add":
      return state + action.value;
    case "minus":
      return state + action.value;
    default:
      return state;
  }
}

let element = (
  <div className="first">
    <div className="first-1">first-1</div>
    <MyComponent1 />
    <MyComponent2 />
    <div className="first-2">first2</div>
  </div>
);

function ElementComponent() {
  // const [number, setAge] = useReducer(getAge, 1); // ===> useReducer1
  const [number1, setAge2] = useReducer(getAge, 11); // ===> useReducer2
  const [number, setNumber] = useState(1);
  const onClick = () => {
    setNumber((number) => number + 1);
    // setNumber((number) => number + 1);
    // setNumber(number + 1);
    // setNumber(number + 1);
    // setAge({ type: "add", value: 2 });
    // setAge({ type: "add", value: 3 });
    // setAge2({ type: "minus", value: 12 });
  };

  useEffect(() => {
    console.log("create effect");
    return () => {
      console.log("destroy effect");
    };
  });

  const obj1 = { zhangsan: "男", style: { color: "red" } };
  const obj2 = { xiaohong: "女" };
  console.log(number);
  return (
    <div
      className="first"
      // {...(number === 1 ? obj1 : obj2)}
      // style={{ color: "red" }}
    >
      {/* <div onClick={onClick}>{number}</div> */}
      <div className="first-1" style={{ color: "red" }}>
        first-1
      </div>
      <div className="first-2">
        text-1
        <div className="second-21">second-21</div>
        <div className="second-22">
          <div className="third-221">third-221</div>
          text-2
          <div className="third-222">third-222</div>
          <MyComponent1 className="MyComponent1" />
          <MyComponent2 className="MyComponent2" />
        </div>
        <div className="second-23">second-23</div>
      </div>
      <div className="first-3">
        text-3
        <div className="second-31">
          <MyComponent3 className="MyComponent3" />
          <div className="third-312">third-312</div>
          text-5
        </div>
        <div className="second-32">second-32</div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<ElementComponent className="ElementComponent" />);
// root.render(element);
