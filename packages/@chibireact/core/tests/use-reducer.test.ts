import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useReducer,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useReducer', () => {
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

  it('reducer を使って state を更新できる', async () => {
    type Action = { type: 'inc' } | { type: 'dec' }
    const reducer = (s: number, a: Action) =>
      a.type === 'inc' ? s + 1 : s - 1

    const Counter = () => {
      const [count, dispatch] = useReducer(reducer, 0)
      return createElement(
        'div',
        null,
        createElement('span', null, `${count}`),
        createElement(
          'button',
          { id: 'inc', onClick: () => dispatch({ type: 'inc' }) },
          '+',
        ),
        createElement(
          'button',
          { id: 'dec', onClick: () => dispatch({ type: 'dec' }) },
          '-',
        ),
      )
    }

    const root = createRoot(container)
    root.render(createElement(Counter, null))

    const span = (container.firstChild as HTMLElement).children[0]
    const incBtn = container.querySelector('#inc') as HTMLButtonElement
    const decBtn = container.querySelector('#dec') as HTMLButtonElement

    expect(span.textContent).toBe('0')

    incBtn.click()
    await flushMicrotasks()
    expect(
      ((container.firstChild as HTMLElement).children[0] as HTMLElement)
        .textContent,
    ).toBe('1')

    incBtn.click()
    await flushMicrotasks()
    incBtn.click()
    await flushMicrotasks()
    decBtn.click()
    await flushMicrotasks()

    expect(
      ((container.firstChild as HTMLElement).children[0] as HTMLElement)
        .textContent,
    ).toBe('2')
  })

  it('同じ state を返す reducer は再レンダしない (Object.is)', async () => {
    let renderCount = 0
    const reducer = (s: number) => s // 何が来ても変えない

    const App = () => {
      renderCount++
      const [, dispatch] = useReducer(reducer, 0)
      return createElement(
        'button',
        { onClick: () => dispatch(undefined as never) },
        'click',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    const initial = renderCount
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(renderCount).toBe(initial) // 増えない
  })

  it('useState と useReducer を同じコンポーネントで併用できる', async () => {
    type Action = { type: 'inc' }
    const reducer = (s: number, _a: Action) => s + 1

    const App = () => {
      const [name, setName] = useState('alice')
      const [count, dispatch] = useReducer(reducer, 0)
      return createElement(
        'div',
        {
          onClick: () => {
            setName('bob')
            dispatch({ type: 'inc' })
          },
        },
        `${name}:${count}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect((container.firstChild as HTMLElement).textContent).toBe('alice:0')

    ;(container.firstChild as HTMLElement).click()
    await flushMicrotasks()

    expect((container.firstChild as HTMLElement).textContent).toBe('bob:1')
  })

  it('複数の useReducer を同じコンポーネントで使える', async () => {
    type A = { type: 'a' }
    type B = { type: 'b' }
    const reducerA = (s: number, _a: A) => s + 10
    const reducerB = (s: number, _b: B) => s - 1

    const App = () => {
      const [a, dispatchA] = useReducer(reducerA, 0)
      const [b, dispatchB] = useReducer(reducerB, 100)
      return createElement(
        'div',
        {
          onClick: () => {
            dispatchA({ type: 'a' })
            dispatchB({ type: 'b' })
          },
        },
        `${a},${b}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect((container.firstChild as HTMLElement).textContent).toBe('0,100')

    ;(container.firstChild as HTMLElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLElement).click()
    await flushMicrotasks()

    expect((container.firstChild as HTMLElement).textContent).toBe('20,98')
  })

  it('render の外で useReducer を呼ぶと throw する', () => {
    const reducer = (s: number) => s
    expect(() => useReducer(reducer, 0)).toThrow(/render/)
  })
})
