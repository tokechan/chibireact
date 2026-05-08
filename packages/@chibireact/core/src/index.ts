export { createRoot } from './create-root'
export { createElement } from './create-element'
export { render } from './render'
export {
  useState,
  useReducer,
  useEffect,
  useLayoutEffect,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useTransition,
  startTransition,
  useDeferredValue,
} from './hooks-state'
export { createContext } from './context'
export type { Context, ContextProvider } from './context'
export { buildFiberTree, createFiber, TEXT_ELEMENT } from './fiber'
export { runFiberRoot, scheduleFiberRoot } from './work-loop'
export { h } from './h'
export { Suspense } from './suspense'
export { ErrorBoundary } from './error-boundary'
export type { ErrorBoundaryProps } from './error-boundary'
export { createPortal, PORTAL } from './portal'
export { requestIdleWork } from './scheduler'
export type { IdleDeadline, IdleWorkCallback } from './scheduler'
export type { ChibireactElement, ChibireactNode } from './types'
export type { Root } from './create-root'
export type { Dispatch, SetStateAction, Reducer } from './hooks-state'
export type {
  Fiber,
  FiberType,
  EffectTag,
  Hook,
  StateHook,
  EffectHook,
  MemoHook,
  RefHook,
} from './fiber'
export type {
  FunctionComponent,
  FC,
  CommonHTMLProps,
} from './jsx-types'

// JSX namespace を有効化するために import 副作用を発生させる
import './jsx-types'
