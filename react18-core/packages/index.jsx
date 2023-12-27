import { createRoot } from "react-dom/client";
import { useReducer, useState } from "react";

let MyComponent1 = () => {
  return <div>MyComponent-1</div>;
};

let MyComponent2 = () => {
  return <div>MyComponent-2</div>;
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

// let element = (
//   <div className="first">
//     <div className="first-1">first-1</div>
//     <MyComponent1 />
//     <MyComponent2 />
//     <div className="first-2">first2</div>
//   </div>
// );

function ElementComponent() {
  // const [number, setAge] = useReducer(getAge, 1); // ===> useReducer1
  // const [number1, setAge2] = useReducer(getAge, 11); // ===> useReducer2
  const [number, setNumber] = useState(1);
  const onClick = () => {
    setNumber((number) => number + 1);
    setNumber((number) => number + 1);
    // setNumber(number + 1);
    // setNumber(number + 1);
    // setAge({ type: "add", value: 2 });
    // setAge({ type: "add", value: 3 });
    // setAge2({ type: "minus", value: 12 });
  };
  const obj1 = { zhangsan: "男", style: { color: "red" } };
  const obj2 = { xiaohong: "女" };
  console.log(number);
  return (
    <div
      className="first"
      // {...(number === 1 ? obj1 : obj2)}
      // style={{ color: "red" }}
    >
      <div onClick={onClick}>{number}</div>
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
          <MyComponent1 />
          <MyComponent2 />
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
}

const root = createRoot(document.getElementById("root"));
root.render(<ElementComponent />);
