import type { ChibireactNode } from './types'

/**
 * Suspense コンポーネント (Part 5.4)。
 *
 * 仕組み:
 *   - 通常レンダ時: children をそのまま返す (Provider と同じく "素通り")
 *   - 子孫が **Promise を throw** すると、work-loop がそれをキャッチ
 *     → 最も近い Suspense 祖先を見つけ、`fiber.suspended = true` にして fallback を表示
 *     → Promise が resolve したら自動で再 render され、children を再試行
 *
 * 識別: Suspense は **関数参照の同一性** で識別される (createContext の Provider と同じ)
 */
export function Suspense(props: {
  fallback: ChibireactNode
  children?: unknown
}): ChibireactNode {
  return (props.children ?? null) as ChibireactNode
}

/**
 * 「これは Suspense fiber です」を判定するためのマーカー。
 * 関数参照同一性で十分なので、特別な値は持たない。
 */
