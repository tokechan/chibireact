import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '../src/render'
import { createElement } from '../src/create-element'
import type { ChibireactNode } from '../src/types'

describe('render function components', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('もっとも単純な関数コンポーネントが描画されます', () => {
    const Hello = () => createElement('h1', null, 'Hello')

    render(createElement(Hello, null), container)

    expect(container.firstChild?.nodeName).toBe('H1')
    expect(container.firstChild?.textContent).toBe('Hello')
  })

  it('props を関数コンポーネントが受け取れます', () => {
    type Props = { name: string }
    const Greeting = (props: Props) =>
      createElement('p', null, `こんにちは、${props.name} さん`)

    render(createElement(Greeting, { name: 'tokechan' }), container)

    expect(container.firstChild?.textContent).toBe('こんにちは、tokechan さん')
  })

  it('props.children を関数コンポーネントが受け取れます', () => {
    type Props = { children: ChibireactNode[] }
    const Card = (props: Props) =>
      createElement('div', { className: 'card' }, props.children)

    render(
      createElement(
        Card,
        null,
        createElement('h2', null, 'タイトル'),
        createElement('p', null, '本文'),
      ),
      container,
    )

    const card = container.firstChild as HTMLElement
    expect(card.className).toBe('card')
    expect(card.children.length).toBe(2)
    expect(card.children[0].nodeName).toBe('H2')
    expect(card.children[1].nodeName).toBe('P')
  })

  it('入れ子の関数コンポーネントも描画されます', () => {
    const Inner = () => createElement('span', null, 'Inner')
    const Outer = () => createElement('div', null, createElement(Inner, null))

    render(createElement(Outer, null), container)

    const outer = container.firstChild as HTMLElement
    expect(outer.nodeName).toBe('DIV')
    expect(outer.firstChild?.nodeName).toBe('SPAN')
    expect(outer.textContent).toBe('Inner')
  })

  it('関数コンポーネントは props ごとに呼び出されます', () => {
    const fn = vi.fn((props: { value: number }) =>
      createElement('span', null, props.value),
    )
    const Item = fn

    render(
      createElement(
        'div',
        null,
        createElement(Item, { value: 1 }),
        createElement(Item, { value: 2 }),
        createElement(Item, { value: 3 }),
      ),
      container,
    )

    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ value: 1 }))
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }))
    expect(container.firstChild?.textContent).toBe('123')
  })

  it('関数コンポーネントが null を返すと何も描画されません', () => {
    const Empty = () => null

    render(
      createElement(
        'div',
        null,
        createElement('span', null, 'before'),
        createElement(Empty, null),
        createElement('span', null, 'after'),
      ),
      container,
    )

    const div = container.firstChild as HTMLElement
    expect(div.children.length).toBe(2) // span × 2 のみ
    expect(div.textContent).toBe('beforeafter')
  })

  it('関数コンポーネントが配列を返すこともできます', () => {
    const Items = () => [
      createElement('li', null, 'A'),
      createElement('li', null, 'B'),
    ]

    render(createElement('ul', null, createElement(Items, null)), container)

    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(2)
    expect(ul.children[0].textContent).toBe('A')
  })

  it('関数コンポーネントが文字列を返すこともできます', () => {
    const Label = (props: { text: string }) => props.text

    render(
      createElement('div', null, createElement(Label, { text: 'Label A' })),
      container,
    )

    expect(container.firstChild?.textContent).toBe('Label A')
  })

  it('items.map で関数コンポーネントを並べられます', () => {
    type ItemProps = { name: string }
    const Item = (props: ItemProps) => createElement('li', null, props.name)

    const names = ['Bob', 'Alice', 'Carol']
    render(
      createElement(
        'ul',
        null,
        names.map((name) => createElement(Item, { name })),
      ),
      container,
    )

    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.children[0].textContent).toBe('Bob')
    expect(ul.children[2].textContent).toBe('Carol')
  })
})
