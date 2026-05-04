import type { ChibireactNode } from './types'
import { render as renderToContainer } from './render'
import { _resetHooks } from './hooks-state'

/**
 * createRoot が返す root オブジェクトの API。
 * 本書では React 18+ の `ReactDOM.createRoot()` 相当を作っていきます。
 */
export type Root = {
  /** element を container に描画します。 */
  render(element: ChibireactNode): void
}

/**
 * container DOM 要素を渡すと、render メソッドを持つ root オブジェクトを返します。
 *
 * Part 1.9 で useState と連動: setState 時にこの container と element で再レンダします。
 * 再レンダの戦略は「container をクリアして全部描き直す」という最小実装。
 * 差分計算は Part 1.10、Fiber は Part 2 で扱います。
 */
export function createRoot(container: HTMLElement): Root {
  let lastElement: ChibireactNode | null = null

  const rerender = (): void => {
    if (lastElement === null) return
    container.innerHTML = ''
    _resetHooks(rerender)
    renderToContainer(lastElement, container)
  }

  return {
    render(element: ChibireactNode): void {
      lastElement = element
      container.innerHTML = ''
      _resetHooks(rerender)
      renderToContainer(element, container)
    },
  }
}
