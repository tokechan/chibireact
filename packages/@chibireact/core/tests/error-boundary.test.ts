import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { ErrorBoundary } from '../src/error-boundary'
import { _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

describe('ErrorBoundary', () => {
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

  it('子が Error を throw すると fallback が表示される', () => {
    const Boom = () => {
      throw new Error('crashed')
    }

    const App = () =>
      createElement(
        ErrorBoundary as unknown as Function,
        { fallback: createElement('span', null, 'recovered') },
        createElement(Boom, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('recovered')
  })

  it('fallback が関数なら error を引数に呼ばれる', () => {
    const Boom = () => {
      throw new Error('boom!')
    }

    const App = () =>
      createElement(
        ErrorBoundary as unknown as Function,
        {
          fallback: (err: unknown) =>
            createElement('span', null, `error: ${(err as Error).message}`),
        },
        createElement(Boom, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('error: boom!')
  })

  it('ErrorBoundary の外の兄弟は影響を受けない', () => {
    const Boom = () => {
      throw new Error('x')
    }

    const App = () =>
      createElement(
        'div',
        null,
        createElement('header', null, 'header'),
        createElement(
          ErrorBoundary as unknown as Function,
          { fallback: createElement('span', null, 'failed') },
          createElement(Boom, null),
        ),
        createElement('footer', null, 'footer'),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const div = container.firstChild as HTMLElement
    expect(div.children[0].textContent).toBe('header')
    expect(div.children[1].textContent).toBe('failed')
    expect(div.children[2].textContent).toBe('footer')
  })

  it('ネストした ErrorBoundary では最も近いものが捕まえる', () => {
    const Boom = () => {
      throw new Error('inner')
    }

    const App = () =>
      createElement(
        ErrorBoundary as unknown as Function,
        { fallback: createElement('span', null, 'outer-fallback') },
        createElement(
          ErrorBoundary as unknown as Function,
          { fallback: createElement('span', null, 'inner-fallback') },
          createElement(Boom, null),
        ),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('inner-fallback')
  })

  it('ErrorBoundary が無いとエラーが伝播する', () => {
    const Boom = () => {
      throw new Error('uncaught')
    }

    const App = () => createElement(Boom, null)
    const root = createRoot(container)

    expect(() => {
      root.render(createElement(App, null))
    }).toThrow(/uncaught/)
  })

  it('Promise を throw した場合は ErrorBoundary では捕まえない (Suspense の仕事)', () => {
    const promise = new Promise<void>(() => {})
    const SuspendedComp = () => {
      throw promise
    }

    const App = () =>
      createElement(
        ErrorBoundary as unknown as Function,
        { fallback: createElement('span', null, 'caught-by-eb') },
        createElement(SuspendedComp, null),
      )

    const root = createRoot(container)
    // ErrorBoundary は Promise をスルーして Suspense を探す
    // Suspense が無いので最終的に throw される
    expect(() => {
      root.render(createElement(App, null))
    }).toThrow()
  })

  it('正常な子は ErrorBoundary 配下でもそのまま表示される', () => {
    const Normal = () => createElement('span', null, 'ok')

    const App = () =>
      createElement(
        ErrorBoundary as unknown as Function,
        { fallback: createElement('span', null, 'fail') },
        createElement(Normal, null),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('ok')
  })
})
