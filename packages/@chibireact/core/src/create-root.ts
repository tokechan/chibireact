import type { ChibireactNode } from './types'
import { runFiberRoot } from './work-loop'
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
 * 進化の歴史:
 *   - Part 1.1 〜 1.4: 同期的な再帰 render (Stack reconciler 相当)
 *   - Part 1.9: useState と連動 → setState で `container.innerHTML=''` + 再描画
 *   - Part 2.7: **Fiber 版 work loop に乗せ替え**。
 *     - render phase / commit phase 分離 → DOM identity が保たれる
 *     - 二重バッファで前回ツリーと diff、変更箇所のみ DOM 操作
 *     - useState の setState は引き続き `_rerender()` を呼ぶが、その実体が runFiberRoot
 *
 * **本章での選択**: 内部で `runFiberRoot` (同期版) を使う。`scheduleFiberRoot` (RIC 版) でも
 * 同じ DOM 結果になるが、テスト・教育目的のため同期で完結させる。
 * 本番では `scheduleFiberRoot` 経由のラッパを書けば中断可能な描画になる。
 */
export function createRoot(container: HTMLElement): Root {
  let lastElement: ChibireactNode | null = null

  const rerender = (): void => {
    if (lastElement === null) return
    _resetHooks(rerender)
    runFiberRoot(lastElement, container)
  }

  return {
    render(element: ChibireactNode): void {
      lastElement = element
      _resetHooks(rerender)
      runFiberRoot(element, container)
    },
  }
}
