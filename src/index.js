import React, { useRef, useImperativeHandle } from "./react";
import ReactDOM from "./react-dom";

const MyInput = React.forwardRef(function MyInput(props, ref) {
  const inputRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        inputRef.current.focus();
      },
    }),
    []
  );

  return <input {...props} ref={inputRef} />;
});

function Form() {
  const ref = useRef(null);

  function handleClick() {
    ref.current.focus();
    ref.current.value = "Hello, world!";
  }

  return (
    <form>
      <MyInput label="Enter your name:" ref={ref} />
      <button type="button" onClick={handleClick}>
        Edit
      </button>
    </form>
  );
}
ReactDOM.render(<Form />, document.getElementById("root"));
