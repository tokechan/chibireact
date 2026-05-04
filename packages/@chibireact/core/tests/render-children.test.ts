import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../src/render'
import { createElement } from '../src/create-element'

describe('render children (null / boolean / array)', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('null の child は描画されません', () => {
    render(createElement('div', null, null), container)

    const div = container.firstChild as HTMLElement
    expect(div.childNodes.length).toBe(0)
  })

  it('undefined の child は描画されません', () => {
    render(createElement('div', null, undefined), container)

    const div = container.firstChild as HTMLElement
    expect(div.childNodes.length).toBe(0)
  })

  it('false の child は描画されません', () => {
    render(createElement('div', null, false), container)

    const div = container.firstChild as HTMLElement
    expect(div.childNodes.length).toBe(0)
  })

  it('true の child も描画されません (React 互換)', () => {
    render(createElement('div', null, true), container)

    const div = container.firstChild as HTMLElement
    expect(div.childNodes.length).toBe(0)
  })

  it('配列の child を展開して描画します', () => {
    const list = ['Apple', 'Banana', 'Cherry']
    render(createElement('div', null, list), container)

    const div = container.firstChild as HTMLElement
    expect(div.textContent).toBe('AppleBananaCherry')
  })

  it('入れ子の配列も再帰的に展開します', () => {
    render(createElement('div', null, ['a', ['b', ['c']]]), container)

    const div = container.firstChild as HTMLElement
    expect(div.textContent).toBe('abc')
  })

  it('null / false を含む配列は該当要素のみ描画します', () => {
    render(createElement('div', null, ['a', null, false, 'b']), container)

    const div = container.firstChild as HTMLElement
    expect(div.textContent).toBe('ab')
  })

  it('条件付きレンダリング: cond && <span /> パターンが動きます', () => {
    const cond = true
    render(
      createElement(
        'div',
        null,
        cond && createElement('span', null, 'shown'),
        !cond && createElement('span', null, 'hidden'),
      ),
      container,
    )

    const div = container.firstChild as HTMLElement
    expect(div.children.length).toBe(1)
    expect(div.textContent).toBe('shown')
  })

  it('items.map() のリストレンダリングが動きます', () => {
    const items = ['Item 1', 'Item 2', 'Item 3']
    render(
      createElement(
        'ul',
        null,
        items.map((item) => createElement('li', null, item)),
      ),
      container,
    )

    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.children[0].nodeName).toBe('LI')
    expect(ul.children[0].textContent).toBe('Item 1')
    expect(ul.children[2].textContent).toBe('Item 3')
  })

  it('テキストとリストを混在できます', () => {
    const items = ['Bob', 'Alice']
    render(
      createElement(
        'p',
        null,
        'Hello, ',
        items.map((name) => createElement('span', null, name)),
        '!',
      ),
      container,
    )

    const p = container.firstChild as HTMLElement
    expect(p.textContent).toBe('Hello, BobAlice!')
    expect(p.children.length).toBe(2) // span × 2
  })
})
