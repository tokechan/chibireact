import { createElement } from './create-element'
import type { ChibireactElement, ChibireactNode } from './types'

/**
 * 最小 React Server Components (RSC) 実装 (Part 7 / 付録 A.4)。
 *
 * RSC のエッセンス:
 *   1. **Server Component**: サーバ側でだけ実行される。async が許され、DB やファイルを直接読める。
 *      useState/useEffect は使えない (state を持てない)。
 *   2. **Client Component**: クライアント側で実行される普通の React コンポ。
 *      サーバ→クライアントの境界で **"Client Reference"** に置き換わる。
 *   3. **Payload**: server で生成される JSON-like 表現。client がこれを受け取って描画する。
 *
 * 本書実装:
 *   - server: `renderToRSCPayload(element)` で element tree を payload に
 *   - client: registerClientComponent で参照を登録 → `payloadToElement(payload)` で復元
 *   - 双方シリアライズ可能 (JSON.stringify 互換)
 *
 * 制限 (本書スコープ外):
 *   - 本家 React の "Flight" バイナリ形式
 *   - Streaming SSR
 *   - 同一プロセス内 server↔client 切り替え (本書はメモリ内デモ)
 *   - 関数 props のシリアライズ (本家もできない、Server Action で対応)
 */

// ============================================================
// Payload 型
// ============================================================

export type RSCPayload =
  | string
  | number
  | boolean
  | null
  | RSCElementPayload
  | RSCClientReferencePayload
  | RSCPayload[]

export type RSCElementPayload = {
  $$typeof: 'host'
  type: string
  props: Record<string, unknown>
  children: RSCPayload[]
}

export type RSCClientReferencePayload = {
  $$typeof: 'client-ref'
  /** registerClientComponent で登録された名前 */
  ref: string
  props: Record<string, unknown>
  children: RSCPayload[]
}

// ============================================================
// Server-side: element → payload
// ============================================================

/**
 * Element tree を RSC payload に変換します (server-side で実行する想定)。
 *
 * - 文字列・数値: そのまま payload に
 * - 関数 (Server Component): 呼び出して await、結果を再帰的に payload 化
 * - ClientReference: そのまま参照として serialize
 * - host element: { $$typeof: 'host', type, props, children: ... }
 */
export async function renderToRSCPayload(
  node: ChibireactNode,
): Promise<RSCPayload> {
  if (node === null || node === undefined || node === false || node === true) {
    return null
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return node
  }
  if (Array.isArray(node)) {
    const out: RSCPayload[] = []
    for (const c of node) {
      const p = await renderToRSCPayload(c)
      if (p !== null) out.push(p)
    }
    return out
  }

  // ChibireactElement
  const el = node as ChibireactElement

  // Client Reference
  if (
    typeof el.type === 'function' &&
    (el.type as { $$clientRef?: string }).$$clientRef !== undefined
  ) {
    const ref = (el.type as { $$clientRef: string }).$$clientRef
    return {
      $$typeof: 'client-ref',
      ref,
      props: el.props,
      children: await Promise.all(el.children.map(renderToRSCPayload)),
    }
  }

  // Server Component (関数): 呼び出して結果を payload 化
  if (typeof el.type === 'function') {
    const componentProps = { ...el.props, children: el.children }
    const result = await (
      el.type as (p: Record<string, unknown>) => ChibireactNode | Promise<ChibireactNode>
    )(componentProps)
    return renderToRSCPayload(result)
  }

  // Host element
  return {
    $$typeof: 'host',
    type: el.type,
    props: serializableProps(el.props),
    children: await Promise.all(el.children.map(renderToRSCPayload)),
  }
}

/** 関数 props (イベントハンドラ等) は serialize できないので除去。 */
function serializableProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'function') continue // skip
    out[k] = v
  }
  return out
}

// ============================================================
// Client-side: registry + payload → element
// ============================================================

const clientRegistry = new Map<string, Function>()

/**
 * Client Component を name で登録します。
 * 同じ名前で server / client が共有することで、Reference 解決ができます。
 */
export function registerClientComponent(name: string, fn: Function): void {
  clientRegistry.set(name, fn)
}

/**
 * Client Component に印を付けます。`renderToRSCPayload` がこれを Reference として
 * シリアライズし、`payloadToElement` で再解決します。
 *
 * @example
 *   const Counter = markAsClientComponent('Counter', function Counter() { ... })
 *   registerClientComponent('Counter', Counter)
 */
export function markAsClientComponent<F extends Function>(
  name: string,
  fn: F,
): F {
  ;(fn as unknown as { $$clientRef: string }).$$clientRef = name
  return fn
}

/**
 * @internal テスト用: registry をクリア
 */
export function _clearClientRegistry(): void {
  clientRegistry.clear()
}

/**
 * RSC payload を ChibireactElement (or 文字列) に復元します (client-side)。
 */
export function payloadToElement(payload: RSCPayload): ChibireactNode {
  if (payload === null) return null
  if (typeof payload === 'string' || typeof payload === 'number') return payload
  if (typeof payload === 'boolean') return null
  if (Array.isArray(payload)) {
    return payload.map(payloadToElement) as ChibireactNode
  }

  if (payload.$$typeof === 'host') {
    return createElement(
      payload.type,
      payload.props,
      ...payload.children.map(payloadToElement),
    )
  }
  if (payload.$$typeof === 'client-ref') {
    const fn = clientRegistry.get(payload.ref)
    if (!fn) {
      throw new Error(
        `Client component "${payload.ref}" not registered. Call registerClientComponent first.`,
      )
    }
    return createElement(
      fn,
      payload.props,
      ...payload.children.map(payloadToElement),
    )
  }
  return null
}
