import type { Fiber, Hook } from './fiber'

/**
 * useState の per-fiber 実装 (Part 3.2)。
 *
 * 進化の歴史:
 *   - Part 1.9 : モジュール状態 1 配列に全 hook を詰めていた → 複数の関数コンポで混線
 *   - Part 1.10: queueMicrotask によるバッチング追加 (これは流用)
 *   - Part 3.2 : hook を **Fiber 単位** に紐付け、混線を解消
 *
 * 設計:
 *   - work loop が関数 fiber を処理する直前に `setWipFiber(fiber)` を呼ぶ
 *   - useState は wipFiber.hooks[hookIndex] を読み書きする
 *   - 再 render 時は work-loop 側で `fiber.hooks = [...fiber.alternate.hooks]` 済
 *     → 同じ Hook オブジェクトを共有しているので setState の mutation が次回 render に伝わる
 *
 * Rules of Hooks の根拠 (3.1 で説明):
 *   - useState の呼び出し順序 = hook 配列のインデックス
 *   - 条件分岐の中で呼ぶとインデックスがズレて状態が混ざる
 */

let wipFiber: Fiber | null = null
let hookIndex = 0
let _rerender: (() => void) | null = null
let _scheduled = false

export type SetStateAction<T> = T | ((prev: T) => T)
export type Dispatch<T> = (action: SetStateAction<T>) => void

/**
 * 状態を持てる関数を提供します。React の useState と同じ API です。
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
  if (wipFiber === null) {
    throw new Error(
      'useState can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  if (fiber.hooks[index] === undefined) {
    fiber.hooks[index] = { state: initial } as Hook
  }
  const hook = fiber.hooks[index] as Hook<T>

  const setState: Dispatch<T> = (action) => {
    const next =
      typeof action === 'function'
        ? (action as (prev: T) => T)(hook.state)
        : action
    if (Object.is(hook.state, next)) return
    hook.state = next
    _scheduleRerender()
  }

  return [hook.state, setState]
}

/**
 * 同じ tick の複数 setState を 1 回の再レンダにまとめます (Part 1.10)。
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
 * work-loop から呼ばれる: 「これから処理する関数 fiber」を伝える。
 * useState はこの fiber.hooks に対して読み書きする。
 */
export function setWipFiber(fiber: Fiber): void {
  wipFiber = fiber
  hookIndex = 0
}

/**
 * @internal
 * createRoot から呼ばれる: setState 時に呼ぶ rerender 関数を保持する。
 */
export function _resetHooks(rerender: () => void): void {
  _rerender = rerender
  // wipFiber / hookIndex は work-loop が fiber ごとに setWipFiber でリセットする
}

/**
 * @internal
 * テスト用: 全 dispatcher 状態をクリア。Fiber 上の hooks は別途リセットが必要。
 */
export function _clearHooksForTesting(): void {
  wipFiber = null
  hookIndex = 0
  _rerender = null
  _scheduled = false
}
