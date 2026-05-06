import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useEffect,
  useLayoutEffect,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useLayoutEffect', () => {
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

  it('mount 直後に同期で走る', () => {
    const spy = vi.fn()
    const App = () => {
      useLayoutEffect(() => {
        spy()
      }, [])
      return createElement('div', null)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    // sync で実行される
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('useEffect と同じ条件で再実行される (deps 比較)', async () => {
    const spy = vi.fn()
    const App = () => {
      const [count, setCount] = useState(0)
      useLayoutEffect(() => {
        spy(count)
      }, [count])
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(spy).toHaveBeenCalledTimes(1)

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('useLayoutEffect → useEffect の順で実行される (同じコンポーネント内)', () => {
    const order: string[] = []
    const App = () => {
      useEffect(() => {
        order.push('passive')
      }, [])
      useLayoutEffect(() => {
        order.push('layout')
      }, [])
      return createElement('div', null)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    // layout が先、passive が後
    expect(order).toEqual(['layout', 'passive'])
  })

  it('cleanup も deps 変化で走る', async () => {
    const order: string[] = []
    const App = () => {
      const [count, setCount] = useState(0)
      useLayoutEffect(() => {
        order.push(`layout:${count}`)
        return () => order.push(`cleanup:${count}`)
      }, [count])
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(order).toEqual(['layout:0'])

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(order).toEqual(['layout:0', 'cleanup:0', 'layout:1'])
  })

  it('unmount 時に cleanup が走る', () => {
    const cleanup = vi.fn()
    const Child = () => {
      useLayoutEffect(() => cleanup, [])
      return createElement('span', null, 'child')
    }
    const App = ({ show }: { show: boolean }) =>
      show
        ? createElement(Child, null)
        : createElement('span', null, 'placeholder')

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { show: true }))
    expect(cleanup).not.toHaveBeenCalled()

    root.render(createElement(App as unknown as Function, { show: false }))
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('render 外で useLayoutEffect を呼ぶと throw する', () => {
    expect(() => useLayoutEffect(() => undefined, [])).toThrow(/render/)
  })
})
