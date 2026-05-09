import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createElement,
  createRoot,
  useState,
  _resetMiniReactForTesting,
} from '../src/mini-react'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

/**
 * Part 7 / 付録 A.1: 1 ファイル版 mini-react のテスト。
 * 「これだけで Counter が動く」を実証する。
 */
describe('mini-react: 1 ファイル版', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetMiniReactForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetMiniReactForTesting()
  })

  it('単純な要素を描画できる', () => {
    const root = createRoot(container)
    root.render(createElement('h1', null, 'Hello'))
    expect(container.firstChild?.nodeName).toBe('H1')
    expect(container.firstChild?.textContent).toBe('Hello')
  })

  it('入れ子と複数子要素', () => {
    const root = createRoot(container)
    root.render(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
        createElement('li', null, 'C'),
      ),
    )
    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.textContent).toBe('ABC')
  })

  it('関数コンポーネントが動く', () => {
    type Props = { name: string }
    const Greet = (props: Props) =>
      createElement('span', null, `hello, ${props.name}`)

    const root = createRoot(container)
    root.render(
      createElement(Greet as unknown as Function, { name: 'world' }),
    )
    expect(container.firstChild?.textContent).toBe('hello, world')
  })

  it('useState で Counter が動く (本書のクライマックス再現)', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${count}`,
      )
    }

    const root = createRoot(container)
    root.render(createElement(Counter, null))

    const button = container.firstChild as HTMLButtonElement
    expect(button.textContent).toBe('0')

    button.click()
    await flushMicrotasks()

    const button2 = container.firstChild as HTMLButtonElement
    expect(button2).toBe(button) // DOM identity 保存
    expect(button2.textContent).toBe('1')

    button2.click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLButtonElement).textContent).toBe('2')
  })

  it('複数 Counter が独立した state を持つ (per-fiber hooks)', async () => {
    const Counter = ({ id }: { id: string }) => {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        {
          'data-id': id,
          onClick: () => setCount(count + 1),
        },
        `${id}:${count}`,
      )
    }
    const App = () =>
      createElement(
        'div',
        null,
        createElement(Counter as unknown as Function, { id: 'a' }),
        createElement(Counter as unknown as Function, { id: 'b' }),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const wrapper = container.firstChild as HTMLElement
    const a = wrapper.children[0] as HTMLButtonElement
    const b = wrapper.children[1] as HTMLButtonElement

    expect(a.textContent).toBe('a:0')
    expect(b.textContent).toBe('b:0')

    a.click()
    await flushMicrotasks()

    expect((wrapper.children[0] as HTMLElement).textContent).toBe('a:1')
    expect((wrapper.children[1] as HTMLElement).textContent).toBe('b:0')
  })

  it('条件付きレンダリングで子要素の追加・削除', async () => {
    const App = ({ show }: { show: boolean }) =>
      createElement(
        'div',
        null,
        createElement('span', null, 'always'),
        show ? createElement('span', null, 'sometimes') : null,
      )

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { show: true }))
    expect((container.firstChild as HTMLElement).children.length).toBe(2)

    root.render(createElement(App as unknown as Function, { show: false }))
    expect((container.firstChild as HTMLElement).children.length).toBe(1)
    expect((container.firstChild as HTMLElement).textContent).toBe('always')
  })

  it('再 render で DOM identity が保たれる', async () => {
    const App = ({ value }: { value: string }) =>
      createElement('div', { className: value }, value)

    const root = createRoot(container)
    root.render(createElement(App as unknown as Function, { value: 'a' }))
    const div1 = container.firstChild as HTMLElement

    root.render(createElement(App as unknown as Function, { value: 'b' }))
    const div2 = container.firstChild as HTMLElement
    expect(div2).toBe(div1)
    expect(div2.className).toBe('b')
    expect(div2.textContent).toBe('b')
  })
})
