import type { Fiber } from './fiber'
import { TEXT_ELEMENT } from './fiber'

/**
 * 簡易デバッグツール (Part 6.5)。
 *
 * 自前 React である chibireact の Fiber tree を文字列にダンプする最小実装。
 * 本家 React DevTools のような GUI ではなく、コンソールに木を出すだけ。
 * それでも「どんな fiber tree ができているか」が見えると学習効率が劇的に上がる。
 */

/**
 * Fiber 1 つを 1 行の文字列に。type と主要な props を出す。
 */
function fiberToLine(fiber: Fiber): string {
  let label: string
  if (fiber.type === TEXT_ELEMENT) {
    label = `"${String(fiber.props.nodeValue ?? '')}"`
  } else if (typeof fiber.type === 'function') {
    label = `<${fiber.type.name || 'Anonymous'} />`
  } else if (typeof fiber.type === 'string') {
    label = fiber.type
  } else {
    label = '???'
  }

  const tags: string[] = []
  if (fiber.effectTag) tags.push(fiber.effectTag)
  if (fiber.suspended) tags.push('suspended')
  if (fiber.error !== undefined) tags.push(`error:${String(fiber.error)}`)
  if (fiber.key !== null && fiber.key !== undefined) {
    tags.push(`key=${JSON.stringify(fiber.key)}`)
  }

  return tags.length > 0 ? `${label}  [${tags.join(', ')}]` : label
}

/**
 * Fiber tree をインデント付きの文字列にダンプする。
 *
 * @example
 *   const tree = dumpFiberTree(currentRoot)
 *   console.log(tree)
 *
 *   // 出力例:
 *   // <App />
 *   //   div
 *   //     <Counter />
 *   //       button  [UPDATE]
 *   //         "0"
 */
export function dumpFiberTree(root: Fiber | null, indent = 0): string {
  if (root === null) return ''
  const lines: string[] = []
  walk(root, indent, lines)
  return lines.join('\n')
}

function walk(fiber: Fiber, depth: number, out: string[]): void {
  out.push('  '.repeat(depth) + fiberToLine(fiber))
  if (fiber.child) walk(fiber.child, depth + 1, out)
  if (fiber.sibling) walk(fiber.sibling, depth, out)
}

/**
 * Fiber tree から fiber を 1 つだけ探す (条件マッチ)。
 *
 * @example
 *   const counterFiber = findFiber(root, f => f.type === Counter)
 */
export function findFiber(
  root: Fiber | null,
  predicate: (f: Fiber) => boolean,
): Fiber | null {
  if (root === null) return null
  if (predicate(root)) return root
  if (root.child) {
    const found = findFiber(root.child, predicate)
    if (found) return found
  }
  if (root.sibling) {
    const found = findFiber(root.sibling, predicate)
    if (found) return found
  }
  return null
}

/**
 * Fiber tree のサマリー (深さ・ノード数・関数コンポ数) を返す。
 */
export function fiberStats(root: Fiber | null): {
  depth: number
  total: number
  hostElements: number
  functionComponents: number
  textNodes: number
} {
  let depth = 0
  let total = 0
  let hostElements = 0
  let functionComponents = 0
  let textNodes = 0

  function walk(f: Fiber, d: number): void {
    depth = Math.max(depth, d)
    total++
    if (f.type === TEXT_ELEMENT) textNodes++
    else if (typeof f.type === 'function') functionComponents++
    else if (typeof f.type === 'string') hostElements++
    if (f.child) walk(f.child, d + 1)
    if (f.sibling) walk(f.sibling, d)
  }

  if (root) walk(root, 0)
  return { depth, total, hostElements, functionComponents, textNodes }
}
