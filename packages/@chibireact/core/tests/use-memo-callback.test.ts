import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useCallback,
  useMemo,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useMemo', () => {
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

  it('factory は初回のみ呼ばれ、deps が同じなら再実行されない', async () => {
    const factory = vi.fn(() => 100)
    const App = () => {
      const [, setOther] = useState(0)
      const value = useMemo(factory, [])
      return createElement(
        'button',
        { onClick: () => setOther((n) => n + 1) },
        `${value}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(factory).toHaveBeenCalledTimes(1)
    expect(container.firstChild?.textContent).toBe('100')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect(factory).toHaveBeenCalledTimes(1) // deps=[] なので増えない
  })

  it('deps が変わるたびに factory が再実行される', async () => {
    const factory = vi.fn((n: number) => n * 2)
    const App = () => {
      const [count, setCount] = useState(0)
      const doubled = useMemo(() => factory(count), [count])
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${doubled}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(factory).toHaveBeenCalledTimes(1)
    expect(container.firstChild?.textContent).toBe('0')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(2)
    expect((container.firstChild as HTMLElement).textContent).toBe('2')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(3)
    expect((container.firstChild as HTMLElement).textContent).toBe('4')
  })

  it('deps を省略すると毎 render で factory が走る', async () => {
    const factory = vi.fn(() => Math.random())
    const App = () => {
      const [, setN] = useState(0)
      useMemo(factory)
      return createElement(
        'button',
        { onClick: () => setN((n) => n + 1) },
        'click',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(factory).toHaveBeenCalledTimes(1)

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('deps が同じなら同じオブジェクト参照を返す', async () => {
    const seen: object[] = []
    const App = () => {
      const [, setN] = useState(0)
      const obj = useMemo(() => ({ x: 1 }), [])
      seen.push(obj)
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

    expect(seen.length).toBe(2)
    expect(seen[1]).toBe(seen[0]) // 同じ参照
  })

  it('render 外で useMemo を呼ぶと throw', () => {
    expect(() => useMemo(() => 0, [])).toThrow(/render/)
  })
})

describe('useCallback', () => {
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

  it('deps が同じなら同じ関数参照を返す', async () => {
    const seen: Function[] = []
    const App = () => {
      const [, setN] = useState(0)
      const fn = useCallback(() => 'hello', [])
      seen.push(fn)
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

  it('deps が変わると新しい関数参照を返す', async () => {
    const seen: Function[] = []
    const App = () => {
      const [count, setCount] = useState(0)
      const fn = useCallback(() => count, [count])
      seen.push(fn)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${count}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect(seen.length).toBe(3)
    expect(seen[1]).not.toBe(seen[0])
    expect(seen[2]).not.toBe(seen[1])
  })

  it('useCallback で固定した関数が click 時に正しい closure を保つ', async () => {
    let captured = -1
    const App = () => {
      const [n, setN] = useState(0)
      const cb = useCallback(() => {
        captured = n
      }, [n])
      return createElement(
        'div',
        null,
        createElement('button', { id: 'inc', onClick: () => setN(n + 1) }, `${n}`),
        createElement('button', { id: 'log', onClick: cb }, 'log'),
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    ;(container.querySelector('#inc') as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.querySelector('#log') as HTMLButtonElement).click()
    expect(captured).toBe(1)
  })
})
