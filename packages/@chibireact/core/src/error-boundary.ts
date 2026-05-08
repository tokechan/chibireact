import type { ChibireactNode } from './types'

/**
 * Error Boundary コンポーネント (Part 5.5)。
 *
 * 仕組み:
 *   - 通常レンダ時: children を素通り
 *   - 子孫が **Error を throw** すると work-loop がキャッチ
 *     → 最も近い ErrorBoundary 祖先を見つけ、fiber.error にエラーをセットして fallback を表示
 *
 * Suspense との違い:
 *   - Suspense は Promise を捕まえる
 *   - ErrorBoundary は Error (or 任意の non-Promise 値) を捕まえる
 *
 * 識別: 関数参照同一性で判定する (Suspense と同じパターン)。
 */

export type ErrorBoundaryProps = {
  fallback: ChibireactNode | ((error: unknown) => ChibireactNode)
  children?: unknown
}

export function ErrorBoundary(props: ErrorBoundaryProps): ChibireactNode {
  return (props.children ?? null) as ChibireactNode
}
