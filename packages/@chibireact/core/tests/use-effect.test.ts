import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useEffect,
  useState,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useEffect: 実行タイミング', () => {
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

  it('mount 後に effect が走る', () => {
    const spy = vi.fn()
    const App = () => {
      useEffect(() => {
        spy()
      }, [])
      return createElement('div', null, 'app')
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    // commit 直後に effect が呼ばれている
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('deps を省略すると毎 commit 後に走る', async () => {
    const spy = vi.fn()
    const App = () => {
      const [count, setCount] = useState(0)
      useEffect(() => {
        spy(count)
      })
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

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('deps が同じ間は再実行されない', async () => {
    const spy = vi.fn()
    const App = () => {
      const [count, setCount] = useState(0)
      // deps が固定 → 初回のみ走る
      useEffect(() => {
        spy()
      }, [])
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
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(1) // 増えない
  })

  it('deps に含まれない state を変えても effect は再実行されない', async () => {
    const spy = vi.fn()
    const App = () => {
      const [count, setCount] = useState(0)
      const [other, setOther] = useState('a')
      useEffect(() => {
        spy(count)
      }, [count]) // deps は count のみ。other は無関係
      return createElement(
        'div',
        null,
        createElement(
          'button',
          { id: 'count-btn', onClick: () => setCount(count + 1) },
          `count:${count}`,
        ),
        createElement(
          'button',
          {
            id: 'other-btn',
            onClick: () => setOther(other === 'a' ? 'b' : 'a'),
          },
          `other:${other}`,
        ),
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(spy).toHaveBeenCalledTimes(1) // 初回

    // count を変えると走る
    ;(container.querySelector('#count-btn') as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(2)

    // other を変えても走らない (deps に other はない)
    ;(container.querySelector('#other-btn') as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(2) // 増えない

    ;(container.querySelector('#other-btn') as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spy).toHaveBeenCalledTimes(2) // やっぱり増えない
  })

  it('cleanup が次の effect 前に走る', async () => {
    const order: string[] = []
    const App = () => {
      const [count, setCount] = useState(0)
      useEffect(() => {
        order.push(`effect:${count}`)
        return () => {
          order.push(`cleanup:${count}`)
        }
      }, [count])
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(order).toEqual(['effect:0'])

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(order).toEqual(['effect:0', 'cleanup:0', 'effect:1'])

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(order).toEqual([
      'effect:0',
      'cleanup:0',
      'effect:1',
      'cleanup:1',
      'effect:2',
    ])
  })
})

describe('useEffect: unmount cleanup', () => {
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

  it('コンポーネントが消えたときに cleanup が走る', async () => {
    const cleanup = vi.fn()
    const Child = () => {
      useEffect(() => {
        return cleanup
      }, [])
      return createElement('span', null, 'child')
    }
    const App = ({ show }: { show: boolean }) =>
      show
        ? createElement(Child, null)
        : createElement('span', null, 'placeholder')

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { show: true }))
    expect(cleanup).not.toHaveBeenCalled()

    // Child を消す
    root.render(createElement(App as unknown as Function, { show: false }))
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('深い場所のコンポーネント削除時も cleanup が走る', async () => {
    const cleanup = vi.fn()
    const Inner = () => {
      useEffect(() => cleanup, [])
      return createElement('span', null, 'inner')
    }
    const Outer = ({ show }: { show: boolean }) =>
      createElement(
        'div',
        null,
        show ? createElement(Inner, null) : null,
      )

    const root = createRoot(container)
    root.render(createElement(Outer as unknown as Function, { show: true }))
    expect(cleanup).not.toHaveBeenCalled()

    root.render(createElement(Outer as unknown as Function, { show: false }))
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})

describe('useEffect: その他', () => {
  beforeEach(() => {
    _clearHooksForTesting()
  })

  it('render 外で useEffect を呼ぶと throw', () => {
    expect(() => useEffect(() => undefined, [])).toThrow(/render/)
  })

  it('複数の useEffect を独立して扱える', async () => {
    const spyA = vi.fn()
    const spyB = vi.fn()
    const _resetSchedulerForTesting2 = (
      await import('../src/work-loop')
    )._resetSchedulerForTesting
    _resetSchedulerForTesting2()
    const container = document.createElement('div')

    const App = () => {
      const [count, setCount] = useState(0)
      useEffect(() => spyA(count), [count])  // 毎 click で走る
      useEffect(() => spyB(), [])             // 1 回だけ
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(spyA).toHaveBeenCalledTimes(1)
    expect(spyB).toHaveBeenCalledTimes(1)

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect(spyA).toHaveBeenCalledTimes(2)
    expect(spyB).toHaveBeenCalledTimes(1) // 増えない
  })
})
