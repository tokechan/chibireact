import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runFiberRoot } from '../src/work-loop'
import { createElement } from '../src/create-element'

/**
 * Part 2.4 の work loop テスト。
 *
 * `runFiberRoot(element, container)` は Part 1 の `render` と同じ DOM 出力を
 * **iterative な work loop** で実現する。スケジューラはまだ無い（2.5）。
 *
 * - 振る舞い: render と同じ DOM が container に生成される
 * - 内部: nextUnitOfWork ポインタが child / sibling / parent.sibling を辿って動く
 *
 * テストの大半は Part 1 の render テストに対応する DOM 検証。
 * 一部は Fiber 構造そのものの検証（dom / parent リンクなど）。
 */
describe('work loop: 基本的な DOM 生成', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
  })

  it('単純な要素を container に描画できる', () => {
    runFiberRoot(createElement('h1', null, 'Hello'), container)

    const h1 = container.firstChild as HTMLElement
    expect(h1.nodeName).toBe('H1')
    expect(h1.textContent).toBe('Hello')
  })

  it('複数の子要素が出現順に並ぶ', () => {
    runFiberRoot(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
        createElement('li', null, 'C'),
      ),
      container,
    )

    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.children[0].textContent).toBe('A')
    expect(ul.children[1].textContent).toBe('B')
    expect(ul.children[2].textContent).toBe('C')
  })

  it('深い入れ子が正しく描画される', () => {
    runFiberRoot(
      createElement(
        'section',
        null,
        createElement(
          'article',
          null,
          createElement('h1', null, 'Title'),
          createElement('p', null, 'Body'),
        ),
      ),
      container,
    )

    const section = container.firstChild as HTMLElement
    const article = section.firstChild as HTMLElement
    expect(article.nodeName).toBe('ARTICLE')
    expect(article.children[0].nodeName).toBe('H1')
    expect(article.children[1].textContent).toBe('Body')
  })
})

describe('work loop: props と属性', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
  })

  it('className を反映できる', () => {
    runFiberRoot(createElement('div', { className: 'box' }), container)
    expect((container.firstChild as HTMLElement).className).toBe('box')
  })

  it('style オブジェクトを反映できる', () => {
    runFiberRoot(
      createElement('div', { style: { color: 'red', backgroundColor: 'blue' } }),
      container,
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.color).toBe('red')
    expect(div.style.backgroundColor).toBe('blue')
  })

  it('一般的な属性を setAttribute で反映する', () => {
    runFiberRoot(createElement('a', { href: 'https://example.com' }), container)
    expect((container.firstChild as HTMLElement).getAttribute('href')).toBe(
      'https://example.com',
    )
  })

  it('onClick のようなイベントハンドラが addEventListener として登録される', () => {
    const handler = vi.fn()
    runFiberRoot(createElement('button', { onClick: handler }, 'click'), container)
    const button = container.firstChild as HTMLButtonElement
    button.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe('work loop: 関数コンポーネント', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
  })

  it('関数コンポーネントの戻り値が描画される', () => {
    const Greet = () => createElement('h1', null, 'hi')
    runFiberRoot(createElement(Greet, null), container)
    expect(container.firstChild?.nodeName).toBe('H1')
    expect(container.firstChild?.textContent).toBe('hi')
  })

  it('関数コンポーネントは props を受け取れる', () => {
    type Props = { name: string }
    const Greet = (props: Props) =>
      createElement('span', null, `hello, ${props.name}`)
    runFiberRoot(
      createElement(Greet as unknown as Function, { name: 'world' }),
      container,
    )
    expect((container.firstChild as HTMLElement).textContent).toBe('hello, world')
  })

  it('関数コンポーネントは props.children を受け取れる', () => {
    type Props = { children: unknown }
    const Wrap = (props: Props) =>
      createElement('div', null, props.children as never)
    runFiberRoot(
      createElement(Wrap as unknown as Function, null, 'inner'),
      container,
    )
    expect(container.firstChild?.textContent).toBe('inner')
  })

  it('関数コンポーネント内に関数コンポーネントがあっても描画される', () => {
    const Inner = () => createElement('span', null, 'in')
    const Outer = () => createElement('div', null, createElement(Inner, null))
    runFiberRoot(createElement(Outer, null), container)
    const div = container.firstChild as HTMLElement
    expect(div.firstChild?.nodeName).toBe('SPAN')
    expect(div.firstChild?.textContent).toBe('in')
  })

  it('関数コンポーネントは「処理されるタイミング」で呼ばれる（遅延評価）', () => {
    const spy = vi.fn(() => createElement('span', null, 'rendered'))
    const Component = spy
    // runFiberRoot 呼び出しまで spy は呼ばれない
    expect(spy).not.toHaveBeenCalled()
    runFiberRoot(createElement(Component, null), container)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('work loop: 配列・条件・スキップ', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
  })

  it('null / false / undefined / true の child は描画されない', () => {
    runFiberRoot(
      createElement('div', null, null, false, undefined, true),
      container,
    )
    expect((container.firstChild as HTMLElement).childNodes.length).toBe(0)
  })

  it('配列の child は展開される', () => {
    const items = ['Apple', 'Banana', 'Cherry']
    runFiberRoot(
      createElement(
        'ul',
        null,
        items.map((t) => createElement('li', null, t)),
      ),
      container,
    )
    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.textContent).toBe('AppleBananaCherry')
  })

  it('入れ子配列も再帰展開される', () => {
    runFiberRoot(createElement('div', null, ['a', ['b', ['c']]]), container)
    expect((container.firstChild as HTMLElement).textContent).toBe('abc')
  })

  it('条件付きレンダリング: cond && <Foo />', () => {
    const cond = false
    runFiberRoot(
      createElement(
        'div',
        null,
        cond && createElement('span', null, 'shown'),
        !cond && createElement('span', null, 'hidden'),
      ),
      container,
    )
    const div = container.firstChild as HTMLElement
    expect(div.textContent).toBe('hidden')
  })
})

describe('work loop: テキスト', () => {
  let container: HTMLElement
  beforeEach(() => {
    container = document.createElement('div')
  })

  it('文字列 child はテキストノードになる', () => {
    runFiberRoot(createElement('p', null, 'こんにちは'), container)
    const p = container.firstChild as HTMLElement
    expect(p.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(p.textContent).toBe('こんにちは')
  })

  it('数値 child は文字列化されたテキストノードになる', () => {
    runFiberRoot(createElement('span', null, 42), container)
    expect((container.firstChild as HTMLElement).textContent).toBe('42')
  })

  it('テキストと要素を混在できる', () => {
    runFiberRoot(
      createElement('p', null, 'Hello, ', createElement('strong', null, 'world'), '!'),
      container,
    )
    expect((container.firstChild as HTMLElement).textContent).toBe('Hello, world!')
  })
})
