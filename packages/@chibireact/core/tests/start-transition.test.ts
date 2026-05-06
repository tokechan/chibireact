import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  startTransition,
  useState,
  useTransition,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

const flushAll = async () => {
  // microtask + 1 setTimeout 0 + microtask
  await flushMicrotasks()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await flushMicrotasks()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await flushMicrotasks()
}

/**
 * Part 5.2: startTransition / useTransition のテスト。
 *
 * 本書 chibireact の最小実装では setState が hook.state を即時 mutate する設計のため、
 * 「urgent と transition の値が分離した状態を render で観察する」ことは困難。
 * そのためテストは以下の **観察可能な挙動** に絞る:
 *   - startTransition 単独の setState が microtask だけでは反映されず setTimeout で反映される
 *   - useTransition の isPending が transition 中 true → 完了後 false に戻る
 *   - ネストした startTransition がエラーを起こさない
 */
describe('startTransition', () => {
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

  it('startTransition のみの setState は microtask だけでは commit されず setTimeout で commit', async () => {
    const renders: string[] = []
    const App = () => {
      const [v, setV] = useState('initial')
      renders.push(v)
      return createElement(
        'button',
        {
          onClick: () =>
            startTransition(() => {
              setV('updated')
            }),
        },
        v,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(renders).toEqual(['initial'])

    ;(container.firstChild as HTMLButtonElement).click()

    // microtask フラッシュだけでは transition は反映されない
    await flushMicrotasks()
    expect(renders).toEqual(['initial'])

    // setTimeout が走って初めて反映
    await new Promise<void>((r) => setTimeout(r, 0))
    await flushMicrotasks()
    expect(renders[renders.length - 1]).toBe('updated')
  })

  it('startTransition のネストはエラーを起こさず最終的に commit される', async () => {
    const renders: string[] = []
    const App = () => {
      const [a, setA] = useState('a0')
      const [b, setB] = useState('b0')
      renders.push(`${a}/${b}`)
      return createElement(
        'button',
        {
          onClick: () => {
            startTransition(() => {
              setA('a1')
              startTransition(() => {
                setB('b1')
              })
            })
          },
        },
        'click',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushAll()

    expect(renders[renders.length - 1]).toBe('a1/b1')
  })

  it('urgent と transition を混ぜたら最終的に両方反映される', async () => {
    const renders: string[] = []
    const App = () => {
      const [u, setU] = useState('u0')
      const [t, setT] = useState('t0')
      renders.push(`${u}/${t}`)
      return createElement(
        'button',
        {
          onClick: () => {
            setU('u1')
            startTransition(() => setT('t1'))
          },
        },
        'click',
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushAll()

    expect(renders[renders.length - 1]).toBe('u1/t1')
  })

  it('startTransition は同期実行 (fn 自体は即時に呼ばれる)', () => {
    let called = false
    startTransition(() => {
      called = true
    })
    expect(called).toBe(true)
  })
})

describe('useTransition', () => {
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

  it('isPending が transition 中 true → 完了後 false に戻る', async () => {
    const renders: string[] = []
    const App = () => {
      const [v, setV] = useState('initial')
      const [isPending, start] = useTransition()
      renders.push(`${isPending}/${v}`)
      return createElement(
        'button',
        {
          onClick: () =>
            start(() => {
              setV('updated')
            }),
        },
        v,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(renders).toEqual(['false/initial'])

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    // 1 回目の再 render で isPending=true、value はまだ
    expect(renders[renders.length - 1]).toBe('true/initial')

    // setTimeout 待ち (transition + setPending(false))
    await flushAll()
    await flushAll()

    // 最終的に isPending=false, value=updated
    expect(renders[renders.length - 1]).toBe('false/updated')
  })

  it('start は関数として呼べる (使い勝手)', async () => {
    const App = () => {
      const [, start] = useTransition()
      // コンパイルエラーや実行時エラーが出ないこと
      const ok = typeof start === 'function'
      return createElement('span', null, `${ok}`)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    expect(container.firstChild?.textContent).toBe('true')
  })
})
