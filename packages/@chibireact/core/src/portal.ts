import type { ChibireactElement, ChibireactNode } from './types'

/**
 * Portal の型 sentinel (Part 5.6)。
 * fiber.type === PORTAL の fiber は「DOM を別 container に描画する」特別扱い。
 */
export const PORTAL = '__PORTAL__' as const

/**
 * 子要素を **DOM ツリー上の別の場所** に描画する API (Part 5.6)。
 *
 * 典型用途:
 *   - Modal / Dialog (overflow:hidden や z-index の影響を逃れたい)
 *   - Tooltip / Popover (絶対位置で document.body 直下に置きたい)
 *   - Toast / Notification
 *
 * 仕組み:
 *   - createPortal は **特殊な型 (PORTAL) の element** を返す
 *   - work-loop で Portal fiber は `dom = container` を持つ "境界" として振る舞う
 *   - 子の DOM は **portal の container** に append される (普通の親 DOM ではない)
 *   - portal 自身は parent DOM に append されない (container は既に document に存在する想定)
 *
 * @example
 *   const Modal = () => {
 *     return createPortal(
 *       createElement('div', { className: 'modal' }, 'Hello'),
 *       document.body,
 *     )
 *   }
 */
export function createPortal(
  children: ChibireactNode,
  container: HTMLElement,
): ChibireactElement {
  return {
    type: PORTAL as unknown as string,
    props: { container },
    children: [children],
    key: null,
  }
}
