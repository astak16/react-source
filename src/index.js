// https://beta.reactjs.org/reference/react/useState#usestate

import React, { useState } from "./react";
import reactDom from "./react-dom";

export default function Counter() {
  const [count, setCount] = useState(3);
  const [count2, setCount2] = useState(2);
  function handleClick() {
    setCount(count + 1);
  }

  return <button onClick={handleClick}>You pressed me {count} times</button>;
}

reactDom.render(<Counter />, document.getElementById("root"));
