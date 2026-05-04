import type { ChibireactNode } from './types'

/**
 * 仮想 DOM 要素を再帰的に DOM ツリーへ変換し、container に追加します。
 *
 * 段階的に機能を追加してきました:
 * - Part 1.4: 骨格（type と children）
 * - Part 1.5: props を DOM 属性として反映
 * - Part 1.6: on... イベントを addEventListener で登録
 * - Part 1.7: null / undefined / boolean / 配列の child を安全に処理
 * - Part 1.8: 関数コンポーネント対応（予定）
 * - Part 1.10: 再レンダリング差分計算（予定）
 */
export function render(node: ChibireactNode, container: HTMLElement | Node): void {
  // null / undefined / boolean は React と同様にスキップ
  // これにより `cond && <Foo />` のような条件付きレンダリングが書ける
  if (node === null || node === undefined || typeof node === 'boolean') {
    return
  }

  // 配列はそれぞれを再帰的に処理（リストレンダリング用）
  if (Array.isArray(node)) {
    for (const item of node) render(item, container)
    return
  }

  // テキストノード（文字列・数値）
  if (typeof node === 'string' || typeof node === 'number') {
    container.appendChild(document.createTextNode(String(node)))
    return
  }

  // 関数コンポーネントは未対応（Part 1.8 で追加）
  if (typeof node.type !== 'string') {
    throw new Error(
      'chibireact: function components are not yet supported (will be added in Part 1.8).',
    )
  }

  // HTML 要素を生成
  const dom = document.createElement(node.type)

  // props を反映
  applyProps(dom, node.props)

  // 子要素を再帰的に処理
  for (const child of node.children) {
    render(child, dom)
  }

  // container に追加
  container.appendChild(dom)
}

/**
 * `on` で始まり、次が大文字（onClick など）の prop を
 * イベントハンドラとして識別します。
 * `onclick`（小文字）や `open`（on 始まりではない）は弾きます。
 */
function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key)
}

/**
 * onClick → 'click', onMouseDown → 'mousedown' のように
 * DOM の addEventListener が期待する形式（小文字）に変換します。
 */
function getEventName(key: string): string {
  return key.slice(2).toLowerCase()
}

/**
 * 仮想 DOM の props を実 DOM の属性 / イベントとして反映します。
 *
 * Part 1.5 で属性反映、Part 1.6 でイベント反映を追加しました。
 */
function applyProps(dom: HTMLElement, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') continue

    // イベントハンドラ (Part 1.6)
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

    // null / undefined はスキップ
    if (value == null) continue

    // 文字列・数値・真偽値は属性として設定
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
