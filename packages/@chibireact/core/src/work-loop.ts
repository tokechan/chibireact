import type { ChibireactNode } from './types'
import {
  TEXT_ELEMENT,
  createFiber,
  type EffectTag,
  type Fiber,
  type FiberType,
} from './fiber'
import { requestIdleWork, type IdleDeadline } from './scheduler'
import { setWipFiber } from './hooks-state'

/**
 * Part 2.4: work loop と作業の単位化。
 * Part 2.5: requestIdleCallback で while を中断・再開可能に。
 * Part 2.6: 二重バッファ (current / wipRoot) と commit phase 分離、reconcile で前回ツリーと比較。
 *
 * 章ごとの進化まとめ:
 *   - 2.4: 同期 while + DOM を work 中に append → 部分描画が見える可能性
 *   - 2.5: deadline で中断・再開 + DOM は依然 work 中に append
 *   - 2.6: render phase (Fiber 構築) と commit phase (DOM 反映) を完全分離
 *           → 描画途中の半端な DOM はユーザーに見えない
 *           → 再レンダ時は前回ツリー (currentRoot) と比較し、PLACEMENT/UPDATE/DELETION に振り分け
 *
 * 提供する 2 つのエントリポイント:
 *   - `runFiberRoot`     : 同期版。テスト・教育用。
 *   - `scheduleFiberRoot`: スケジューラ版。RIC でアイドル時間に少しずつ進める。
 *
 * まだやっていないこと:
 *   - Part 2.7: prop 差分の最小化 (現状は UPDATE で全 prop を再適用)、
 *               event listener の取り回し最適化、ライフサイクル/effect。
 */

/** ルート Fiber を識別する sentinel。 */
const HOST_ROOT = '__HOST_ROOT__' as const

/** モジュール状態 (1 root 前提の最小実装)。 */
let nextUnitOfWork: Fiber | null = null
let wipRoot: Fiber | null = null
let currentRoot: Fiber | null = null
let deletions: Fiber[] = []
let isScheduled = false

// --- 公開エントリポイント -----------------------------------------------------

/**
 * 仮想 DOM ツリーを container に描画します（同期版）。
 *
 * Part 2.6 から内部の進め方が変わりました:
 *   1. wipRoot を作り、現在の currentRoot を alternate にリンク
 *   2. 同期 while で performUnitOfWork を回し、Fiber tree を完成させる
 *   3. commitRoot で DOM 反映 (PLACEMENT/UPDATE/DELETION)
 *
 * 2 度目の `runFiberRoot` 呼び出しでは、前回ツリーと diff して **同じ DOM を再利用** します。
 */
export function runFiberRoot(
  element: ChibireactNode,
  container: HTMLElement,
): void {
  prepareWipRoot(element, container)
  while (nextUnitOfWork !== null) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
  commitRoot()
}

/**
 * 仮想 DOM ツリーを container に描画します（スケジューラ版・中断可能）。
 *
 * `runFiberRoot` との違いは「同期 while」が「RIC ベースの中断可能 while」になっただけ。
 * 内部のフェーズ分け (render phase → commit phase) は同一。
 */
export function scheduleFiberRoot(
  element: ChibireactNode,
  container: HTMLElement,
): void {
  prepareWipRoot(element, container)
  if (!isScheduled) {
    isScheduled = true
    requestIdleWork(workLoopStep)
  }
}

/**
 * @internal
 * テスト用: モジュール状態を初期化。
 */
export function _resetSchedulerForTesting(): void {
  nextUnitOfWork = null
  wipRoot = null
  currentRoot = null
  deletions = []
  isScheduled = false
}

// --- 共通処理 ----------------------------------------------------------------

/**
 * ルート Fiber を作って render phase の準備をします。同期/非同期の両エントリで共通。
 */
function prepareWipRoot(element: ChibireactNode, container: HTMLElement): void {
  wipRoot = createFiber(HOST_ROOT as unknown as FiberType, {}, null)
  wipRoot.dom = container
  wipRoot.pendingChildren = [element]
  // 同じ container への 2 回目以降のみ alternate を引き継ぐ。
  // container が変わったら別ツリー扱いで PLACEMENT から始める。
  wipRoot.alternate = currentRoot?.dom === container ? currentRoot : null
  deletions = []
  nextUnitOfWork = wipRoot
}

/**
 * RIC から呼ばれる 1 ステップ。deadline の余裕がある間ユニットを処理し、
 * 余裕が切れたら yield。残作業があれば次のアイドル時間に再スケジュール。
 * 全作業が終わったら commitRoot を呼ぶ。
 */
