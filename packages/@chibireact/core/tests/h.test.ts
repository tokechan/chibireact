import { describe, it, expect } from 'vitest'
import { h } from '../src/h'

/**
 * Part 4.4: tagged template literal `h\`...\`` のテスト。
 *
 * 検証する変換:
 *   - HTML タグ
 *   - 属性 (静的 / 補間)
 *   - 子要素 (テキスト / 補間 / ネスト)
 *   - コンポーネント補間 <${Foo}>
 *   - 自閉じ <br />
 */
describe('h: HTML タグの基本', () => {
  it('単純な要素', () => {
    const el = h`<div></div>`
    expect(el.type).toBe('div')
    expect(el.props).toEqual({})
    expect(el.children).toEqual([])
  })

  it('テキスト子要素', () => {
    const el = h`<h1>Hello</h1>`
    expect(el.type).toBe('h1')
    expect(el.children).toEqual(['Hello'])
  })

  it('自閉じタグ', () => {
    const el = h`<br />`
    expect(el.type).toBe('br')
    expect(el.children).toEqual([])
  })

  it('入れ子', () => {
    const el = h`<div><p>inner</p></div>`
    expect(el.type).toBe('div')
    expect(el.children.length).toBe(1)
    const inner = el.children[0] as ReturnType<typeof h>
    expect(inner.type).toBe('p')
    expect(inner.children).toEqual(['inner'])
  })
})

describe('h: 属性', () => {
  it('文字列リテラル属性', () => {
    const el = h`<div className="box" id="main"></div>`
    expect(el.props).toEqual({ className: 'box', id: 'main' })
  })

  it('値補間属性', () => {
    const cls = 'foo'
    const n = 42
    const el = h`<input className=${cls} count=${n} />`
    expect(el.props.className).toBe('foo')
    expect(el.props.count).toBe(42)
  })

  it('文字列内に補間が混じる属性', () => {
    const name = 'tokechan'
    const el = h`<a title="hello, ${name}!" />`
    expect(el.props.title).toBe('hello, tokechan!')
  })

  it('関数を属性に渡せる (onClick)', () => {
    const handler = () => 'clicked'
    const el = h`<button onClick=${handler}>click</button>`
    expect(el.props.onClick).toBe(handler)
  })
})

describe('h: 子要素の補間', () => {
  it('数値の補間', () => {
    const count = 7
    const el = h`<span>${count}</span>`
    expect(el.children).toEqual([7])
  })

  it('テキストと補間の混在', () => {
    const name = 'world'
    const el = h`<p>Hello, ${name}!</p>`
    // テキスト 2 つ + 補間 1 つ
    expect(el.children).toEqual(['Hello, ', 'world', '!'])
  })

  it('複数の子要素', () => {
    const el = h`<ul><li>A</li><li>B</li></ul>`
    expect(el.children.length).toBe(2)
    expect((el.children[0] as ReturnType<typeof h>).type).toBe('li')
    expect((el.children[1] as ReturnType<typeof h>).type).toBe('li')
  })
})

describe('h: コンポーネント補間', () => {
  it('関数コンポーネントを type にできる', () => {
    const Greet = () => h`<span>hi</span>`
    const el = h`<${Greet} />`
    expect(el.type).toBe(Greet)
  })

  it('コンポーネントに props と children を渡せる', () => {
    const Wrap = (props: { name: string; children: unknown }) =>
      h`<div>${props.name}: ${props.children}</div>`
    const el = h`<${Wrap} name="title">contents</${Wrap}>`
    expect(el.type).toBe(Wrap)
    expect(el.props.name).toBe('title')
    expect(el.children).toEqual(['contents'])
  })
})
