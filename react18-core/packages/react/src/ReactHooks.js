import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

function resolveDispatcher() {
  // useReducer 本体
  return ReactCurrentDispatcher.current;
}

export function useReducer(reducer, initialArg) {
  // 拿到 useReducer
  const dispatcher = resolveDispatcher();
  // 调用 useReducer
  // 我们定义的时候 ReactCurrentDispatcher.current 是 null，这里怎么可以调用 useReducer 呢？
  // 那肯定是在后面某个地方给 ReactCurrentDispatcher.current 赋值了
  return dispatcher.useReducer(reducer, initialArg);
}

export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
