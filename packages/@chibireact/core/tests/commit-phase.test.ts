import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  runFiberRoot,
  _resetSchedulerForTesting,
} from '../src/work-loop'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { useState, _clearHooksForTesting } from '../src/hooks-state'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

/**
 * Part 2.7: prop diff 最適化と createRoot の Fiber 統合のテスト。
 *
 * - updateDom が「変わった prop だけ」を反映する
 * - 削除された prop は DOM から消える
 * - createRoot 経由の useState (Counter) で DOM identity が保たれる
 */
describe('commit phase: prop diff', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
  })

  it('削除された属性は DOM から消える', () => {
    runFiberRoot(
      createElement('div', { id: 'before', title: 'tip' }),
      container,
    )
    const div = container.firstChild as HTMLElement
    expect(div.getAttribute('id')).toBe('before')
    expect(div.getAttribute('title')).toBe('tip')

    // 2 度目: id だけ残し title を削る
    runFiberRoot(createElement('div', { id: 'after' }), container)
    expect(div.getAttribute('id')).toBe('after')
    expect(div.hasAttribute('title')).toBe(false)
  })

  it('className を削除すると class 属性が消える', () => {
    runFiberRoot(createElement('div', { className: 'foo' }), container)
    const div = container.firstChild as HTMLElement
    expect(div.className).toBe('foo')

    runFiberRoot(createElement('div', null), container)
    expect(div.className).toBe('')
  })

  it('変わらない属性に対して setAttribute は呼ばれない', () => {
    runFiberRoot(
      createElement('div', { id: 'same', title: 'a' }),
      container,
    )
    const div = container.firstChild as HTMLElement
    const setAttributeSpy = vi.spyOn(div, 'setAttribute')

    // title だけ変更、id は不変
    runFiberRoot(
      createElement('div', { id: 'same', title: 'b' }),
      container,
    )

    // id は変わっていないので setAttribute は呼ばれない
    expect(setAttributeSpy).not.toHaveBeenCalledWith('id', expect.anything())
    // title は変わったので呼ばれる
    expect(setAttributeSpy).toHaveBeenCalledWith('title', 'b')
  })

  it('style の削除キーは空文字でクリアされる', () => {
    runFiberRoot(
      createElement('div', { style: { color: 'red', fontSize: '20px' } }),
      container,
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.color).toBe('red')
    expect(div.style.fontSize).toBe('20px')

    // fontSize を消し、color を変更
    runFiberRoot(
      createElement('div', { style: { color: 'blue' } }),
      container,
    )
    expect(div.style.color).toBe('blue')
    expect(div.style.fontSize).toBe('') // クリアされた
  })
})

describe('commit phase: createRoot + useState の Fiber 統合', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
  })

  it('Counter の setState で button DOM identity が保たれる', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(Counter, null))

    const button1 = container.firstChild as HTMLButtonElement
    expect(button1.textContent).toBe('0')

    button1.click()
    await flushMicrotasks()

    const button2 = container.firstChild as HTMLButtonElement
    // 同じ DOM ノードが使い回される
    expect(button2).toBe(button1)
    expect(button2.textContent).toBe('1')
  })

  it('focus が setState 後も保たれる (DOM 再利用の副産物)', async () => {
    // jsdom で focus を効かせるには container を document に attach する必要あり
    document.body.appendChild(container)
    try {
      const Field = () => {
        const [value, setValue] = useState('')
        return createElement('input', {
          value,
          onInput: (e: Event) =>
            setValue((e.target as HTMLInputElement).value),
        })
      }

      const root = createRoot(container)
      root.render(createElement(Field, null))

      const input1 = container.firstChild as HTMLInputElement
      input1.focus()
      expect(document.activeElement).toBe(input1)

      // 値を変えて再 render
      input1.value = 'x'
      input1.dispatchEvent(new Event('input'))
      await flushMicrotasks()

      const input2 = container.firstChild as HTMLInputElement
      expect(input2).toBe(input1) // DOM が同じ
      // jsdom では DOM が再利用されているので focus も維持されている
      expect(document.activeElement).toBe(input2)
    } finally {
      container.remove()
    }
  })

  it('複数 setState のバッチングが Fiber 経由でも 1 回の commit に収束', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const [a, setA] = useState(0)
      const [b, setB] = useState(0)
      return createElement(
        'button',
        {
          onClick: () => {
            setA(a + 1)
            setB(b + 1)
          },
        },
        `${a},${b}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    const initial = renderCount

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    // 2 つの setState で 1 回の再描画
    expect(renderCount).toBe(initial + 1)
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('1,1')
  })
})
