import type { ChibireactNode } from './types'

/**
 * Context API の最小実装 (Part 3.6)。
 *
 * `createContext(defaultValue)` で `{ _defaultValue, Provider }` を返す。
 * Provider は **特殊な関数コンポーネント**: props.value をフィブツリー上に置き、
 * 子孫の useContext がツリーを遡って参照する。
 *
 * 設計の核:
 *   - Provider 自体は render 中に value をどこにも保存しない
 *   - useContext が呼ばれた瞬間に、fiber.parent を辿って **同じ Provider 関数を type に持つ最も近い祖先** を探す
 *   - その祖先の props.value を返す。見つからなければ defaultValue
 *
 * シンプルだが正しく動く: Provider が UPDATE で value を変えれば、子孫は次回 render 時に
 * 自動的に新値を読む。
 */

export type ContextProvider<T> = (props: {
  value: T
  children?: unknown
}) => ChibireactNode

export type Context<T> = {
  /** Provider に value が指定されない場合に useContext が返す値。 */
  _defaultValue: T
  /** ツリーに value を流し込む特殊な関数コンポーネント。type 同一性で識別される。 */
  Provider: ContextProvider<T>
}

/**
 * Context オブジェクトを作る。同じ Context は **1 つだけ** 作って共有するのが正解。
 *
 * @example
 *   const ThemeContext = createContext('light')
 *   // 1 つの module で export し、Provider と useContext 両方からこの参照を使う。
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const context = {
    _defaultValue: defaultValue,
    Provider: undefined as unknown as ContextProvider<T>,
  } as Context<T>

  // Provider は「children を流すだけ」のシンプルな関数コンポーネント。
  // 値の保管は不要 (useContext が fiber tree を辿って取りに行く)。
  context.Provider = function ContextProvider(props) {
    // 関数コンポーネントは ChibireactNode を返す契約。children をそのまま返す。
    return (props.children ?? null) as ChibireactNode
  }

  return context
}
