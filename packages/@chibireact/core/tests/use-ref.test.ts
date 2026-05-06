import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useEffect,
  useRef,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useRef', () => {
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

  it('返値オブジェクトは再 render 間で同じ参照', async () => {
    const seen: { current: number }[] = []
    const App = () => {
      const [, setN] = useState(0)
      const ref = useRef(0)
      seen.push(ref)
      return createElement(
        'button',
        { onClick: () => setN((n) => n + 1) },
        'click',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect(seen.length).toBe(3)
    expect(seen[1]).toBe(seen[0])
    expect(seen[2]).toBe(seen[0])
  })

  it('.current の mutation は再 render 後も保持される', async () => {
    let mutate = (_v: number) => {}
    const App = () => {
      const [, setN] = useState(0)
      const ref = useRef(0)
      mutate = (v) => {
        ref.current = v
      }
      return createElement(
        'button',
        {
          onClick: () => setN((n) => n + 1),
        },
        `${ref.current}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('0')

    mutate(42)
    expect(container.firstChild?.textContent).toBe('0') // 再 render なし

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    // 再 render したので新しい current 値が表示される
    expect((container.firstChild as HTMLElement).textContent).toBe('42')
  })

  it('.current を更新しても再 render は起きない', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const ref = useRef(0)
      // Render するたびに mutate するが、これでは再 render しない
      ref.current += 1
      return createElement('span', null, `${ref.current}`)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    const initial = renderCount
    // wait
    await flushMicrotasks()
    expect(renderCount).toBe(initial) // 増えない (= 自動再描画はない)
  })

  it('複数の useRef を独立して扱える', () => {
    let r1 = { current: 0 }
    let r2 = { current: '' }
    const App = () => {
      r1 = useRef(1)
      r2 = useRef('hello')
      return createElement('span', null, `${r1.current}/${r2.current}`)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('1/hello')
    expect(r1).not.toBe(r2)
  })

  it('useEffect から ref.current を更新しても破綻しない', async () => {
    const mounted: number[] = []
    const App = () => {
      const ref = useRef(0)
      useEffect(() => {
        ref.current = 99
        mounted.push(ref.current)
      }, [])
      return createElement('span', null, `${ref.current}`)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(mounted).toEqual([99])
  })

  it('render 外で useRef を呼ぶと throw', () => {
    expect(() => useRef(0)).toThrow(/render/)
  })
})
