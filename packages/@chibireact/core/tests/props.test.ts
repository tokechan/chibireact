import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '../src/render'
import { createElement } from '../src/create-element'

describe('render props', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('className を DOM の className として反映します', () => {
    const element = createElement('div', { className: 'box primary' })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.className).toBe('box primary')
  })

  it('id を属性として反映します', () => {
    const element = createElement('div', { id: 'app' })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.id).toBe('app')
    expect(dom.getAttribute('id')).toBe('app')
  })

  it('data-* 属性をそのままの key で反映します', () => {
    const element = createElement('div', { 'data-testid': 'header' })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.getAttribute('data-testid')).toBe('header')
  })

  it('aria-* 属性をそのままの key で反映します', () => {
    const element = createElement('button', { 'aria-label': '閉じる' })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.getAttribute('aria-label')).toBe('閉じる')
  })

  it('数値の値は文字列に変換して属性として反映します', () => {
    const element = createElement('input', { tabIndex: 1 })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.getAttribute('tabIndex')).toBe('1')
  })

  it('真偽値の値も文字列化して属性として反映します', () => {
    const element = createElement('input', { disabled: true })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.getAttribute('disabled')).toBe('true')
  })

  it('style オブジェクトを inline style に変換します', () => {
    const element = createElement('div', {
      style: { color: 'red', fontSize: '16px' },
    })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.style.color).toBe('red')
    expect(dom.style.fontSize).toBe('16px')
  })

  it('null / undefined の値はスキップします', () => {
    const element = createElement('div', {
      id: 'app',
      title: null,
      lang: undefined,
    })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.getAttribute('id')).toBe('app')
    expect(dom.hasAttribute('title')).toBe(false)
    expect(dom.hasAttribute('lang')).toBe(false)
  })

  it('children プロパティが props 内にあっても誤って反映しません', () => {
    // 念のため: createElement の正規仕様では children はトップレベルだが、
    // 万一 props に紛れ込んでもスキップされること。
    const element = createElement('div', {
      id: 'app',
      children: 'これは反映してはいけない',
    })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.hasAttribute('children')).toBe(false)
    expect(dom.getAttribute('id')).toBe('app')
  })

  it('複数の props を組み合わせて反映します', () => {
    const element = createElement('button', {
      id: 'submit',
      className: 'btn primary',
      'aria-label': '送信',
      tabIndex: 0,
    })
    render(element, container)

    const dom = container.firstChild as HTMLElement
    expect(dom.id).toBe('submit')
    expect(dom.className).toBe('btn primary')
    expect(dom.getAttribute('aria-label')).toBe('送信')
    expect(dom.getAttribute('tabIndex')).toBe('0')
  })
})
