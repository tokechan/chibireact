import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { createContext } from '../src/context'
import {
  useContext,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useContext', () => {
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

  it('Provider が無いとデフォルト値を返す', () => {
    const ThemeContext = createContext('light')
    const Show = () => {
      const theme = useContext(ThemeContext)
      return createElement('span', null, theme)
    }
    const root = createRoot(container)
    root.render(createElement(Show, null))

    expect(container.firstChild?.textContent).toBe('light')
  })

  it('Provider 配下では value が読める', () => {
    const ThemeContext = createContext('light')
    const Show = () => {
      const theme = useContext(ThemeContext)
      return createElement('span', null, theme)
    }
    const App = () =>
      createElement(
        ThemeContext.Provider as unknown as Function,
        { value: 'dark' },
        createElement(Show, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const span = container.firstChild as HTMLElement
    expect(span.textContent).toBe('dark')
  })

  it('深い場所からでも Provider の value が取れる', () => {
    const Ctx = createContext(0)
    const Leaf = () => {
      const v = useContext(Ctx)
      return createElement('span', null, `${v}`)
    }
    const Mid = () => createElement('div', null, createElement(Leaf, null))
    const App = () =>
      createElement(
        Ctx.Provider as unknown as Function,
        { value: 42 },
        createElement('section', null, createElement(Mid, null)),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.textContent).toBe('42')
  })

  it('ネストされた Provider は最も近いものが優先される', () => {
    const Ctx = createContext('default')
    const Show = () => {
      const v = useContext(Ctx)
      return createElement('span', null, v)
    }
    const App = () =>
      createElement(
        Ctx.Provider as unknown as Function,
        { value: 'outer' },
        createElement(
          Ctx.Provider as unknown as Function,
          { value: 'inner' },
          createElement(Show, null),
        ),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    // 最も近い Provider (inner) が勝つ
    expect(container.textContent).toBe('inner')
  })

  it('複数の Context を同じコンポーネントで読める', () => {
    const A = createContext('a-default')
    const B = createContext('b-default')
    const Show = () => {
      const a = useContext(A)
      const b = useContext(B)
      return createElement('span', null, `${a}/${b}`)
    }
    const App = () =>
      createElement(
        A.Provider as unknown as Function,
        { value: 'A!' },
        createElement(
          B.Provider as unknown as Function,
          { value: 'B!' },
          createElement(Show, null),
        ),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.textContent).toBe('A!/B!')
  })

  it('Provider の value が変わると子孫が再描画される', async () => {
    const Ctx = createContext('initial')
    const Show = () => {
      const v = useContext(Ctx)
      return createElement('span', null, v)
    }
    const App = () => {
      const [value, setValue] = useState('initial')
      return createElement(
        'div',
        null,
        createElement(
          Ctx.Provider as unknown as Function,
          { value },
          createElement(Show, null),
        ),
        createElement(
          'button',
          { onClick: () => setValue('updated') },
          'change',
        ),
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    const div = container.firstChild as HTMLElement
    const span = div.children[0] as HTMLElement
    expect(span.textContent).toBe('initial')

    const button = div.children[1] as HTMLButtonElement
    button.click()
    await flushMicrotasks()

    const span2 = (container.firstChild as HTMLElement).children[0]
    expect(span2.textContent).toBe('updated')
  })

  it('render 外で useContext を呼ぶと throw', () => {
    const Ctx = createContext(0)
    expect(() => useContext(Ctx)).toThrow(/render/)
  })
})
