import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { Suspense } from '../src/suspense'
import { _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

const flushAll = async () => {
  for (let i = 0; i < 5; i++) {
    await flushMicrotasks()
    await new Promise<void>((r) => setTimeout(r, 0))
  }
}

describe('Suspense', () => {
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

  it('子が Promise を throw すると fallback が表示される', () => {
    const promise = new Promise<void>(() => {
      // never resolves
    })
    const SuspendedComp = () => {
      throw promise
    }

    const App = () =>
      createElement(
        Suspense as unknown as Function,
        { fallback: createElement('span', null, 'loading') },
        createElement(SuspendedComp, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('loading')
  })

  it('Promise が resolve すると children が表示される', async () => {
    let resolver!: () => void
    const promise = new Promise<void>((r) => {
      resolver = r
    })
    let isResolved = false

    const SlowComp = () => {
      if (!isResolved) throw promise
      return createElement('span', null, 'loaded')
    }

    const App = () =>
      createElement(
        Suspense as unknown as Function,
        { fallback: createElement('span', null, 'loading') },
        createElement(SlowComp, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('loading')

    // Promise を resolve
    isResolved = true
    resolver()
    await flushAll()

    expect(container.firstChild?.textContent).toBe('loaded')
  })

  it('Suspense の外の兄弟は fallback の影響を受けない', () => {
    const promise = new Promise<void>(() => {})
    const SuspendedComp = () => {
      throw promise
    }

    const App = () =>
      createElement(
        'div',
        null,
        createElement('header', null, 'always shown'),
        createElement(
          Suspense as unknown as Function,
          { fallback: createElement('span', null, 'loading') },
          createElement(SuspendedComp, null),
        ),
        createElement('footer', null, 'always shown footer'),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const div = container.firstChild as HTMLElement
    expect(div.children[0].textContent).toBe('always shown')
    expect(div.children[1].textContent).toBe('loading') // Suspense の中身は fallback
    expect(div.children[2].textContent).toBe('always shown footer')
  })

  it('ネストした Suspense では最も近いものが捕まえる', () => {
    const promise = new Promise<void>(() => {})
    const SuspendedComp = () => {
      throw promise
    }

    const App = () =>
      createElement(
        Suspense as unknown as Function,
        { fallback: createElement('span', null, 'outer-fallback') },
        createElement(
          Suspense as unknown as Function,
          { fallback: createElement('span', null, 'inner-fallback') },
          createElement(SuspendedComp, null),
        ),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    // 内側の Suspense が捕まえるので 'inner-fallback'
    expect(container.firstChild?.textContent).toBe('inner-fallback')
  })

  it('Suspense なしで Promise を throw するとエラーが伝播する', () => {
    const promise = new Promise<void>(() => {})
    const SuspendedComp = () => {
      throw promise
    }

    const App = () => createElement(SuspendedComp, null)

    const root = createRoot(container)
    expect(() => {
      root.render(createElement(App, null))
    }).toThrow()
  })

  it('Suspense 内の通常のコンポーネントはそのまま表示される', () => {
    const Normal = () => createElement('span', null, 'normal')

    const App = () =>
      createElement(
        Suspense as unknown as Function,
        { fallback: createElement('span', null, 'loading') },
        createElement(Normal, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('normal')
  })
})
