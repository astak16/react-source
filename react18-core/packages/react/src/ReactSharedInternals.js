import ReactCurrentDispatcher from "./ReactCurrentDispatcher";

// 将 useReducer 本体包装一下，给自己使用
const ReactSharedInternals = { ReactCurrentDispatcher };

export default ReactSharedInternals;
