import type { ChibireactElement, ChibireactNode } from './types'

/**
 * `Array.isArray` だけだと TS が `readonly ChibireactNode[]` を union から
 * 落とし切れないため、明示的な型ガードを使う。
 */
function isNodeArray(n: ChibireactNode): n is readonly ChibireactNode[] {
  return Array.isArray(n)
}

function isElement(n: ChibireactNode): n is ChibireactElement {
  return (
    n !== null &&
    n !== undefined &&
    typeof n !== 'boolean' &&
    typeof n !== 'string' &&
    typeof n !== 'number' &&
    !isNodeArray(n)
  )
}

/**
 * Fiber データ構造（Part 2.3）。
 *
 * Part 1 では仮想 DOM ツリーを「再帰呼び出し」で辿っていました。
 * Part 2 では同じツリーを **明示的な linked-list** で表現し、
 * 「次にやる仕事」をスタックフレームではなくオブジェクトのフィールドに持たせます。
 * これが「中断・再開可能な描画」(work loop) の前提です。
 *
 * リンク構造:
 *   parent  → 親
 *   child   → 最初の子（残りは child.sibling.sibling... で辿る）
 *   sibling → 同じ親の次の子
 *
 * 例:
 *   <div>
 *     <h1>Title</h1>
 *     <p>Text</p>
 *   </div>
 *
 *   div.parent  = null
 *   div.child   = h1
 *   h1.parent   = div
 *   h1.sibling  = p
 *   p.parent    = div
 *   p.sibling   = null
 *
 * Part 2.3 ではまだ work loop は無く、`buildFiberTree` が同期的に
 * 全ツリーを一気に構築します。Part 2.4 で「1 ノードずつ作る」形に書き換え、
 * Part 2.5 で「ブラウザの空き時間に少しずつ進める」スケジューラを足します。
 */

/**
 * テキストノード用の擬似 type。
 * 全 Fiber が type フィールドを持つことで work loop を一貫させるための工夫
 * （本家 React も同じ発想で `HostText` という内部タグを使う）。
 */
export const TEXT_ELEMENT = '__TEXT_ELEMENT__' as const

export type FiberType = string | Function | typeof TEXT_ELEMENT

/**
 * commit 時に何の操作を行うかを表すフラグ (Part 2.6)。
 * - PLACEMENT: 新規 Fiber → 親 DOM に append する
 * - UPDATE   : 前回と同じ type → DOM を再利用し、props のみ更新する
 * - DELETION : 前回あったが今回無くなった → 親 DOM から removeChild する
 */
export type EffectTag = 'PLACEMENT' | 'UPDATE' | 'DELETION'

/** useState などの hook 1 つ分の状態を入れる箱 (Part 3.2)。 */
export type Hook<T = unknown> = { state: T }

export type Fiber = {
  type: FiberType
  /** TEXT_ELEMENT の場合、{ nodeValue: string } を持つ */
  props: Record<string, unknown>
  key: string | number | null
  parent: Fiber | null
  child: Fiber | null
  sibling: Fiber | null
  /**
   * この Fiber に関連付けられた実 DOM ノード。
   * - host fiber (string type) や text fiber → 対応する DOM
   * - 関数コンポーネント Fiber → null（DOM を持たない）
   * - 2.3 の `buildFiberTree` では未使用。2.4 の work loop で利用開始。
   */
  dom: Node | null
  /**
   * この Fiber を処理するときに「次に Fiber 化すべき子の vDOM 配列」。
   * - 2.3 の `buildFiberTree` ではトラバース時に都度 `elementChildren()` で再導出するので未使用 (`[]`)。
   * - 2.4 の work loop では遅延 fiber 化の入力として使う:
   *   - host fiber: element.children
   *   - function fiber: 関数を呼び出した戻り値 1 個
   *   - root fiber: [rootElement]
   */
  pendingChildren: readonly ChibireactNode[]
  /**
   * 二重バッファ: 前回 commit 済ツリーで対応する Fiber (Part 2.6)。
   * - 初回 render では null
   * - 再 render では reconcile 時にセットされ、UPDATE 判定や DOM 再利用に使う
   */
  alternate: Fiber | null
  /**
   * commit 時に行う操作のフラグ (Part 2.6)。
   * 未設定なら commit 対象外（root sentinel など）。
   */
  effectTag?: EffectTag
  /**
   * この fiber に紐付いた hook の配列 (Part 3.2)。
   * - 関数コンポーネント fiber のみ意味を持つ
   * - 順序は useState の呼び出し順（Rules of Hooks の根拠）
   * - 再 render 時は alternate.hooks を浅くコピーしてここに入れる
   */
  hooks: Hook[]
}

