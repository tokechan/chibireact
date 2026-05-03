/**
 * 仮想 DOM ノード（最小定義）。
 * Part 1.3 で createElement を実装する際に拡張します。
 */
export type ChibireactNode =
  | {
      type: string | Function
      props: Record<string, unknown>
      children: ChibireactNode[]
    }
  | string
  | number

/**
 * createRoot が返す root オブジェクトの API。
 * 本書では React 18+ の `ReactDOM.createRoot()` 相当を作っていきます。
 */
export type Root = {
  /** element を container に描画する。実装は 1.4「単純な再帰的レンダラー」で。 */
  render(element: ChibireactNode): void
}

/**
 * container DOM 要素を渡すと、render メソッドを持つ root オブジェクトを返します。
 *
 * この章では API の骨格のみを作ります。
 * 実際の描画ロジックは Part 1.4「単純な再帰的レンダラー」で実装します。
 *
 * @example
 *   const root = createRoot(document.getElementById('app')!)
 *   root.render({ type: 'h1', props: {}, children: ['Hello'] })
 */
export function createRoot(container: HTMLElement): Root {
  // この章では container を保持するだけ。次章以降で実際の処理を追加していきます。
  void container

  return {
    render(_element: ChibireactNode): void {
      // 最小骨格: 何もしない。1.4 で実装します。
    },
  }
}
