/**
 * useState の最小実装（Part 1.9）+ バッチング（Part 1.10）。
 *
 * 設計（暫定）:
 * - **ルートごとに 1 配列の hooks**（_rootHooks）をモジュール状態で持つ
 * - 各 render 開始前に index を 0 にリセット
 * - useState 呼び出しごとに index++ し、対応する箱から状態を読む
 * - setState は新値を保存して、**queueMicrotask で再レンダをバッチング**
 *
 * バッチング (Part 1.10):
 * - 同じ tick 内で複数 setState を呼んでも、再レンダは 1 回だけ
 * - React 18 の automatic batching 相当の最小実装
 *
 * 制限:
 * - 複数の関数コンポーネントが配列を共有
 *   → Part 2 (Fiber) で per-fiber に修正
 * - 1 ルート前提
 * - Hooks のルールに依存
 */

type Hook<T = unknown> = { state: T }

let _rootHooks: Hook[] = []
let _index = 0
let _rerender: (() => void) | null = null
let _scheduled = false

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
    _scheduleRerender()
  }

  return [hook.state, setState]
}

/**
 * 同じ tick の複数 setState を 1 回の再レンダにまとめます (Part 1.10)。
 * React 18 の automatic batching 相当の最小実装。
 */
function _scheduleRerender(): void {
  if (_scheduled) return
  _scheduled = true
  queueMicrotask(() => {
    _scheduled = false
    _rerender?.()
  })
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
  _scheduled = false
}
