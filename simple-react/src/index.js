import React, { useState, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";

function Child({ data, handleClick }) {
  // console.log("render Child");
  return <button onClick={handleClick}>Button Number: {data.number}</button>;
}

function App() {
  // console.log("render App");
  const [name, setName] = useState("yangyitao");
  const [number, setNumber] = useState(0);
  let data = useMemo(() => {
    console.log("useMemo");
    return { number };
  }, [number]);
  let handleClick = useCallback(() => {
    console.log("useCallback");
    setNumber(number + 1);
  }, [number]);

  return (
    <div>
      <input
        type="text"
        value={name}
        onInput={(event) => setName(event.target.value)}
      />
      <Child data={data} handleClick={handleClick} />
    </div>
  );
}
ReactDOM.render(<App />, document.getElementById("root"));
