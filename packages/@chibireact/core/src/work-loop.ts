import type { ChibireactNode } from './types'
import { TEXT_ELEMENT, createFiber, type Fiber, type FiberType } from './fiber'

/**
 * Part 2.4: work loop と作業の単位化。
 *
 * 2.3 では `buildFiberTree` で **同期的に** 全 Fiber を一気に作っていた。
 * ここでは同じ仕事を **「1 ノードずつ進める」** 形に書き換える。
 *
 * 中核アイデア:
 *   - 「次にやる仕事」を `nextUnitOfWork: Fiber | null` という変数で持つ
 *   - while ループで `performUnitOfWork(fiber)` を呼び続ける
 *   - 各 fiber の処理ごとに「DOM 作成 → 親に append → 子 fiber 化 → 次のユニットを返す」を行う
 *
 * 副産物として、Part 1 の `render` と同じ DOM 出力が得られる
 * （関数コンポーネント・イベント・属性すべて対応）。
 *
 * まだやっていないこと（次以降の章で実装）:
 *   - Part 2.5: ブラウザのアイドル時間に合わせて while ループを **中断・再開**
 *   - Part 2.6: 前回ツリーとの diff（reconciliation・二重バッファ）
 *   - Part 2.7: render と commit の分離（今は work loop 内で eager に DOM を触っている）
 */

/** ルート Fiber を識別する sentinel。host element でも関数でもない特別な型。 */
const HOST_ROOT = '__HOST_ROOT__' as const

/** モジュール内の "次にやる仕事" ポインタ。1 root 前提の最小実装。 */
let nextUnitOfWork: Fiber | null = null

/**
 * 仮想 DOM ツリーを container に描画します（Fiber 経由・同期版）。
 *
 * Part 1 の `render` と同じ DOM 出力を生成しますが、内部の進め方が違います:
 *   render          → コールスタックの再帰
 *   runFiberRoot    → nextUnitOfWork ポインタの while ループ
 *
 * @example
 *   runFiberRoot(createElement('h1', null, 'Hello'), document.body)
 */
export function runFiberRoot(
  element: ChibireactNode,
  container: HTMLElement,
): void {
  // ルート Fiber を作る。`dom` は container で固定、`pendingChildren` に渡された
  // element を 1 個入れて「最初に展開すべき子」とする。
  const root = createFiber(HOST_ROOT as unknown as FiberType, {}, null)
  root.dom = container
  root.pendingChildren = [element]

  nextUnitOfWork = root
  while (nextUnitOfWork !== null) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
  }
}

/**
 * 1 つの Fiber を処理し、**次にやるべき Fiber** を返します。
 *
 * このメソッドが「中断・再開」可能な単位。Part 2.5 で while を
 * `requestIdleCallback` の deadline で抜ける形に書き換えれば、
 * ここで一旦 return することでブラウザに制御を返せます。
 */
function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 1. 関数コンポーネント: 関数を呼んで戻り値を pendingChildren にする
  //    （2.3 では nodeToFiber 内で eager に呼んでいた → ここで遅延化された）
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

  // 2. DOM ノードを作る (host element, text)
  //    関数コンポーネントと HOST_ROOT は createDomFromFiber が null を返す
  if (fiber.dom === null) {
    fiber.dom = createDomFromFiber(fiber)
  }

  // 3. DOM を親に append
  //    関数 fiber は dom = null なので、その子は **祖先のうち最初に DOM を持つもの** に
  //    付く。これが「関数コンポーネントは透過」と呼ばれる挙動。
  if (fiber.parent !== null && fiber.dom !== null) {
    const parentDom = findClosestDomAncestor(fiber)
    if (parentDom !== null) {
      parentDom.appendChild(fiber.dom)
    }
  }

  // 4. children を Fiber 化して child / sibling 鎖を張る
  reconcileChildren(fiber, fiber.pendingChildren)

  // 5. 次のユニット: child があれば降りる、なければ sibling、それも無ければ
  //    parent.sibling を辿って戻りながら探す
  return findNextUnit(fiber)
}

/**
 * fiber に対応する DOM ノードを生成します。
 * - host element → document.createElement + applyProps
 * - text         → document.createTextNode
 * - function / HOST_ROOT → null（DOM を持たない）
 */
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

/**
 * 「DOM を持つ最寄りの祖先」を返します。関数コンポーネント Fiber は
 * dom = null なので、その子要素は祖父・曽祖父にぶら下がります。
 */
function findClosestDomAncestor(fiber: Fiber): Node | null {
  let p = fiber.parent
  while (p !== null && p.dom === null) {
    p = p.parent
  }
  return p?.dom ?? null
}

/**
 * children に並んだ vDOM を Fiber 化し、parent.child / sibling 鎖を作ります。
 *
 * 配列・null・false など Part 1.7 で扱った "スキップ系" もここで吸収します。
 */
function reconcileChildren(
  parent: Fiber,
  children: readonly ChibireactNode[],
): void {
  let prev: Fiber | null = null
  for (const node of flatten(children)) {
    const childFiber = nodeToFiber(node)
    if (childFiber === null) continue
    childFiber.parent = parent
    if (parent.child === null) {
      parent.child = childFiber
    } else if (prev !== null) {
      prev.sibling = childFiber
    }
    prev = childFiber
  }
}

/**
 * 1 つの vDOM ノードを Fiber 1 個に変換（リンクは張らない）。
 * 配列・null・undefined・boolean は null を返す（呼び出し側でスキップ）。
 *
 * 2.3 の fiber.ts にも同名 helper があるが、こちらは pendingChildren も
 * 同時に埋める。コード重複は教育目的の許容範囲。
 */
function nodeToFiber(node: ChibireactNode): Fiber | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (isNodeArray(node)) return null
  if (typeof node === 'string' || typeof node === 'number') {
    return createFiber(TEXT_ELEMENT, { nodeValue: String(node) })
  }
  const fiber = createFiber(node.type, node.props, node.key ?? null)
  // host element / function fiber 共通: 元 element の children を保持しておく。
  // 関数 fiber は performUnitOfWork で関数を呼んだ後に上書きされる。
  fiber.pendingChildren = node.children
  return fiber
}

/**
 * 「次にやるべき Fiber」を決定します:
 *   1. child があれば降りる
 *   2. 自分または上方向の sibling
 *   3. それも無ければ終了 (null)
 *
 * 例: <div><h1/><p/></div>
 *   div → h1   (child)
 *   h1 → p     (sibling)
 *   p → null   (parent.sibling=null, parent.parent=root, root.sibling=null → 終了)
 */
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