/**
 * 1 つの Fiber ノードを生成します。リンクはこの時点では張りません。
 */
export function createFiber(
  type: FiberType,
  props: Record<string, unknown>,
  key: string | number | null = null,
): Fiber {
  return {
    type,
    props,
    key,
    parent: null,
    child: null,
    sibling: null,
    dom: null,
    pendingChildren: [],
    alternate: null,
    hooks: [],
  }
}

/**
 * 仮想 DOM ノードを Fiber tree（linked-list）に変換します。
 *
 * - element  → 対応する Fiber を作り、children を辿って child / sibling リンクを張る
 * - 文字列/数値 → TEXT_ELEMENT 型の Fiber に変換
 * - null / undefined / boolean → スキップ（null を返す）
 * - 配列が children に含まれていたら平坦化して sibling 鎖に展開
 * - 関数コンポーネント → その関数を呼び、戻り値を child Fiber として接続
 *
 * 戻り値:
 *   - 通常は構築した Fiber tree のルート
 *   - 入力が null/false/undefined/true の場合は null
 */
export function buildFiberTree(node: ChibireactNode): Fiber | null {
  const fiber = nodeToFiber(node)
  if (fiber === null) return null

  const children = elementChildren(node)
  let prev: Fiber | null = null
  for (const childNode of flattenIter(children)) {
    const childFiber = buildFiberTree(childNode)
    if (childFiber === null) continue
    childFiber.parent = fiber
    if (fiber.child === null) {
      fiber.child = childFiber
    } else if (prev !== null) {
      prev.sibling = childFiber
    }
    prev = childFiber
  }

  return fiber
}

/**
 * 1 つのノードを「Fiber 1 個」に変換します。
 * children は扱わない（buildFiberTree 側で再帰）。
 */
function nodeToFiber(node: ChibireactNode): Fiber | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (isNodeArray(node)) return null // トップレベル配列は未サポート（children では平坦化）
  if (typeof node === 'string' || typeof node === 'number') {
    return createFiber(TEXT_ELEMENT, { nodeValue: String(node) })
  }
  return createFiber(node.type, node.props, node.key ?? null)
}

/**
 * Fiber を作るために「次に処理すべき children」を返します。
 *
 * 関数コンポーネントの場合、ここで関数を呼んで戻り値を 1 個の child として返します。
 * これは Part 1 の render と同じ eager 戦略です。
 * Part 2.4 の work loop で「呼ぶタイミング」を再定義します。
 */
function elementChildren(node: ChibireactNode): readonly ChibireactNode[] {
  if (!isElement(node)) return []
  if (typeof node.type === 'function') {
    const componentProps = { ...node.props, children: node.children }
    const result = (node.type as (p: Record<string, unknown>) => ChibireactNode)(
      componentProps,
    )
    return [result]
  }
  return node.children
}

/**
 * children に混じった配列を再帰的に平坦化するイテレータ。
 * `[a, [b, [c]]]` → `a, b, c` の順で yield。
 */
function* flattenIter(
  nodes: readonly ChibireactNode[],
): IterableIterator<ChibireactNode> {
  for (const n of nodes) {
    if (isNodeArray(n)) {
      yield* flattenIter(n)
    } else {
      yield n
    }
  }
}
