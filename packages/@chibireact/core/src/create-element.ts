import type { ChibireactElement, ChibireactNode } from './types'

/**
 * 仮想 DOM 要素 (ChibireactElement) を生成します。
 * React の `React.createElement` 相当ですが、children を props 内ではなく
 * トップレベルの `children` フィールドに保持する設計を採っています
 * （教育目的の単純化）。
 *
 * Part 1.11 で `key` を props から取り出してトップレベル `element.key` に
 * 配置するようになりました。
 *
 * JSX `<h1 className="title">Hello</h1>` は Babel/SWC によって
 * `createElement('h1', { className: 'title' }, 'Hello')` に変換されます
 * （詳しくは Part 4「JSX とビルドツール」で扱います）。
 *
 * @param type      タグ名 (`'h1'` など) または関数コンポーネント
 * @param props     属性のオブジェクト。null/undefined は空オブジェクトに正規化。
 *                  `key` プロパティはトップレベルに昇格して props からは除去。
 * @param children  可変長で受け取り、配列にまとめます
 *
 * @example
 *   createElement('h1', { className: 'title' }, 'Hello')
 *   // → { type: 'h1', props: { className: 'title' }, children: ['Hello'] }
 *
 *   createElement('li', { key: 'item-1' }, 'Item')
 *   // → { type: 'li', props: {}, children: ['Item'], key: 'item-1' }
 */
export function createElement(
  type: string | Function,
  props: Record<string, unknown> | null | undefined,
  ...children: ChibireactNode[]
): ChibireactElement {
  const safeProps = { ...(props ?? {}) }
  let key: string | number | null | undefined

  // key は React と同様、props から分離してトップレベルへ
  if ('key' in safeProps) {
    const k = safeProps.key
    if (k != null) {
      key = k as string | number
    }
    delete safeProps.key
  }

  return {
    type,
    props: safeProps,
    children,
    key: key ?? null,
  }
}
