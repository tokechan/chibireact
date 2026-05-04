import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '../src/render'
import { createElement } from '../src/create-element'

describe('render events', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('onClick の関数を addEventListener として登録します', () => {
    const handler = vi.fn()
    render(createElement('button', { onClick: handler }, 'Click'), container)

    const button = container.firstChild as HTMLButtonElement
    button.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('ハンドラに event オブジェクトを渡します', () => {
    const handler = vi.fn()
    render(createElement('button', { onClick: handler }), container)

    const button = container.firstChild as HTMLButtonElement
    button.click()

    expect(handler).toHaveBeenCalledWith(expect.any(Event))
  })

  it('onMouseDown など、複数語のイベントも小文字化して登録します', () => {
    const handler = vi.fn()
    render(createElement('div', { onMouseDown: handler }), container)

    const div = container.firstChild as HTMLElement
    div.dispatchEvent(new MouseEvent('mousedown'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('onChange は input の change イベントに紐づきます', () => {
    const handler = vi.fn()
    render(createElement('input', { onChange: handler }), container)

    const input = container.firstChild as HTMLInputElement
    input.dispatchEvent(new Event('change'))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('複数のイベントを同じ要素に登録できます', () => {
    const onClick = vi.fn()
    const onMouseEnter = vi.fn()
    render(
      createElement('div', { onClick, onMouseEnter }, 'hover me'),
      container,
    )

    const div = container.firstChild as HTMLElement
    div.click()
    div.dispatchEvent(new MouseEvent('mouseenter'))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onMouseEnter).toHaveBeenCalledTimes(1)
  })

  it('イベントハンドラは attribute として反映されません', () => {
    const handler = vi.fn()
    render(createElement('button', { onClick: handler }), container)

    const button = container.firstChild as HTMLButtonElement
    // setAttribute('onClick', ...) されていないことを確認
    expect(button.hasAttribute('onClick')).toBe(false)
    expect(button.hasAttribute('onclick')).toBe(false)
  })

  it('on で始まるが大文字始まりでない属性 (例: open) は通常属性として扱います', () => {
    // <details open> は HTML 属性として正当
    render(createElement('details', { open: true }), container)

    const details = container.firstChild as HTMLDetailsElement
    expect(details.getAttribute('open')).toBe('true')
  })

  it('関数だが on で始まらない props は属性として処理されません', () => {
    // 念のため: 関数値が attribute として setAttribute されないこと
    const fn = () => {}
    render(createElement('div', { customCallback: fn }), container)

    const div = container.firstChild as HTMLElement
    expect(div.hasAttribute('customCallback')).toBe(false)
  })

  it('入れ子の要素にイベントハンドラを登録できます', () => {
    const handler = vi.fn()
    render(
      createElement(
        'div',
        null,
        createElement('button', { onClick: handler }, 'Inner'),
      ),
      container,
    )

    const button = container.querySelector('button')!
    button.click()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
