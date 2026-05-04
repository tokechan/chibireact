import { describe, it, expect } from 'vitest'
import { buildFiberTree, TEXT_ELEMENT } from '../src/fiber'
import { createElement } from '../src/create-element'
import type { Fiber } from '../src/fiber'

/**
 * Part 2.3 の Fiber データ構造のテスト。
 *
 * Fiber は React の中核データ構造。Part 1 では vDOM を再帰で辿っていたが、
 * 2.3 ではそのツリーを linked-list (parent / child / sibling) で表現する。
 * まだ work loop には組み込まない（次章 2.4 で接続）。
 */
describe('Fiber: 単一ノード', () => {
  it('HTML element から Fiber を作ると type / props / key が保存される', () => {
    const element = createElement('h1', { className: 'title' }, 'Hello')
    const fiber = buildFiberTree(element)!

    expect(fiber.type).toBe('h1')
    expect(fiber.props.className).toBe('title')
    expect(fiber.key).toBeNull()
  })

  it('単一ノードの parent / sibling は null になる', () => {
    const fiber = buildFiberTree(createElement('div', null))!

    expect(fiber.parent).toBeNull()
    expect(fiber.sibling).toBeNull()
  })

  it('文字列の child は TEXT_ELEMENT 型の Fiber になる', () => {
    const element = createElement('p', null, 'こんにちは')
    const root = buildFiberTree(element)!
    const text = root.child!

    expect(text.type).toBe(TEXT_ELEMENT)
    expect(text.props.nodeValue).toBe('こんにちは')
  })

  it('数値の child は文字列に変換されて TEXT_ELEMENT になる', () => {
    const root = buildFiberTree(createElement('span', null, 42))!
    expect(root.child!.props.nodeValue).toBe('42')
  })

  it('key は element から Fiber に引き継がれる', () => {
    const root = buildFiberTree(createElement('li', { key: 'item-1' }, 'A'))!
    expect(root.key).toBe('item-1')
  })

  it('null / undefined / boolean を渡すと null を返す', () => {
    expect(buildFiberTree(null)).toBeNull()
    expect(buildFiberTree(undefined)).toBeNull()
    expect(buildFiberTree(true)).toBeNull()
    expect(buildFiberTree(false)).toBeNull()
  })
})

describe('Fiber: parent / child リンク', () => {
  it('1 つの子を持つ要素は parent.child / child.parent が双方向に繋がる', () => {
    const element = createElement('div', null, createElement('h1', null))
    const parent = buildFiberTree(element)!
    const child = parent.child!

    expect(child.type).toBe('h1')
    expect(child.parent).toBe(parent)
    expect(child.sibling).toBeNull()
  })

  it('深い入れ子: div > section > p の linked-list が作れる', () => {
    const tree = createElement(
      'div',
      null,
      createElement('section', null, createElement('p', null, 'text')),
    )
    const div = buildFiberTree(tree)!
    const section = div.child!
    const p = section.child!
    const text = p.child!

    expect(div.type).toBe('div')
    expect(section.type).toBe('section')
    expect(p.type).toBe('p')
    expect(text.type).toBe(TEXT_ELEMENT)
    expect(text.parent).toBe(p)
    expect(p.parent).toBe(section)
    expect(section.parent).toBe(div)
  })
})

describe('Fiber: sibling リンク', () => {
  it('複数の子は parent.child から sibling で繋がる', () => {
    const tree = createElement(
      'ul',
      null,
      createElement('li', null, 'A'),
      createElement('li', null, 'B'),
      createElement('li', null, 'C'),
    )
    const ul = buildFiberTree(tree)!
    const liA = ul.child!
    const liB = liA.sibling!
    const liC = liB.sibling!

    expect(liA.type).toBe('li')
    expect(liB.type).toBe('li')
    expect(liC.type).toBe('li')
    expect(liC.sibling).toBeNull()
    expect(liA.parent).toBe(ul)
    expect(liB.parent).toBe(ul)
    expect(liC.parent).toBe(ul)
  })

  it('sibling 鎖を辿ると元の children 順が再現される', () => {
    const tree = createElement(
      'ul',
      null,
      createElement('li', null, 'one'),
      createElement('li', null, 'two'),
      createElement('li', null, 'three'),
    )
    const ul = buildFiberTree(tree)!

    const labels: string[] = []
    let cursor: Fiber | null = ul.child
    while (cursor !== null) {
      labels.push(cursor.child!.props.nodeValue as string)
      cursor = cursor.sibling
    }
    expect(labels).toEqual(['one', 'two', 'three'])
  })
})

describe('Fiber: 配列・条件・スキップ', () => {
  it('null / false の子はスキップされ Fiber を作らない', () => {
    const tree = createElement(
      'div',
      null,
      null,
      createElement('span', null, 'shown'),
      false,
    )
    const div = buildFiberTree(tree)!

    expect(div.child!.type).toBe('span')
    expect(div.child!.sibling).toBeNull()
  })

  it('配列の children は展開され sibling 鎖になる', () => {
    const items = ['A', 'B', 'C']
    const tree = createElement(
      'div',
      null,
      items.map((t) => createElement('span', null, t)),
    )
    const div = buildFiberTree(tree)!

    expect(div.child!.type).toBe('span')
    expect(div.child!.sibling!.type).toBe('span')
    expect(div.child!.sibling!.sibling!.type).toBe('span')
    expect(div.child!.sibling!.sibling!.sibling).toBeNull()
  })

  it('入れ子の配列 [a, [b, [c]]] も再帰的に展開される', () => {
    const tree = createElement('div', null, ['a', ['b', ['c']]])
    const div = buildFiberTree(tree)!

    const labels: string[] = []
    let cursor: Fiber | null = div.child
    while (cursor !== null) {
      labels.push(cursor.props.nodeValue as string)
      cursor = cursor.sibling
    }
    expect(labels).toEqual(['a', 'b', 'c'])
  })
})

describe('Fiber: 関数コンポーネント', () => {
  it('関数コンポーネントは type=function の Fiber + その戻り値が child になる', () => {
    const Greet = () => createElement('h1', null, 'hi')
    const root = buildFiberTree(createElement(Greet, null))!

    expect(typeof root.type).toBe('function')
    expect(root.type).toBe(Greet)
    expect(root.child!.type).toBe('h1')
    expect(root.child!.parent).toBe(root)
  })

  it('関数コンポーネントには props と children が渡る', () => {
    type Props = { name: string; children?: unknown }
    const Greet = (props: Props) =>
      createElement('span', null, `hello, ${props.name}`)
    const root = buildFiberTree(
      createElement(Greet as unknown as Function, { name: 'world' }),
    )!

    const span = root.child!
    const text = span.child!
    expect(text.props.nodeValue).toBe('hello, world')
  })
})
