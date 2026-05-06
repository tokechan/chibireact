import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useState,
  useRef,
  useEffect,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

/**
 * Part 3.9: カスタムフックのデモ。
 * カスタム hook = 「use で始まる名前 + 内部で他の hook を呼ぶ関数」。
 * Part 3 で作った hook を組み合わせるだけで再利用可能なロジックが書ける。
 */

// useToggle: 真偽値とトグル関数を返す
function useToggle(initial = false): [boolean, () => void] {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue((v) => !v)
  return [value, toggle]
}

// usePrevious: 前回 render 時の値を返す (初回 render は undefined)
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  const prev = ref.current
  useEffect(() => {
    ref.current = value
  })
  return prev
}

describe('Custom hook: useToggle', () => {
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

  it('初期値 false から toggle で true に', async () => {
    const App = () => {
      const [on, toggle] = useToggle(false)
      return createElement(
        'button',
        { onClick: toggle },
        on ? 'on' : 'off',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('off')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(container.firstChild?.textContent).toBe('on')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(container.firstChild?.textContent).toBe('off')
  })

  it('複数の useToggle が独立して動く', async () => {
    const App = () => {
      const [a, toggleA] = useToggle(false)
      const [b, toggleB] = useToggle(true)
      return createElement(
        'div',
        null,
        createElement('button', { id: 'a', onClick: toggleA }, `${a}`),
        createElement('button', { id: 'b', onClick: toggleB }, `${b}`),
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    const div = container.firstChild as HTMLElement
    expect((div.children[0] as HTMLElement).textContent).toBe('false')
    expect((div.children[1] as HTMLElement).textContent).toBe('true')

    ;(div.children[0] as HTMLButtonElement).click()
    await flushMicrotasks()

    const div2 = container.firstChild as HTMLElement
    expect((div2.children[0] as HTMLElement).textContent).toBe('true')
    expect((div2.children[1] as HTMLElement).textContent).toBe('true') // 不変
  })
})

describe('Custom hook: usePrevious', () => {
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

  it('初回 render では前回値が undefined', () => {
    const App = () => {
      const [count] = useState(5)
      const prev = usePrevious(count)
      return createElement('span', null, `${prev}/${count}`)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('undefined/5')
  })

  it('更新後は前回値が読める', async () => {
    const App = () => {
      const [count, setCount] = useState(0)
      const prev = usePrevious(count)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${prev}/${count}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('undefined/0')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLElement).textContent).toBe('0/1')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLElement).textContent).toBe('1/2')
  })
})
