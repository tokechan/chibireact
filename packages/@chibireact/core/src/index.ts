export { createRoot } from './create-root'
export { createElement } from './create-element'
export { render } from './render'
export { useState, useReducer } from './hooks-state'
export { buildFiberTree, createFiber, TEXT_ELEMENT } from './fiber'
export { runFiberRoot, scheduleFiberRoot } from './work-loop'
export { requestIdleWork } from './scheduler'
export type { IdleDeadline, IdleWorkCallback } from './scheduler'
export type { ChibireactElement, ChibireactNode } from './types'
export type { Root } from './create-root'
export type { Dispatch, SetStateAction, Reducer } from './hooks-state'
export type { Fiber, FiberType, EffectTag } from './fiber'
export type {
  FunctionComponent,
  FC,
  CommonHTMLProps,
} from './jsx-types'

// JSX namespace を有効化するために import 副作用を発生させる
import './jsx-types'
