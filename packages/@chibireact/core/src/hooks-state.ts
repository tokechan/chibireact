/**
 * useState の最小実装。
 *
 * 設計（Part 1.9 暫定版）:
 * - **ルートごとに 1 配列の hooks**（_rootHooks）をモジュール状態で持つ
 * - 各 render 開始前に index を 0 にリセット
 * - useState 呼び出しごとに index++ し、対応する箱から状態を読む
 * - setState は新値を保存して _rerender() を呼ぶ
 *
 * この実装の制限:
 * - **複数の関数コンポーネントが useState を使うと配列を共有してしまう**
 *   → Part 1.10 で再レンダ機構を整理し、Part 2 (Fiber) で per-fiber に修正
 * - 1 ルート前提（複数 createRoot しても同じ配列を使う）
 * - 「Hooks のルール」（条件分岐内で呼ばない）に依存
 *
 * 制限はあるものの、`<Counter />` が動くという「最小の useState」を体験するには十分。
 */

type Hook<T = unknown> = { state: T }

let _rootHooks: Hook[] = []
let _index = 0
let _rerender: (() => void) | null = null

export type SetStateAction<T> = T | ((prev: T) => T)
export type Dispatch<T> = (action: SetStateAction<T>) => void

/**
 * 状態を持てる関数を提供します。React の useState と同じ API です。
 *
 * @param initial 初回レンダ時の初期値
 * @returns [現在の状態, 状態を更新する関数]
 *
 * @example
 *   const Counter = () => {
 *     const [count, setCount] = useState(0)
 *     return createElement('button',
 *       { onClick: () => setCount(c => c + 1) },
 *       count,
 *     )
 *   }
 */
export function useState<T>(initial: T): [T, Dispatch<T>] {
  const index = _index++

  if (_rootHooks[index] === undefined) {
    _rootHooks[index] = { state: initial }
  }

  const hook = _rootHooks[index] as Hook<T>

  const setState: Dispatch<T> = (action) => {
    const next =
      typeof action === 'function'
        ? (action as (prev: T) => T)(hook.state)
        : action
    if (Object.is(hook.state, next)) return // 同じ値ならスキップ
    hook.state = next
    _rerender?.()
  }

  return [hook.state, setState]
}

/**
 * @internal
 * createRoot から呼ばれる。各 render の前に hook index をリセットし、
 * setState 時の再レンダ関数を保持する。
 */
export function _resetHooks(rerender: () => void): void {
  _index = 0
  _rerender = rerender
}

/**
 * @internal
 * テスト用: 全 hooks 状態をクリアする。
 * 通常コードからは呼ばない。
 */
export function _clearHooksForTesting(): void {
  _rootHooks = []
  _index = 0
  _rerender = null
}
