import { describe, it, expect } from 'vitest'
import { createElement } from '../src/create-element'
import { buildFiberTree } from '../src/fiber'
import { dumpFiberTree, findFiber, fiberStats } from '../src/dev-tools'

describe('dumpFiberTree', () => {
  it('単純なツリーをインデント付きで出力する', () => {
    const tree = createElement(
      'div',
      null,
      createElement('h1', null, 'Title'),
      createElement('p', null, 'Body'),
    )
    const fiber = buildFiberTree(tree)!
    const output = dumpFiberTree(fiber)

    expect(output).toContain('div')
    expect(output).toContain('h1')
    expect(output).toContain('p')
    expect(output).toContain('"Title"')
    expect(output).toContain('"Body"')
    // インデント
    expect(output).toMatch(/  h1/)
  })

  it('関数コンポーネントは <Name /> 形式で出力', () => {
    const Counter = () => createElement('button', null, 'click')
    const tree = createElement(Counter, null)
    const fiber = buildFiberTree(tree)!
    const output = dumpFiberTree(fiber)

    expect(output).toContain('<Counter />')
  })

  it('key を持つ fiber には key 表示が付く', () => {
    const tree = createElement(
      'ul',
      null,
      createElement('li', { key: 'a' }, 'Apple'),
    )
    const fiber = buildFiberTree(tree)!
    const output = dumpFiberTree(fiber)

    expect(output).toContain('key="a"')
  })
})

describe('findFiber', () => {
  it('述語にマッチする fiber を見つける', () => {
    const Counter = () => createElement('span', null)
    const tree = createElement(
      'div',
      null,
      createElement('h1', null, 'header'),
      createElement(Counter, null),
    )
    const root = buildFiberTree(tree)!

    const counter = findFiber(root, (f) => f.type === Counter)
    expect(counter).not.toBeNull()
    expect(counter?.type).toBe(Counter)
  })

  it('マッチが無ければ null', () => {
    const tree = createElement('div', null)
    const root = buildFiberTree(tree)!
    const result = findFiber(root, (f) => f.type === 'span')
    expect(result).toBeNull()
  })
})

describe('fiberStats', () => {
  it('ノード数 / 深さ / 種類別カウントを返す', () => {
    const Counter = () => createElement('span', null, 'count')
    const tree = createElement(
      'div',
      null,
      createElement('h1', null, 'Title'),
      createElement(Counter, null),
    )
    const root = buildFiberTree(tree)!

    const stats = fiberStats(root)
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.functionComponents).toBe(1) // Counter
    expect(stats.hostElements).toBeGreaterThanOrEqual(3) // div, h1, span
    expect(stats.textNodes).toBeGreaterThanOrEqual(2) // 'Title' と 'count'
    expect(stats.depth).toBeGreaterThan(0)
  })

  it('null root では全カウント 0', () => {
    const stats = fiberStats(null)
    expect(stats).toEqual({
      depth: 0,
      total: 0,
      hostElements: 0,
      functionComponents: 0,
      textNodes: 0,
    })
  })
})