function workLoopStep(deadline: IdleDeadline): void {
  let shouldYield = false
  while (nextUnitOfWork !== null && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  if (nextUnitOfWork !== null) {
    requestIdleWork(workLoopStep)
  } else {
    // render phase 完了 → commit
    if (wipRoot !== null) {
      commitRoot()
    }
    isScheduled = false
  }
}

/**
 * 1 つの Fiber に対する render phase の処理。**DOM への append はここで行わない**。
 * 担当:
 *   - 関数コンポーネントの実行
 *   - 必要なら DOM ノードを生成（append はしない）
 *   - 子要素を Fiber 化 + alternate と比較して effectTag を付ける
 *   - 次のユニットを返す
 */
function performUnitOfWork(fiber: Fiber): Fiber | null {
  if (typeof fiber.type === 'function') {
    // Part 3.2: hook を fiber に紐付ける。
    // alternate (前回の同じ fiber) があれば hooks 配列を引き継ぐ。
    // 浅いコピーなので Hook オブジェクト自体は共有 → setState の mutation が次回も見える。
    fiber.hooks = fiber.alternate ? [...fiber.alternate.hooks] : []
    setWipFiber(fiber)

    const componentProps = {
      ...fiber.props,
      children: fiber.pendingChildren,
    }
    const result = (
      fiber.type as (p: Record<string, unknown>) => ChibireactNode
    )(componentProps)
    fiber.pendingChildren = [result]
  }

  // PLACEMENT の Fiber は DOM ノードを作る (append しない)。UPDATE は alternate から DOM を継承済。
  if (fiber.dom === null && fiber.type !== HOST_ROOT && typeof fiber.type !== 'function') {
    fiber.dom = createDomFromFiber(fiber)
  }

  reconcileChildren(fiber, fiber.pendingChildren)
  return findNextUnit(fiber)
}

/**
 * 子要素の Fiber 化 (alternate 比較あり, Part 2.6)。
 *
 * 旧 fiber と新 child を **インデックス順で並走** し、type が一致したら DOM を再利用 (UPDATE)、
 * 不一致なら新規作成 (PLACEMENT) + 旧 fiber を DELETION に振り分け。
 * 余った旧 fiber は全て DELETION に。
 *
 * 制限 (2.7 で改善予定):
 *   - key による並び替え対応はまだ無い (index ベースの比較のみ)
 */
function reconcileChildren(
  wipFiber: Fiber,
  newChildren: readonly ChibireactNode[],
): void {
  let oldFiber: Fiber | null = wipFiber.alternate?.child ?? null
  let prevSibling: Fiber | null = null
  let i = 0

  for (const childNode of flatten(newChildren)) {
    if (
      childNode === null ||
      childNode === undefined ||
      typeof childNode === 'boolean'
    ) {
      continue
    }

    const newFiber = reconcileSingleChild(wipFiber, oldFiber, childNode)

    // 旧 fiber が存在するが type 不一致 → DELETION
    if (oldFiber !== null && newFiber !== null && newFiber.alternate === null) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (newFiber !== null) {
      newFiber.parent = wipFiber
      if (i === 0) {
        wipFiber.child = newFiber
      } else if (prevSibling !== null) {
        prevSibling.sibling = newFiber
      }
      prevSibling = newFiber
      i++
    }

    if (oldFiber !== null) {
      oldFiber = oldFiber.sibling
    }
  }

  // 残った旧 fiber は全て DELETION
  while (oldFiber !== null) {
    oldFiber.effectTag = 'DELETION'
    deletions.push(oldFiber)
    oldFiber = oldFiber.sibling
  }
}

/**
 * 1 つの子要素を reconcile して新しい Fiber を返します。
 * 旧 fiber と type が一致するなら DOM 再利用 + UPDATE、不一致なら PLACEMENT。
 */
function reconcileSingleChild(
  _wipFiber: Fiber,
  oldFiber: Fiber | null,
  childNode: ChibireactNode,
): Fiber | null {
  // 文字列・数値: TEXT_ELEMENT
  if (typeof childNode === 'string' || typeof childNode === 'number') {
    if (oldFiber !== null && oldFiber.type === TEXT_ELEMENT) {
      // UPDATE: 同じ text fiber を更新
      const fiber = createFiber(TEXT_ELEMENT, { nodeValue: String(childNode) })
      fiber.dom = oldFiber.dom
      fiber.alternate = oldFiber
      fiber.effectTag = 'UPDATE'
      return fiber
    }
    // PLACEMENT
    const fiber = createFiber(TEXT_ELEMENT, { nodeValue: String(childNode) })
    fiber.effectTag = 'PLACEMENT'
    return fiber
  }

  // 配列・null・boolean は呼び出し側でフィルタ済
  if (childNode === null || childNode === undefined || typeof childNode === 'boolean') {
    return null
  }
  if (isNodeArray(childNode)) return null

  // 通常 element
  const sameType = oldFiber !== null && oldFiber.type === childNode.type
  if (sameType && oldFiber !== null) {
    // UPDATE: DOM 再利用
    const fiber = createFiber(
      childNode.type,
      childNode.props,
      childNode.key ?? null,
    )
    fiber.dom = oldFiber.dom
    fiber.alternate = oldFiber
    fiber.effectTag = 'UPDATE'
    fiber.pendingChildren = childNode.children
    return fiber
  }
  // PLACEMENT
  const fiber = createFiber(
    childNode.type,
    childNode.props,
    childNode.key ?? null,
  )
  fiber.effectTag = 'PLACEMENT'
  fiber.pendingChildren = childNode.children
  return fiber
}

// --- commit phase -----------------------------------------------------------

/**
 * render phase で組んだ wipRoot を実 DOM に反映します。
 * 1. 削除を先に処理 (children が再利用される前に消す)
 * 2. wipRoot を再帰的に walk し、effectTag に従って append/update
 * 3. currentRoot ← wipRoot に差し替え (次回 render の比較対象になる)
 */
function commitRoot(): void {
  if (wipRoot === null) return
  for (const d of deletions) {
    commitDeletion(d)
  }
  if (wipRoot.child !== null) {
    commitWork(wipRoot.child)
  }
  const committedRoot = wipRoot
  currentRoot = wipRoot
  wipRoot = null
  deletions = []
  // Part 3.4 / 3.5: commit phase 後に effect を走らせる。
  // 順序: layout effect (DOM 同期) → passive effect (本書では同 tick で続けて実行)。
  if (committedRoot.child !== null) {
    runEffects(committedRoot.child, 'layout')
    runEffects(committedRoot.child, 'passive')
  }
}

/**
 * commit 後に pendingCommit が立っている useEffect / useLayoutEffect を実行する。
 * tag で 2 段に分けて呼ぶことで、layout を先に同期実行できる。
 *
 * - 'layout': useLayoutEffect。本家でも本書でも sync。DOM 測定 → setState の典型用途
 * - 'passive': useEffect。本家は async (ペイント後)、本書は sync。Part 5 以降で async 化候補
 */
function runEffects(fiber: Fiber | null, tag: 'layout' | 'passive'): void {
  if (fiber === null) return
  for (const hook of fiber.hooks) {
    if (hook.kind !== 'effect') continue
    if (hook.tag !== tag) continue
    if (!hook.pendingCommit) continue
    hook.cleanup?.()
    const ret = hook.effect()
    hook.cleanup = typeof ret === 'function' ? ret : undefined
    hook.pendingCommit = false
  }
  runEffects(fiber.child, tag)
  runEffects(fiber.sibling, tag)
}

/**
 * Part 3.4: 削除される fiber の effect cleanup を全部呼ぶ。
 * 関数コンポ内に登録された timer / subscription をリークさせない。
 */
function runCleanupsForDeletion(fiber: Fiber | null): void {
  if (fiber === null) return
  for (const hook of fiber.hooks) {
    if (hook.kind === 'effect') {
      hook.cleanup?.()
    }
  }
  runCleanupsForDeletion(fiber.child)
  runCleanupsForDeletion(fiber.sibling)
}

function commitWork(fiber: Fiber | null): void {
  if (fiber === null) return

  const domParent = findClosestDomAncestor(fiber)
  if (
    fiber.effectTag === 'PLACEMENT' &&
    fiber.dom !== null &&
    domParent !== null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion(fiber: Fiber): void {
  // Part 3.4: 部分木の effect cleanup を先に呼ぶ
  runCleanupsForDeletion(fiber)
  if (fiber.dom !== null) {
    const parentDom = findClosestDomAncestor(fiber)
    if (parentDom !== null && fiber.dom.parentNode === parentDom) {
      parentDom.removeChild(fiber.dom)
    }
    return
  }
  // 関数コンポーネント Fiber は DOM を持たない → child の DOM を消す
  if (fiber.child !== null) {
    commitDeletion(fiber.child)
  }
}

// --- DOM ヘルパー ------------------------------------------------------------

function createDomFromFiber(fiber: Fiber): Node | null {
  if (fiber.type === HOST_ROOT) return null
  if (typeof fiber.type === 'function') return null
  if (fiber.type === TEXT_ELEMENT) {
    return document.createTextNode(String(fiber.props.nodeValue))
  }
  const dom = document.createElement(fiber.type as string)
  applyProps(dom, fiber.props)
  return dom
}

function findClosestDomAncestor(fiber: Fiber): Node | null {
  let p = fiber.parent
  while (p !== null && p.dom === null) {
    p = p.parent
  }
  return p?.dom ?? null
}

/**
 * UPDATE 時の DOM プロパティ更新（Part 2.7 で diff 最小化）。
 *
 * 戦略:
 *   1. text fiber → nodeValue を比較して必要なら差し替え
 *   2. 古い props にあって新 props で消えた属性 → DOM から除去
 *   3. 新しいまたは変わった prop のみ適用
 *      - イベント: 古いリスナを removeEventListener してから新しいリスナを addEventListener
 *      - className / style / attribute: 値を入れ替え
 *
 * 不変な prop は触らない → 余計な setAttribute / addEventListener を避ける。
 */
function updateDom(
  dom: Node,
  oldProps: Record<string, unknown>,
  newProps: Record<string, unknown>,
): void {
  // text fiber
  if (dom.nodeType === Node.TEXT_NODE) {
    if (oldProps.nodeValue !== newProps.nodeValue) {
      ;(dom as Text).nodeValue = String(newProps.nodeValue ?? '')
    }
    return
  }
  if (!(dom instanceof HTMLElement)) return

  // 1. 削除された prop を DOM から除去
  for (const key of Object.keys(oldProps)) {
    if (key === 'children') continue
    if (key in newProps) continue // 新側にもあるなら上書きで処理される
    removeProp(dom, key, oldProps[key])
  }

  // 2. 新規 / 変更された prop を適用
  for (const [key, newValue] of Object.entries(newProps)) {
    if (key === 'children') continue
    const oldValue = oldProps[key]
    if (Object.is(oldValue, newValue)) continue
    setProp(dom, key, oldValue, newValue)
  }
}

/** 1 つの prop を DOM から除去する。 */
function removeProp(dom: HTMLElement, key: string, value: unknown): void {
  if (isEventProp(key) && typeof value === 'function') {
    dom.removeEventListener(getEventName(key), value as EventListener)
    return
  }
  if (key === 'className') {
    dom.removeAttribute('class')
    return
  }
  if (key === 'style') {
    dom.removeAttribute('style')
    return
  }
  dom.removeAttribute(key)
}

/** 1 つの prop を DOM に設定する（古い値があれば差し替え相当の処理）。 */
function setProp(
  dom: HTMLElement,
  key: string,
  oldValue: unknown,
  newValue: unknown,
): void {
  if (isEventProp(key)) {
    if (typeof oldValue === 'function') {
      dom.removeEventListener(getEventName(key), oldValue as EventListener)
    }
    if (typeof newValue === 'function') {
      dom.addEventListener(getEventName(key), newValue as EventListener)
    }
    return
  }
  if (key === 'className') {
    dom.className = String(newValue ?? '')
    return
  }
  if (key === 'style' && typeof newValue === 'object' && newValue !== null) {
    // 古い style キーで新側に無いものは消す（最小限の style diff）
    if (oldValue && typeof oldValue === 'object') {
      for (const styleKey of Object.keys(oldValue as Record<string, unknown>)) {
        if (!(styleKey in (newValue as Record<string, unknown>))) {
          ;(dom.style as unknown as Record<string, string>)[styleKey] = ''
        }
      }
    }
    Object.assign(dom.style, newValue as CSSStyleDeclaration)
    return
  }
  if (newValue == null) {
    dom.removeAttribute(key)
    return
  }
  if (
    typeof newValue === 'string' ||
    typeof newValue === 'number' ||
    typeof newValue === 'boolean'
  ) {
    dom.setAttribute(key, String(newValue))
  }
}

function findNextUnit(fiber: Fiber): Fiber | null {
  if (fiber.child !== null) return fiber.child
  let next: Fiber | null = fiber
  while (next !== null) {
    if (next.sibling !== null) return next.sibling
    next = next.parent
  }
  return null
}

function isNodeArray(n: ChibireactNode): n is readonly ChibireactNode[] {
  return Array.isArray(n)
}

function* flatten(
  nodes: readonly ChibireactNode[],
): IterableIterator<ChibireactNode> {
  for (const n of nodes) {
    if (isNodeArray(n)) yield* flatten(n)
    else yield n
  }
}

// --- DOM 属性・イベント反映 (Part 1.5/1.6 と同じロジック) ---

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key)
}

function getEventName(key: string): string {
  return key.slice(2).toLowerCase()
}

function applyProps(dom: HTMLElement, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue

    if (isEventProp(key) && typeof value === 'function') {
      dom.addEventListener(getEventName(key), value as EventListener)
      continue
    }

    if (key === 'className') {
      dom.className = String(value)
      continue
    }

    if (key === 'style' && typeof value === 'object' && value !== null) {
      Object.assign(dom.style, value as CSSStyleDeclaration)
      continue
    }

    if (value == null) continue

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      dom.setAttribute(key, String(value))
      continue
    }
  }
}
