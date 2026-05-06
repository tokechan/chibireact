import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  useDeferredValue,
  _clearHooksForTesting,
} from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

const flushTimers = async () => {
  await flushMicrotasks()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await flushMicrotasks()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  await flushMicrotasks()
}

describe('useDeferredValue', () => {
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

  it('初回 render では deferred = value', () => {
    type Props = { value: string }
    const App = (props: Props) => {
      const d = useDeferredValue(props.value)
      return createElement('span', null, `${props.value}/${d}`)
    }

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { value: 'a' }))
    expect(container.firstChild?.textContent).toBe('a/a')
  })

  it('value が変わると deferred は最終的に追従する', async () => {
    type Props = { value: string }
    const renders: string[] = []
    const App = (props: Props) => {
      const d = useDeferredValue(props.value)
      renders.push(`${props.value}/${d}`)
      return createElement('span', null, `${props.value}/${d}`)
    }

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { value: 'a' }))
    expect(renders[renders.length - 1]).toBe('a/a')

    // value を 'b' に変更
    root.render(createElement(App as unknown as Function, { value: 'b' }))
    // urgent rerender で value=b、deferred は古い 'a' のまま
    expect(renders[renders.length - 1]).toBe('b/a')

    // setTimeout 待ち → transition rerender で deferred 追従
    await flushTimers()
    expect(renders[renders.length - 1]).toBe('b/b')
  })

  it('value が連続して変わっても最終値に収束', async () => {
    type Props = { value: number }
    const renders: string[] = []
    const App = (props: Props) => {
      const d = useDeferredValue(props.value)
      renders.push(`${props.value}/${d}`)
      return createElement('span', null, `${d}`)
    }

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { value: 0 }))

    root.render(createElement(App as unknown as Function, { value: 1 }))
    root.render(createElement(App as unknown as Function, { value: 2 }))
    root.render(createElement(App as unknown as Function, { value: 3 }))

    await flushTimers()
    await flushTimers()

    // 最終的に deferred も 3 に収束する
    expect(renders[renders.length - 1]).toBe('3/3')
  })

  it('オブジェクトでも参照同一性で比較される', async () => {
    type Props = { obj: { x: number } }
    const obj = { x: 1 }
    const renders: { x: number }[] = []
    const App = (props: Props) => {
      const d = useDeferredValue(props.obj)
      renders.push(d)
      return createElement('span', null, `${d.x}`)
    }

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { obj }))
    // 同じ参照を再 render
    root.render(createElement(App as unknown as Function, { obj }))
    await flushTimers()

    // 全 render で同じ参照
    for (const r of renders) {
      expect(r).toBe(obj)
    }
  })
})
