/**
 * chibireact における仮想 DOM ノードの型定義。
 *
 * 本書の進行に合わせて段階的に拡張されます:
 * - Part 1.3: createElement で生成される基本形（element / string / number）
 * - Part 1.7: null / undefined / boolean / 配列を含めて render が安全に処理可能に
 * - Part 2:   Fiber Node に拡張
 * - Part 3:   Hook list を保持できるように
 */

/** 通常の要素ノード（HTML 要素または関数コンポーネント） */
export type ChibireactElement = {
  type: string | Function
  props: Record<string, unknown>
  children: ChibireactNode[]
}

/**
 * children に入れられる値。
 *
 * - element: createElement で生成したオブジェクト
 * - string / number: テキストノード
 * - boolean / null / undefined: 描画時にスキップ（条件付きレンダリングを書きやすくするため）
 * - 配列: 中身を再帰的に処理（list rendering 用）
 */
export type ChibireactNode =
  | ChibireactElement
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly ChibireactNode[]
