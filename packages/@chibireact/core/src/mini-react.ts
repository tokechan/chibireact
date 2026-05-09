/**
 * mini-react.ts — 30 分で読める 1 ファイル版 React (Part 7 / 付録 A.1)。
 *
 * 本書 Part 1-3 (Stack reconciler → Fiber → Hooks) の **核心だけ** を
 * 約 250 行に圧縮した教材ファイル。
 *
 * 含むもの:
 *   - createElement / createRoot
 *   - Fiber based work loop (parent / child / sibling / alternate)
 *   - effectTag (PLACEMENT / UPDATE / DELETION)
 *   - reconciliation
 *   - 関数コンポーネント
 *   - useState (per-fiber 紐付け)
 *   - setState の queueMicrotask バッチング
 *
 * 含まないもの (本書本体で扱う):
 *   - useEffect / useReducer / useContext / useMemo / useRef
 *   - Suspense / ErrorBoundary / Portal
 *   - Concurrent Rendering (lane)
 *   - Scheduler (RIC)
 *   - JSX トランスフォーマ
 *
 * 「これだけで Counter が動く」のが目標。
 */

// ============================================================
// 型定義
// ============================================================

const TEXT = '__TEXT__' as const

type FiberType = string | Function | typeof TEXT | 'ROOT'

type Hook = { state: unknown }

type Element = {
  type: FiberType
  props: { children: Element[]; [key: string]: unknown }
}

type Fiber = {
  type: FiberType
  props: { children: Element[]; [key: string]: unknown }
  parent: Fiber | null
  child: Fiber | null
  sibling: Fiber | null
  alternate: Fiber | null
  dom: Node | null
  effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION'
  hooks: Hook[]
}

// ============================================================
// createElement (Part 1.3 相当)
// ============================================================

export function createElement(
  type: FiberType,
  props: Record<string, unknown> | null,
  ...children: Array<Element | string | number | boolean | null | undefined>
): Element {
  const flatChildren: Element[] = []
  const push = (c: unknown): void => {
    if (c === null || c === undefined || c === false || c === true) return
    if (Array.isArray(c)) {
      for (const item of c) push(item)
      return
    }
    if (typeof c === 'string' || typeof c === 'number') {
      flatChildren.push({
        type: TEXT,
        props: { nodeValue: String(c), children: [] },
      })
      return
    }
    flatChildren.push(c as Element)
  }
  for (const c of children) push(c)
  return {
    type,
    props: { ...(props ?? {}), children: flatChildren },
  }
}

// ============================================================
// モジュール状態 (work loop と hooks 共通)
// ============================================================

let nextUnitOfWork: Fiber | null = null
let wipRoot: Fiber | null = null
let currentRoot: Fiber | null = null
let deletions: Fiber[] = []
let wipFiber: Fiber | null = null
let hookIndex = 0
let scheduled = false

// ============================================================
// createRoot (Part 1.1 + Part 2.7 相当)
// ============================================================

export function createRoot(container: HTMLElement): { render: (e: Element) => void } {
  return {
    render(element: Element) {
      wipRoot = {
        type: 'ROOT',
        props: { children: [element] },
        parent: null,
        child: null,
        sibling: null,
        alternate: currentRoot,
        dom: container,
        hooks: [],
      }
      deletions = []
      nextUnitOfWork = wipRoot
      runWorkLoop()
    },
  }
}

function runWorkLoop(): void {
  while (nextUnitOfWork !== null) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  if (wipRoot !== null) commitRoot()
}

// ============================================================
// performUnitOfWork (Part 2.4 相当)
// ============================================================

