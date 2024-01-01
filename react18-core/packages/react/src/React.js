// 给开发者使用
import { useReducer, useState, useEffect } from "./ReactHooks";
// 给 react 自己使用
import ReactSharedInternals from "./ReactSharedInternals";

export {
  // ReactCurrentDispatcher.current
  useReducer,
  useState,
  useEffect,
  // 给自己使用的时候，react 取了一个特别长的别名
  // { ReactCurrentDispatcher: { current: null } }
  ReactSharedInternals as __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
};
