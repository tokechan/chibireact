import type { ChibireactNode } from './types'

/**
 * 仮想 DOM 要素を再帰的に DOM ツリーへ変換し、container に追加します。
 *
 * Part 1.4 で骨格、Part 1.5 で props 反映を追加しました。
 * - 関数コンポーネント: Part 1.8 で対応
 * - イベントハンドラ: Part 1.6 で対応
 *
 * 既存の container 内容はクリアしません（複数回呼び出すと append されます）。
 * 再レンダリング時の差分適用は Part 1.10 で実装します。
 */
export function render(element: ChibireactNode, container: HTMLElement | Node): void {
  // テキストノード（文字列・数値）
  if (typeof element === 'string' || typeof element === 'number') {
    container.appendChild(document.createTextNode(String(element)))
    return
  }

  // 関数コンポーネントは未対応（Part 1.8 で追加）
  if (typeof element.type !== 'string') {
    throw new Error(
      'chibireact: function components are not yet supported (will be added in Part 1.8).',
    )
  }

  // HTML 要素を生成
  const dom = document.createElement(element.type)

  // props を DOM 属性として反映（Part 1.5）
  applyProps(dom, element.props)

  // 子要素を再帰的に処理
  for (const child of element.children) {
    render(child, dom)
  }

  // container に追加
  container.appendChild(dom)
}

/**
 * 仮想 DOM の props を実 DOM の属性として反映します。
 *
 * Part 1.5 の最小実装:
 * - className → dom.className（HTML の予約語回避）
 * - style (object) → dom.style への代入
 * - その他の文字列・数値・真偽値 → setAttribute
 *
 * Part 1.6 で `on...` (関数) のイベント対応を追加します。
 */
function applyProps(dom: HTMLElement, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    // children プロパティは render 側で別管理しているので念のため除外
    if (key === 'children') continue

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

    // 関数 (events) は Part 1.6 で対応する
  }
}
