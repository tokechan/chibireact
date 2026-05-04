import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  scheduleFiberRoot,
  _resetSchedulerForTesting,
} from '../src/work-loop'
import { createElement } from '../src/create-element'

/**
 * Part 2.5: スケジューラ版 work loop の振る舞いを検証する。
 *
 * 環境メモ:
 *   jsdom には `requestIdleCallback` がないので、本テストでは
 *   `globalThis.requestIdleCallback` を **テスト側で polyfill** する。
 *   こうすると本番コードの「RIC があればそれを使う」分岐に乗る。
 *   deadline は完全にテスト側で支配できるため、yield の挙動も観察しやすい。
 */

type AnyGlobal = { requestIdleCallback?: unknown }
type IdleDeadlineLike = {
  timeRemaining: () => number
  didTimeout: boolean
}
type IdleCallbackLike = (deadline: IdleDeadlineLike) => void

/** 「いつでも 50ms 余裕がある」体の RIC polyfill。中断なしで完走する。 */
function installRicWithUnlimitedTime(): void {
  ;(globalThis as AnyGlobal).requestIdleCallback = (cb: IdleCallbackLike) => {
    queueMicrotask(() =>
      cb({ timeRemaining: () => 50, didTimeout: false }),
    )
    return 0
  }
}

/** N ユニット処理ごとに「時間切れ」になる RIC polyfill。yield を強制する。 */
function installRicYieldingEvery(unitsPerCallback: number): {
  ricCallCount: () => number
} {
  let callCount = 0
  ;(globalThis as AnyGlobal).requestIdleCallback = (cb: IdleCallbackLike) => {
    callCount++
    queueMicrotask(() => {
      let remaining = unitsPerCallback
      cb({
        timeRemaining: () => (remaining-- > 0 ? 10 : 0),
        didTimeout: false,
      })
    })
    return 0
  }
  return { ricCallCount: () => callCount }
}

/** queueMicrotask で連鎖した RIC が全部消化されるまで await する。 */
async function flushScheduledWork(): Promise<void> {
  // 連続 microtask + setTimeout 0 で十分な flush を行う
  for (let i = 0; i < 100; i++) {
    await Promise.resolve()
  }
  await new Promise((r) => setTimeout(r, 0))
  for (let i = 0; i < 100; i++) {
    await Promise.resolve()
  }
}

describe('scheduleFiberRoot: 同期版と同じ DOM 出力', () => {
  let container: HTMLElement
  let originalRic: unknown

  beforeEach(() => {
    container = document.createElement('div')
    originalRic = (globalThis as AnyGlobal).requestIdleCallback
    _resetSchedulerForTesting()
  })

  afterEach(() => {
    if (originalRic === undefined) {
      delete (globalThis as AnyGlobal).requestIdleCallback
    } else {
      ;(globalThis as AnyGlobal).requestIdleCallback = originalRic
    }
    _resetSchedulerForTesting()
  })

  it('単純な要素が描画される', async () => {
    installRicWithUnlimitedTime()
    scheduleFiberRoot(createElement('h1', null, 'Hello'), container)

    expect(container.firstChild).toBeNull() // すぐには描画されない (非同期)
    await flushScheduledWork()

    expect(container.firstChild?.nodeName).toBe('H1')
    expect(container.firstChild?.textContent).toBe('Hello')
  })

  it('入れ子と複数子が正しく描画される', async () => {
    installRicWithUnlimitedTime()
    scheduleFiberRoot(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
        createElement('li', null, 'C'),
      ),
      container,
    )
    await flushScheduledWork()

    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.textContent).toBe('ABC')
  })

  it('関数コンポーネントも描画される', async () => {
    installRicWithUnlimitedTime()
    type Props = { name: string }
    const Greet = (props: Props) =>
      createElement('span', null, `hi, ${props.name}`)
    scheduleFiberRoot(
      createElement(Greet as unknown as Function, { name: 'world' }),
      container,
    )
    await flushScheduledWork()

    expect((container.firstChild as HTMLElement).textContent).toBe('hi, world')
  })

  it('イベントハンドラが配線される', async () => {
    installRicWithUnlimitedTime()
    const onClick = vi.fn()
    scheduleFiberRoot(
      createElement('button', { onClick }, 'click'),
      container,
    )
    await flushScheduledWork()

    ;(container.firstChild as HTMLButtonElement).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('scheduleFiberRoot: yield と再開', () => {
  let container: HTMLElement
  let originalRic: unknown

  beforeEach(() => {
    container = document.createElement('div')
    originalRic = (globalThis as AnyGlobal).requestIdleCallback
    _resetSchedulerForTesting()
  })

  afterEach(() => {
    if (originalRic === undefined) {
      delete (globalThis as AnyGlobal).requestIdleCallback
    } else {
      ;(globalThis as AnyGlobal).requestIdleCallback = originalRic
    }
    _resetSchedulerForTesting()
  })

  it('deadline が切れると複数回 RIC が呼ばれる（複数ユニットを跨ぐ）', async () => {
    // 1 callback あたり 1 ユニット処理して yield する設定
    const { ricCallCount } = installRicYieldingEvery(1)
    scheduleFiberRoot(
      createElement(
        'ul',
        null,
        createElement('li', null, 'A'),
        createElement('li', null, 'B'),
        createElement('li', null, 'C'),
      ),
      container,
    )
    await flushScheduledWork()

    // ノード数だけ RIC が連鎖して呼ばれているはず (ROOT + ul + li × 3 + text × 3 = 8 ユニット)
    // 1 callback = 1 unit なので、最低でもユニット数分の callback が発生する
    expect(ricCallCount()).toBeGreaterThan(1)
    // 最終的な DOM は完成している
    const ul = container.firstChild as HTMLElement
    expect(ul.children.length).toBe(3)
    expect(ul.textContent).toBe('ABC')
  })

  it('1 度に複数ユニット処理する設定でも完走する', async () => {
    const { ricCallCount } = installRicYieldingEvery(3)
    scheduleFiberRoot(
      createElement(
        'div',
        null,
        createElement('span', null, 'a'),
        createElement('span', null, 'b'),
      ),
      container,
    )
    await flushScheduledWork()

    expect(ricCallCount()).toBeGreaterThanOrEqual(1)
    expect((container.firstChild as HTMLElement).textContent).toBe('ab')
  })
})
