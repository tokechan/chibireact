import { describe, it, expect, beforeEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { useState, _clearHooksForTesting } from '../src/hooks-state'

/** 次のマイクロタスクまで待つヘルパー */
const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useState', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    _clearHooksForTesting()
  })

  it('初期値で状態を持ち、ボタンクリックで更新できます (Counter)', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(Counter, null))

    const button = container.firstChild as HTMLButtonElement
    expect(button.textContent).toBe('0')

    button.click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('1')

    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('2')
  })

  it('関数型の setState (prev => next) で安全に更新できます', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount((prev) => prev + 1) },
        count,
      )
    }

    const root = createRoot(container)
    root.render(createElement(Counter, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect((container.firstChild as HTMLButtonElement).textContent).toBe('3')
  })

  it('複数の useState 呼び出しを同じ順序で扱えます', async () => {
    const Form = () => {
      const [name, setName] = useState('')
      const [age, setAge] = useState(0)
      return createElement(
        'div',
        null,
        createElement('span', { id: 'name' }, name),
        createElement('span', { id: 'age' }, age),
        createElement(
          'button',
          {
            id: 'btn',
            onClick: () => {
              setName('tokechan')
              setAge(99)
            },
          },
          'set',
        ),
      )
    }

    const root = createRoot(container)
    root.render(createElement(Form, null))

    const btn = container.querySelector('#btn') as HTMLButtonElement
    btn.click()
    await flushMicrotasks()

    // クリック後の DOM
    expect(container.querySelector('#name')?.textContent).toBe('tokechan')
    expect(container.querySelector('#age')?.textContent).toBe('99')
  })

  it('同じ値を setState しても再レンダはスキップします (Object.is)', async () => {
    let renderCount = 0
    const App = () => {
      renderCount++
      const [v, setV] = useState(42)
      return createElement(
        'button',
        { onClick: () => setV(42) }, // 同じ値
        v,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    const initialRenderCount = renderCount
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect(renderCount).toBe(initialRenderCount) // 増えない
  })

  it('オブジェクトを state として持てます', async () => {
    type User = { name: string; count: number }
    const App = () => {
      const [user, setUser] = useState<User>({ name: 'a', count: 0 })
      return createElement(
        'button',
        { onClick: () => setUser({ ...user, count: user.count + 1 }) },
        `${user.name}:${user.count}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(App, null))
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()
    ;(container.firstChild as HTMLButtonElement).click()
    await flushMicrotasks()

    expect((container.firstChild as HTMLButtonElement).textContent).toBe('a:2')
  })
})
