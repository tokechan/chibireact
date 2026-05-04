import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../src/render'
import { createElement } from '../src/create-element'
import { createRoot } from '../src/create-root'

describe('render', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('単一の HTML 要素を container に追加します', () => {
    const element = createElement('h1', null)
    render(element, container)

    expect(container.firstChild?.nodeName).toBe('H1')
  })

  it('文字列の child をテキストノードに変換します', () => {
    const element = createElement('p', null, 'Hello')
    render(element, container)

    expect(container.firstChild?.textContent).toBe('Hello')
    expect(container.firstChild?.firstChild?.nodeType).toBe(Node.TEXT_NODE)
  })

  it('数値の child をテキストノードに変換します', () => {
    const element = createElement('span', null, 42)
    render(element, container)

    expect(container.firstChild?.textContent).toBe('42')
  })

  it('複数の child を順序通り追加します', () => {
    const element = createElement('p', null, 'Hello', ' ', 'World')
    render(element, container)

    expect(container.firstChild?.textContent).toBe('Hello World')
  })

  it('入れ子の要素を再帰的にレンダリングします', () => {
    const element = createElement(
      'div',
      null,
      createElement('h1', null, 'Title'),
      createElement('p', null, 'Body'),
    )
    render(element, container)

    const div = container.firstChild as HTMLElement
    expect(div.nodeName).toBe('DIV')
    expect(div.children.length).toBe(2)
    expect(div.children[0].nodeName).toBe('H1')
    expect(div.children[0].textContent).toBe('Title')
    expect(div.children[1].nodeName).toBe('P')
    expect(div.children[1].textContent).toBe('Body')
  })

  it('深いネスト（孫まで）も正しく処理します', () => {
    const element = createElement(
      'section',
      null,
      createElement(
        'article',
        null,
        createElement('h2', null, 'Inner Title'),
      ),
    )
    render(element, container)

    const section = container.firstChild as HTMLElement
    const article = section.firstChild as HTMLElement
    const h2 = article.firstChild as HTMLElement
    expect(h2.textContent).toBe('Inner Title')
  })

  it('関数コンポーネントは未対応エラーを投げます', () => {
    const Comp = () => createElement('div', null)
    expect(() => render(createElement(Comp, null), container)).toThrow(
      /function components/i,
    )
  })
})

describe('createRoot.render の連携', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('createRoot 経由でも DOM が描画されます', () => {
    const root = createRoot(container)
    root.render(createElement('h1', null, 'Hello chibireact'))

    expect(container.firstChild?.nodeName).toBe('H1')
    expect(container.textContent).toBe('Hello chibireact')
  })
})
