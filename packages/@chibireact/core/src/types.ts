/**
 * chibireact における仮想 DOM ノードの型定義。
 *
 * 本書の進行に合わせて段階的に拡張されます:
 * - Part 1.3: createElement で生成される基本形（ここ）
 * - Part 1.6: イベントハンドラ用の props 型を追加
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
 * 文字列・数値はそのまま保持し、Renderer 側でテキストノード化します。
 */
export type ChibireactNode = ChibireactElement | string | number
