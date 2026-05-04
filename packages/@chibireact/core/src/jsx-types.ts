/**
 * JSX のための TypeScript 型定義（最小版）。
 *
 * Part 1.12 で導入。Part 4 「JSX とビルドツール」で実際の JSX 変換と
 * 一緒に深掘りします。本ファイルでは「どんな HTML 要素が使えるか」と
 * 「コンポーネントの型シグネチャ」だけ用意します。
 */
import type { ChibireactElement, ChibireactNode } from './types'

/**
 * 関数コンポーネントの型シグネチャ。
 * React の `React.FC<Props>` 相当。
 */
export type FunctionComponent<P = Record<string, never>> = (
  props: P & { children?: ChibireactNode | ChibireactNode[] },
) => ChibireactNode

export type FC<P = Record<string, never>> = FunctionComponent<P>

/**
 * 任意の HTML 要素にも付けられる共通 props。
 * React の HTMLAttributes 相当の最小版。
 */
export type CommonHTMLProps = {
  id?: string
  className?: string
  style?: Partial<CSSStyleDeclaration> | Record<string, string | number>
  title?: string
  // イベント (代表的なものだけ)
  onClick?: (event: MouseEvent) => void
  onChange?: (event: Event) => void
  onInput?: (event: InputEvent) => void
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
  // ARIA / data
  [key: `data-${string}`]: string | number | boolean | undefined
  [key: `aria-${string}`]: string | number | boolean | undefined
  // chibireact 固有
  key?: string | number | null
}

/**
 * グローバル JSX 名前空間に IntrinsicElements を提供します。
 * Part 4 で本格的に整備しますが、現時点では「最低限ある」状態に。
 */
declare global {
  namespace JSX {
    type Element = ChibireactElement
    interface IntrinsicElements {
      // テキスト系
      h1: CommonHTMLProps
      h2: CommonHTMLProps
      h3: CommonHTMLProps
      h4: CommonHTMLProps
      h5: CommonHTMLProps
      h6: CommonHTMLProps
      p: CommonHTMLProps
      span: CommonHTMLProps
      // 構造
      div: CommonHTMLProps
      section: CommonHTMLProps
      article: CommonHTMLProps
      header: CommonHTMLProps
      footer: CommonHTMLProps
      main: CommonHTMLProps
      nav: CommonHTMLProps
      aside: CommonHTMLProps
      // リスト
      ul: CommonHTMLProps
      ol: CommonHTMLProps
      li: CommonHTMLProps
      // フォーム
      form: CommonHTMLProps
      input: CommonHTMLProps & {
        type?: string
        value?: string | number
        placeholder?: string
        disabled?: boolean
        checked?: boolean
      }
      textarea: CommonHTMLProps & { value?: string; disabled?: boolean }
      select: CommonHTMLProps & { value?: string; disabled?: boolean }
      option: CommonHTMLProps & { value?: string }
      label: CommonHTMLProps & { htmlFor?: string }
      button: CommonHTMLProps & { type?: 'button' | 'submit' | 'reset'; disabled?: boolean }
      // メディア
      img: CommonHTMLProps & { src?: string; alt?: string; width?: number; height?: number }
      a: CommonHTMLProps & { href?: string; target?: string }
      // その他
      details: CommonHTMLProps & { open?: boolean }
      summary: CommonHTMLProps
      pre: CommonHTMLProps
      code: CommonHTMLProps
      // 必要に応じて追加
    }
  }
}
