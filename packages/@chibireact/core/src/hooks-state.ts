import type {
  EffectHook,
  Fiber,
  Hook,
  MemoHook,
  RefHook,
  StateHook,
} from './fiber'
import type { Context } from './context'

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
export type Reducer<S, A> = (state: S, action: A) => S

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
    fiber.hooks[index] = { kind: 'state', state: initial } as Hook
  }
  const hook = fiber.hooks[index] as StateHook<T>

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
 * 状態更新ロジックを reducer (state, action) => newState に外出しできる useState の仲間 (Part 3.3)。
 *
 * useState との違い:
 *   - 状態遷移を関数として表現できるので、複雑なロジックが整理しやすい
 *   - dispatch(action) が返り、action は任意の型 (typically discriminated union)
 *
 * @example
 *   type Action = { type: 'inc' } | { type: 'dec' }
 *   const reducer = (s: number, a: Action) =>
 *     a.type === 'inc' ? s + 1 : s - 1
 *   const [count, dispatch] = useReducer(reducer, 0)
 *   dispatch({ type: 'inc' })  // count → 1
 */
export function useReducer<S, A>(
  reducer: Reducer<S, A>,
  initial: S,
): [S, (action: A) => void] {
  if (wipFiber === null) {
    throw new Error(
      'useReducer can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  if (fiber.hooks[index] === undefined) {
    fiber.hooks[index] = { kind: 'state', state: initial } as Hook
  }
  const hook = fiber.hooks[index] as StateHook<S>

  const dispatch = (action: A): void => {
    const next = reducer(hook.state, action)
    if (Object.is(hook.state, next)) return
    hook.state = next
    _scheduleRerender()
  }

  return [hook.state, dispatch]
}

/**
 * 副作用を commit phase 後に実行する hook (Part 3.4)。
 *
 * 仕様:
 *   - render 時は effect を fiber.hooks に「予約」するだけ（ここでは走らない）
 *   - commit phase の最後に「pendingCommit が立っている effect」を実行
 *   - 依存配列 `deps` が前回と変わっていなければスキップ
 *   - `deps` 省略 → 毎 commit 後に走る
 *   - `deps = []` → 初回のみ走る
 *   - effect が cleanup 関数を return すれば、次 effect 前 / unmount 時に呼ばれる
 *
 * @example
 *   useEffect(() => {
 *     const id = setInterval(tick, 1000)
 *     return () => clearInterval(id)
 *   }, [])  // mount 時のみ走り、unmount で cleanup
 */
export function useEffect(
  effect: () => void | (() => void),
  deps?: readonly unknown[],
): void {
  if (wipFiber === null) {
    throw new Error(
      'useEffect can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  const oldHook = fiber.hooks[index] as EffectHook | undefined
  const hasChanged =
    !oldHook || deps === undefined || depsChanged(oldHook.deps, deps)

  fiber.hooks[index] = {
    kind: 'effect',
    tag: 'passive',
    effect,
    cleanup: oldHook?.cleanup,
    deps,
    pendingCommit: hasChanged,
  } satisfies EffectHook
}

/**
 * commit 直後の同期タイミングで副作用を走らせる hook (Part 3.5)。
 *
 * useEffect との違い:
 *   - 本家 React: useLayoutEffect は sync（DOM 更新前にユーザーが見るペイントの直前）、
 *                  useEffect は async（ペイント後）
 *   - 本書 chibireact: 両方 sync。違いは EffectHook.tag のみ。
 *                      将来 Part 5 で async に分けたいときの拡張点として残す。
 *
 * 用途:
 *   - DOM のサイズや位置を測定して setState する（フリッカー無し）
 *   - layout に影響する DOM 操作を commit と同期で実行
 *
 * @example
 *   const ref = useRef(null)
 *   useLayoutEffect(() => {
 *     const rect = ref.current.getBoundingClientRect()
 *     setSize({ width: rect.width })  // 描画前に確定
 *   }, [])
 */
export function useLayoutEffect(
  effect: () => void | (() => void),
  deps?: readonly unknown[],
): void {
  if (wipFiber === null) {
    throw new Error(
      'useLayoutEffect can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  const oldHook = fiber.hooks[index] as EffectHook | undefined
  const hasChanged =
    !oldHook || deps === undefined || depsChanged(oldHook.deps, deps)

  fiber.hooks[index] = {
    kind: 'effect',
    tag: 'layout',
    effect,
    cleanup: oldHook?.cleanup,
    deps,
    pendingCommit: hasChanged,
  } satisfies EffectHook
}

/**
 * 依存配列の変化を検知。Object.is 比較で 1 つでも違えば true。
 * 長さが違うのも変化。新側 undefined は呼び出し側で別判定。
 */
function depsChanged(
  oldDeps: readonly unknown[] | undefined,
  newDeps: readonly unknown[],
): boolean {
  if (!oldDeps) return true
  if (oldDeps.length !== newDeps.length) return true
  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], newDeps[i])) return true
  }
  return false
}

/**
 * Context の値を読む hook (Part 3.6)。
 *
 * 戦略: 呼ばれた瞬間に wipFiber.parent から祖先を辿り、**type が context.Provider と
 * 一致する最も近い fiber** を探す。見つかればその props.value を、無ければ defaultValue を返す。
 *
 * 制限 (現時点):
 *   - 並び替えに弱い (Provider が同じツリー位置を保つ前提)
 *   - useContext を呼ぶ fiber が parent チェーンを遡れる必要がある
 *   - bailout 最適化なし: Provider の value が変わると子孫全部 re-render する
 *
 * @example
 *   const ThemeContext = createContext('light')
 *   const Toolbar = () => {
 *     const theme = useContext(ThemeContext)
 *     return createElement('div', { className: theme })
 *   }
 *   // Toolbar を <ThemeContext.Provider value="dark"> で包むと theme = 'dark'
 */
export function useContext<T>(context: Context<T>): T {
  if (wipFiber === null) {
    throw new Error(
      'useContext can only be called inside a function component (during render).',
    )
  }
  // hookIndex は進めない (useContext は Hook 配列に箱を持たない最小実装)
  let cursor: Fiber | null = wipFiber.parent
  while (cursor !== null) {
    if (cursor.type === context.Provider) {
      const value = cursor.props.value as T | undefined
      return value !== undefined ? value : context._defaultValue
    }
    cursor = cursor.parent
  }
  return context._defaultValue
}

/**
 * 計算結果を deps に基づいてメモ化する hook (Part 3.7)。
 *
 * - 初回 render: factory を呼び、結果と deps を保存
 * - 2 回目以降:
 *   - deps が変わっていれば factory を再実行して値を更新
 *   - 変わっていなければ前回の値をそのまま返す（参照同一性を保つ）
 *
 * 使い所:
 *   - 重い計算結果を再 render 間で再利用したい
 *   - 子コンポーネントに渡すオブジェクトの参照を安定させたい
 *
 * @example
 *   const sorted = useMemo(() => list.sort(), [list])
 */
export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
  if (wipFiber === null) {
    throw new Error(
      'useMemo can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  const oldHook = fiber.hooks[index] as MemoHook | undefined
  const hasChanged =
    !oldHook || deps === undefined || depsChanged(oldHook.deps, deps)

  const value = hasChanged ? factory() : (oldHook as MemoHook).value
  fiber.hooks[index] = { kind: 'memo', value, deps } satisfies MemoHook
  return value as T
}

/**
 * 関数の参照を deps に基づいて安定させる hook (Part 3.7)。
 * `useMemo(() => fn, deps)` のショートカット。
 *
 * 主な用途: 子コンポーネントへ props として関数を渡すとき、参照が変わると不要な
 * 再描画を引き起こすため固定したい。
 *
 * @example
 *   const handleClick = useCallback(() => doStuff(id), [id])
 *   <Child onClick={handleClick} />
 */
export function useCallback<F extends (...args: never[]) => unknown>(
  fn: F,
  deps?: readonly unknown[],
): F {
  return useMemo(() => fn, deps)
}

/**
 * 再 render 間で同一の `{ current: T }` を保持する hook (Part 3.8)。
 *
 * 特徴:
 *   - 返値の `ref` オブジェクトは初回 render 後ずっと **同じ参照**
 *   - `.current = ...` で書き換えても再 render を起こさない
 *   - 用途: DOM ノードへの参照 / mutable な値の保管 (timer ID, 前回値の覚書 等)
 *
 * @example
 *   const inputRef = useRef<HTMLInputElement | null>(null)
 *   useEffect(() => { inputRef.current?.focus() }, [])
 *   return createElement('input', { ref: inputRef })
 *
 * 注意: 本書 chibireact の createElement は ref props を特別扱いしないので、
 * 自分で `useEffect` 内から DOM を取りに行くなど工夫が必要 (Part 3.9 で深掘り)。
 */
export function useRef<T>(initial: T): { current: T } {
  if (wipFiber === null) {
    throw new Error(
      'useRef can only be called inside a function component (during render).',
    )
  }
  const fiber = wipFiber
  const index = hookIndex++

  if (fiber.hooks[index] === undefined) {
    fiber.hooks[index] = {
      kind: 'ref',
      ref: { current: initial },
    } satisfies RefHook<T>
  }
  return (fiber.hooks[index] as RefHook<T>).ref
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