function performUnitOfWork(fiber: Fiber): Fiber | null {
  if (typeof fiber.type === 'function') {
    fiber.hooks = fiber.alternate ? [...fiber.alternate.hooks] : []
    wipFiber = fiber
    hookIndex = 0
    const result = (fiber.type as (p: Record<string, unknown>) => Element)(
      fiber.props,
    )
    reconcileChildren(fiber, result ? [result] : [])
  } else {
    if (fiber.dom === null && fiber.type !== 'ROOT') {
      fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
  }

  if (fiber.child !== null) return fiber.child
  let next: Fiber | null = fiber
  while (next !== null) {
    if (next.sibling !== null) return next.sibling
    next = next.parent
  }
  return null
}

function createDom(fiber: Fiber): Node {
  if (fiber.type === TEXT) {
    return document.createTextNode(String(fiber.props.nodeValue ?? ''))
  }
  const dom = document.createElement(fiber.type as string)
  applyProps(dom, {}, fiber.props)
  return dom
}

// ============================================================
// applyProps (Part 1.5 + Part 2.7 相当)
// ============================================================

function applyProps(
  dom: Node,
  oldProps: Record<string, unknown>,
  newProps: Record<string, unknown>,
): void {
  if (dom.nodeType === Node.TEXT_NODE) {
    if (oldProps.nodeValue !== newProps.nodeValue) {
      ;(dom as Text).nodeValue = String(newProps.nodeValue ?? '')
    }
    return
  }
  if (!(dom instanceof HTMLElement)) return

  for (const key of Object.keys(oldProps)) {
    if (key === 'children' || key in newProps) continue
    removeProp(dom, key, oldProps[key])
  }
  for (const [key, value] of Object.entries(newProps)) {
    if (key === 'children') continue
    if (Object.is(oldProps[key], value)) continue
    setProp(dom, key, oldProps[key], value)
  }
}

function removeProp(dom: HTMLElement, key: string, value: unknown): void {
  if (key.startsWith('on') && typeof value === 'function') {
    dom.removeEventListener(key.slice(2).toLowerCase(), value as EventListener)
  } else if (key === 'className') {
    dom.removeAttribute('class')
  } else {
    dom.removeAttribute(key)
  }
}

function setProp(
  dom: HTMLElement,
  key: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  if (key.startsWith('on')) {
    if (typeof oldValue === 'function') {
      dom.removeEventListener(key.slice(2).toLowerCase(), oldValue as EventListener)
    }
    if (typeof newValue === 'function') {
      dom.addEventListener(key.slice(2).toLowerCase(), newValue as EventListener)
    }
  } else if (key === 'className') {
    dom.className = String(newValue ?? '')
  } else if (newValue == null) {
    dom.removeAttribute(key)
  } else {
    dom.setAttribute(key, String(newValue))
  }
}

// ============================================================
// reconcileChildren (Part 2.6 相当)
// ============================================================

function reconcileChildren(wip: Fiber, children: Element[]): void {
  let oldFiber: Fiber | null = wip.alternate?.child ?? null
  let prev: Fiber | null = null
  let i = 0

  while (i < children.length || oldFiber !== null) {
    const childEl = children[i]
    const sameType =
      oldFiber !== null && childEl !== undefined && oldFiber.type === childEl.type

    let newFiber: Fiber | null = null
    if (sameType && oldFiber !== null) {
      newFiber = {
        type: oldFiber.type,
        props: childEl.props,
        parent: wip,
        child: null,
        sibling: null,
        alternate: oldFiber,
        dom: oldFiber.dom,
        effectTag: 'UPDATE',
        hooks: [],
      }
    } else if (childEl !== undefined) {
      newFiber = {
        type: childEl.type,
        props: childEl.props,
        parent: wip,
        child: null,
        sibling: null,
        alternate: null,
        dom: null,
        effectTag: 'PLACEMENT',
        hooks: [],
      }
    }
    if (oldFiber !== null && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (i === 0) wip.child = newFiber
    else if (prev !== null) prev.sibling = newFiber

    prev = newFiber
    if (oldFiber !== null) oldFiber = oldFiber.sibling
    i++
  }
}

// ============================================================
// commit phase (Part 2.6 相当)
// ============================================================

function commitRoot(): void {
  for (const d of deletions) commitWork(d)
  if (wipRoot && wipRoot.child) commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
  deletions = []
}

function commitWork(fiber: Fiber | null): void {
  if (fiber === null) return

  let parentFiber: Fiber | null = fiber.parent
  while (parentFiber !== null && parentFiber.dom === null) {
    parentFiber = parentFiber.parent
  }
  const parentDom = parentFiber?.dom ?? null

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null && parentDom !== null) {
    parentDom.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    applyProps(fiber.dom, fiber.alternate?.props ?? {}, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    if (fiber.dom !== null && parentDom !== null && fiber.dom.parentNode === parentDom) {
      parentDom.removeChild(fiber.dom)
    }
    return // 子は再帰しない (DOM ごと消える)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

// ============================================================
// useState (Part 3.2 相当)
// ============================================================

export type Setter<T> = (next: T | ((prev: T) => T)) => void

export function useState<T>(initial: T): [T, Setter<T>] {
  if (wipFiber === null) throw new Error('useState outside render')
  const fiber = wipFiber
  const idx = hookIndex++

  if (fiber.hooks[idx] === undefined) fiber.hooks[idx] = { state: initial }
  const hook = fiber.hooks[idx] as Hook & { state: T }

  const setState: Setter<T> = (action) => {
    const next =
      typeof action === 'function' ? (action as (p: T) => T)(hook.state) : action
    if (Object.is(hook.state, next)) return
    hook.state = next
    schedule()
  }

  return [hook.state, setState]
}

function schedule(): void {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    if (currentRoot === null) return
    // 同じ container, 同じ element で再 render
    wipRoot = {
      type: currentRoot.type,
      props: currentRoot.props,
      parent: null,
      child: null,
      sibling: null,
      alternate: currentRoot,
      dom: currentRoot.dom,
      hooks: [],
    }
    deletions = []
    nextUnitOfWork = wipRoot
    runWorkLoop()
  })
}

// ============================================================
// テスト用: モジュール状態を初期化
// ============================================================

/** @internal */
export function _resetMiniReactForTesting(): void {
  nextUnitOfWork = null
  wipRoot = null
  currentRoot = null
  deletions = []
  wipFiber = null
  hookIndex = 0
  scheduled = false
}
