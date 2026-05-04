import type { ChibireactNode } from './types'
import { render as renderToContainer } from './render'

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
 * Part 1.1 で API の骨格、Part 1.4 で実際の描画ロジックが繋がりました。
 *
 * @example
 *   const root = createRoot(document.getElementById('app')!)
 *   root.render({ type: 'h1', props: {}, children: ['Hello'] })
 */
export function createRoot(container: HTMLElement): Root {
  return {
    render(element: ChibireactNode): void {
      renderToContainer(element, container)
    },
  }
}
