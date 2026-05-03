import type { ChibireactNode } from './types'

/**
 * 仮想 DOM 要素を再帰的に DOM ツリーへ変換し、container に追加します。
 *
 * Part 1.4 の最小実装: type と children のみ対応。
 * - props の DOM 属性反映は Part 1.5 で追加
 * - イベントハンドラは Part 1.6 で追加
 * - 関数コンポーネントは Part 1.8 で追加
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

  // 子要素を再帰的に処理
  for (const child of element.children) {
    render(child, dom)
  }

  // container に追加
  container.appendChild(dom)
}
