export { createRoot } from './create-root'
export { createElement } from './create-element'
export { render } from './render'
export { useState } from './hooks-state'
export type { ChibireactElement, ChibireactNode } from './types'
export type { Root } from './create-root'
export type { Dispatch, SetStateAction } from './hooks-state'
export type {
  FunctionComponent,
  FC,
  CommonHTMLProps,
} from './jsx-types'

// JSX namespace を有効化するために import 副作用を発生させる
import './jsx-types'
