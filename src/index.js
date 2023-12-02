import React, { useState, useEffect } from "./react";
import ReactDOM from "./react-dom";

export function createConnection(serverUrl, roomId) {
  // A real implementation would actually connect to the server
  return {
    connect() {
      console.log(
        '✅ Connecting to "' + roomId + '" room at ' + serverUrl + "..."
      );
    },
    disconnect() {
      console.log('❌ Disconnected from "' + roomId + '" room at ' + serverUrl);
    },
  };
}

function ChatRoom({ roomId }) {
  const [serverUrl, setServerUrl] = useState("https://localhost:1234");

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => {
      connection.disconnect();
    };
  }, [roomId, serverUrl]);

  useEffect(() => {
    console.log("useEffect no deps");
  });

  useEffect(() => {
    console.log("useEffect with serverUrl");
  }, [serverUrl]);

  useEffect(() => {
    console.log("useEffect with roomId");
  }, [roomId]);

  useEffect(() => {
    console.log("useEffect with empty deps");
  }, []);

  return (
    <div>
      <label>
        Server URL:{" "}
        <input
          value={serverUrl}
          onInput={(e) => setServerUrl(e.target.value)}
        />
      </label>
      <h1>Welcome to the {roomId} room!</h1>
    </div>
  );
}

export default function App() {
  const [roomId, setRoomId] = useState("general");
  const [show, setShow] = useState(false);
  return (
    <div>
      <label>
        Choose the chat room:{" "}
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="general">general</option>
          <option value="travel">travel</option>
          <option value="music">music</option>
        </select>
      </label>
      <button onClick={() => setShow(!show)}>
        {show ? "Close chat" : "Open chat"}
      </button>
      {show && <hr />}
      {show && <ChatRoom roomId={roomId} />}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
