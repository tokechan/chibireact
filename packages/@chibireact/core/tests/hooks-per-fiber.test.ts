import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { useState, _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

/**
 * Part 3.2: hook を fiber 単位に紐付け直したことの検証。
 *
 * Part 1.9 の useState は **モジュール状態 1 配列** で全 hook を扱っていたため、
 * 複数の関数コンポーネントが同じ配列を共有し、混線していた。
 * 3.2 では各 fiber に hooks 配列を持たせるので、コンポーネントごとに独立。
 */
describe('hooks per-fiber: 複数コンポーネントの独立性', () => {
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

  it('2 つの Counter が独立した state を持つ', async () => {
    const Counter = ({ id }: { id: string }) => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        {
          'data-id': id,
          onClick: () => setCount(count + 1),
        },
        `${id}:${count}`,
      )
    }

    const App = () =>
      createElement(
        'div',
        null,
        createElement(Counter as unknown as Function, { id: 'a' }),
        createElement(Counter as unknown as Function, { id: 'b' }),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const wrapper = container.firstChild as HTMLElement
    const buttonA = wrapper.children[0] as HTMLButtonElement
    const buttonB = wrapper.children[1] as HTMLButtonElement

    expect(buttonA.textContent).toBe('a:0')
    expect(buttonB.textContent).toBe('b:0')

    // A だけ押す
    buttonA.click()
    await flushMicrotasks()

    expect((wrapper.children[0] as HTMLElement).textContent).toBe('a:1')
    expect((wrapper.children[1] as HTMLElement).textContent).toBe('b:0')

    // B を 2 回押す
    ;(wrapper.children[1] as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(wrapper.children[1] as HTMLButtonElement).click()
    await flushMicrotasks()

    expect((wrapper.children[0] as HTMLElement).textContent).toBe('a:1')
    expect((wrapper.children[1] as HTMLElement).textContent).toBe('b:2')
  })

  it('親と子の関数コンポーネントが独立した state を持つ', async () => {
    const Inner = () => {
      const [c, setC] = useState(100)
      return createElement(
        'span',
        {
          'data-id': 'inner',
          onClick: () => setC(c + 1),
        },
        `inner:${c}`,
      )
    }

    const Outer = () => {
      const [c, setC] = useState(0)
      return createElement(
        'div',
        null,
        createElement(
          'button',
          { 'data-id': 'outer', onClick: () => setC(c + 1) },
          `outer:${c}`,
        ),
        createElement(Inner, null),
      )
    }

    const root = createRoot(container)
    root.render(createElement(Outer, null))

    const div = container.firstChild as HTMLElement
    const outerBtn = div.children[0] as HTMLButtonElement
    const innerSpan = div.children[1] as HTMLElement

    expect(outerBtn.textContent).toBe('outer:0')
    expect(innerSpan.textContent).toBe('inner:100')

    outerBtn.click()
    await flushMicrotasks()

    expect((div.children[0] as HTMLElement).textContent).toBe('outer:1')
    expect((div.children[1] as HTMLElement).textContent).toBe('inner:100')
  })

  it('同じ Counter を 3 つ並べた場合も全部独立', async () => {
    const Counter = ({ id }: { id: string }) => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${id}:${count}`,
      )
    }
    const App = () =>
      createElement(
        'div',
        null,
        createElement(Counter as unknown as Function, { id: 'x' }),
        createElement(Counter as unknown as Function, { id: 'y' }),
        createElement(Counter as unknown as Function, { id: 'z' }),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const wrapper = container.firstChild as HTMLElement
    const [bx, by, bz] = [
      wrapper.children[0] as HTMLButtonElement,
      wrapper.children[1] as HTMLButtonElement,
      wrapper.children[2] as HTMLButtonElement,
    ]

    by.click()
    await flushMicrotasks()
    bz.click()
    await flushMicrotasks()
    bz.click()
    await flushMicrotasks()

    expect((wrapper.children[0] as HTMLElement).textContent).toBe('x:0')
    expect((wrapper.children[1] as HTMLElement).textContent).toBe('y:1')
    expect((wrapper.children[2] as HTMLElement).textContent).toBe('z:2')
  })
})

describe('hooks per-fiber: render の外で useState を呼ぶとエラー', () => {
  beforeEach(() => {
    _clearHooksForTesting()
  })

  it('関数コンポーネント外で useState を呼ぶと throw する', () => {
    expect(() => useState(0)).toThrow(/render/)
  })
})
