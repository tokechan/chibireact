import type { ChibireactNode } from './types'
import {
  TEXT_ELEMENT,
  createFiber,
  type EffectTag,
  type Fiber,
  type FiberType,
} from './fiber'
import { requestIdleWork, type IdleDeadline } from './scheduler'

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
  currentRoot = wipRoot
  wipRoot = null
  deletions = []
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
 * UPDATE 時の DOM プロパティ更新。
 *
 * 2.6 では「古いイベントリスナを外して新しいリスナを付け直す」+「すべての new prop を再適用」
 * という単純な戦略を採る。差分計算で最小限に絞る最適化は 2.7 で。
 *
 * 注意点:
 *   - イベントは古いハンドラを外さないと多重登録される
 *   - 「古い props にあって新しい props で消えた属性」は今は残ったまま (2.7 で対応)
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

  // 古いイベントリスナを除去
  for (const [key, value] of Object.entries(oldProps)) {
    if (isEventProp(key) && typeof value === 'function') {
      dom.removeEventListener(getEventName(key), value as EventListener)
    }
  }

  applyProps(dom, newProps)
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
