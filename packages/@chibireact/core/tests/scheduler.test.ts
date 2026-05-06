import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { requestIdleWork } from '../src/scheduler'

/**
 * Part 2.5 のスケジューラ薄ラッパのテスト。
 *
 * 振る舞い:
 *   - グローバル `requestIdleCallback` があればそれに委譲する
 *   - 無ければ `setTimeout` ベースのフォールバックで callback を呼ぶ
 *   - フォールバックでも deadline.timeRemaining が呼べる
 */
describe('requestIdleWork', () => {
  type AnyGlobal = { requestIdleCallback?: unknown }
  let originalRic: unknown

  beforeEach(() => {
    originalRic = (globalThis as AnyGlobal).requestIdleCallback
  })

  afterEach(() => {
    if (originalRic === undefined) {
      delete (globalThis as AnyGlobal).requestIdleCallback
    } else {
      ;(globalThis as AnyGlobal).requestIdleCallback = originalRic
    }
  })

  it('グローバル requestIdleCallback があればそれに委譲する', () => {
    const ricSpy = vi.fn()
    ;(globalThis as AnyGlobal).requestIdleCallback = ricSpy

    const cb = vi.fn()
    requestIdleWork(cb)

    expect(ricSpy).toHaveBeenCalledTimes(1)
    expect(ricSpy).toHaveBeenCalledWith(cb)
  })

  it('requestIdleCallback が無ければ setTimeout フォールバックで callback を呼ぶ', async () => {
    delete (globalThis as AnyGlobal).requestIdleCallback

    const cb = vi.fn()
    requestIdleWork(cb)

    expect(cb).not.toHaveBeenCalled() // setTimeout なので非同期
    await new Promise((r) => setTimeout(r, 10))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('フォールバックの deadline.timeRemaining は数値を返す', async () => {
    delete (globalThis as AnyGlobal).requestIdleCallback

    const received: number[] = []
    requestIdleWork((deadline) => {
      received.push(deadline.timeRemaining())
    })
    await new Promise((r) => setTimeout(r, 10))

    expect(received.length).toBe(1)
    expect(typeof received[0]).toBe('number')
    expect(received[0]).toBeGreaterThanOrEqual(0)
  })
})
