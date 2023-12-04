import React, { useRef } from "./react";
import ReactDOM from "./react-dom";

const Form = function () {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current.focus();
  }

  return (
    <div>
      <input ref={inputRef} />
      <button onClick={handleClick}>Focus the input</button>
    </div>
  );
};

ReactDOM.render(<Form />, document.getElementById("root"));
