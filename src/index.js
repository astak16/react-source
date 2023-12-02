import React, { useReducer, useState } from "./react";
import reactDom from "./react-dom";

function reducer(state, action) {
  if (action.type === "incremented_age") {
    return {
      age: state.age + 1,
    };
  }
  throw Error("Unknown action.");
}

function Counter() {
  const [count, setCount] = useState(0);
  const [state, dispatch] = useReducer(reducer, { age: 42 });

  return (
    <div>
      <button
        onClick={() => {
          dispatch({ type: "incremented_age" });
        }}>
        Increment age
      </button>
      <p>Hello! You are {state.age}.</p>
    </div>
  );
}
reactDom.render(<Counter />, document.getElementById("root"));
