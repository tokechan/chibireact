import { describe, it, expect, beforeEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { useState, _clearHooksForTesting } from '../src/hooks-state'

/** 次のマイクロタスクまで待つヘルパー */
const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useState batching (Part 1.10)', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    _clearHooksForTesting()
  })

  it('同じ tick の複数 setState は 1 回の再レンダにまとめられます', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const [c, setC] = useState(0)
      return createElement(
        'button',
        {
          onClick: () => {
            setC((prev) => prev + 1)
            setC((prev) => prev + 1)
            setC((prev) => prev + 1)
          },
        },
        c,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    const initialRender = renderCount

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    // 3 回 setState したが、再レンダは 1 回だけ
    expect(renderCount).toBe(initialRender + 1)
    // 状態は 3 回全部反映されている
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('3')
  })

  it('別々のクリックは別々に再レンダされます', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const [c, setC] = useState(0)
      return createElement(
        'button',
        { onClick: () => setC((prev) => prev + 1) },
        c,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    const initialRender = renderCount

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    // 3 回別々に setState したので 3 回再レンダされる
    expect(renderCount).toBe(initialRender + 3)
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('3')
  })

  it('複数の useState を同時に更新しても 1 再レンダ', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const [a, setA] = useState(0)
      const [b, setB] = useState(0)
      return createElement(
        'button',
        {
          onClick: () => {
            setA(1)
            setB(2)
          },
        },
        `${a}-${b}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    const initialRender = renderCount

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect(renderCount).toBe(initialRender + 1)
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('1-2')
  })
})
