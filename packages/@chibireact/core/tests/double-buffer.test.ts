import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  runFiberRoot,
  _resetSchedulerForTesting,
} from '../src/work-loop'
import { createElement } from '../src/create-element'

/**
 * Part 2.6 二重バッファのテスト。
 *
 * 検証したい振る舞い:
 *   - 同じ container に 2 回 render すると、同じ type の DOM ノードは **再利用される**
 *     (DOM identity が保たれる → focus / 内部 state が消えない前提条件)
 *   - 子の追加・削除が DOM に正しく反映される
 *   - text 内容の更新は文字列差し替えだけで済む
 *   - イベントリスナの差し替えで多重登録されない
 *   - 関数コンポーネントの再呼び出しで新しい props が反映される
 */
describe('double buffer: DOM 再利用', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
  })

  it('同じ type の root で再 render すると DOM identity が保たれる', () => {
    runFiberRoot(createElement('div', { className: 'a' }), container)
    const first = container.firstChild as HTMLElement
    expect(first).not.toBeNull()
    expect(first.className).toBe('a')

    runFiberRoot(createElement('div', { className: 'b' }), container)
    const second = container.firstChild as HTMLElement
    // 同じノードを再利用（参照が同一）
    expect(second).toBe(first)
    expect(second.className).toBe('b')
  })

  it('text 内容が変わったときは Text ノードを再利用して nodeValue だけ更新', () => {
    runFiberRoot(createElement('p', null, 'hello'), container)
    const p1 = container.firstChild as HTMLElement
    const text1 = p1.firstChild as Text
    expect(text1.nodeValue).toBe('hello')

    runFiberRoot(createElement('p', null, 'world'), container)
    const p2 = container.firstChild as HTMLElement
    const text2 = p2.firstChild as Text
    expect(p2).toBe(p1)
    expect(text2).toBe(text1)
    expect(text2.nodeValue).toBe('world')
  })

  it('type が変わったら DOM を作り直す', () => {
    runFiberRoot(createElement('div', null), container)
    const oldNode = container.firstChild as HTMLElement
    expect(oldNode.nodeName).toBe('DIV')

    runFiberRoot(createElement('span', null), container)
    const newNode = container.firstChild as HTMLElement
    expect(newNode.nodeName).toBe('SPAN')
    expect(newNode).not.toBe(oldNode) // 別物
  })
})

describe('double buffer: 子要素の追加・削除', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
  })

  it('子の追加: 既存の子は維持され、新しい子が増える', () => {
    runFiberRoot(
      createElement('ul', null, createElement('li', null, 'A')),
      container,
    )
    const ul = container.firstChild as HTMLElement
    const liA = ul.children[0]
    expect(ul.children.length).toBe(1)

    runFiberRoot(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
      ),
      container,
    )
    expect(ul.children.length).toBe(2)
    // 1 個目の li は再利用されている
    expect(ul.children[0]).toBe(liA)
    expect(ul.children[1].textContent).toBe('B')
  })

  it('子の削除: 余った子は DOM から消える', () => {
    runFiberRoot(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
        createElement('li', null, 'C'),
      ),
      container,
    )
    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)

    runFiberRoot(
      createElement('ul', null, createElement('li', null, 'A')),
      container,
    )
    expect(ul.children.length).toBe(1)
    expect(ul.children[0].textContent).toBe('A')
  })

  it('子を全部消すとコンテナの中が空になる', () => {
    runFiberRoot(
      createElement(
        'div',
        null,
        createElement('span', null, 'a'),
        createElement('span', null, 'b'),
      ),
      container,
    )
    const div = container.firstChild as HTMLElement
    expect(div.children.length).toBe(2)

    runFiberRoot(createElement('div', null), container)
    expect(div.children.length).toBe(0)
  })
})

describe('double buffer: イベントリスナの取り回し', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
  })

  it('イベントハンドラの差し替えで多重登録されない', () => {
    const first = vi.fn()
    runFiberRoot(
      createElement('button', { onClick: first }, 'click'),
      container,
    )
    const button = container.firstChild as HTMLButtonElement
    button.click()
    expect(first).toHaveBeenCalledTimes(1)

    const second = vi.fn()
    runFiberRoot(
      createElement('button', { onClick: second }, 'click'),
      container,
    )
    button.click()
    // first は 2 回目クリックでは呼ばれない (差し替えられた)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('double buffer: 関数コンポーネント', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
  })

  it('同じ関数コンポーネントを再 render すると DOM が再利用される', () => {
    type Props = { name: string }
    const Greet = (props: Props) =>
      createElement('span', null, `hello, ${props.name}`)

    runFiberRoot(
      createElement(Greet as unknown as Function, { name: 'first' }),
      container,
    )
    const span1 = container.firstChild as HTMLElement
    expect(span1.textContent).toBe('hello, first')

    runFiberRoot(
      createElement(Greet as unknown as Function, { name: 'second' }),
      container,
    )
    const span2 = container.firstChild as HTMLElement
    expect(span2).toBe(span1) // DOM 再利用
    expect(span2.textContent).toBe('hello, second')
  })

  it('関数コンポーネントが変わったら DOM が作り直される', () => {
    const A = () => createElement('span', null, 'A')
    const B = () => createElement('div', null, 'B')

    runFiberRoot(createElement(A, null), container)
    const first = container.firstChild as HTMLElement
    expect(first.nodeName).toBe('SPAN')

    runFiberRoot(createElement(B, null), container)
    const second = container.firstChild as HTMLElement
    expect(second.nodeName).toBe('DIV')
    expect(second).not.toBe(first)
  })
})
