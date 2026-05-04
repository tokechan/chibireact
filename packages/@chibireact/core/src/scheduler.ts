/**
 * 最小スケジューラ (Part 2.5)。
 *
 * ブラウザのメインスレッドが「次のフレーム描画まで何 ms 余裕があるか」を
 * 教えてくれる仕組みが `requestIdleCallback` (RIC)。これを呼び出した callback は
 * **アイドル時間** に実行され、deadline 引数で残り時間を確認できる。
 *
 * 本書ではこのスケジューラの薄いラッパだけを作る。中身は次の 2 段:
 *   1. `requestIdleCallback` がブラウザにあれば使う (Chrome/Firefox/Edge)
 *   2. 無ければ `setTimeout` ベースの簡易フォールバック (Safari の代替・テスト環境)
 *
 * 本家 React は Safari で使えない RIC を捨て、`MessageChannel` を使った
 * 独自スケジューラ (Scheduler パッケージ) を採用している。本書 chibireact は
 * 教育目的のため最小化し、深い差分は「ちょっと深掘り」節に書く。
 */

/**
 * `requestIdleCallback` の deadline 引数の型。標準 lib に型がない環境にも
 * 対応するため、ここで明示的に再定義する。
 */
export type IdleDeadline = {
  /** 次のフレーム描画までの残り時間 (ms)。0 に近づいたら yield すべき。 */
  timeRemaining: () => number
  /** タイムアウト指定で強制実行されたかどうか。 */
  didTimeout: boolean
}

/** スケジューラに渡される callback の型。 */
export type IdleWorkCallback = (deadline: IdleDeadline) => void

/**
 * テスト・他 OS 互換のために `requestIdleCallback` の存在を都度確認する。
 * グローバルに定義されていればそれを、無ければ setTimeout フォールバックを使う。
 *
 * @example
 *   requestIdleWork((deadline) => {
 *     while (deadline.timeRemaining() > 1 && hasMoreWork) {
 *       doNextUnit()
 *     }
 *     if (hasMoreWork) requestIdleWork(workLoopStep) // 再スケジュール
 *   })
 */
export function requestIdleWork(callback: IdleWorkCallback): void {
  const ric = (globalThis as { requestIdleCallback?: unknown })
    .requestIdleCallback
  if (typeof ric === 'function') {
    ;(ric as (cb: IdleWorkCallback) => number)(callback)
    return
  }
  // フォールバック: setTimeout で「16ms 全部使える」体の deadline を作る。
  // 厳密性は犠牲にしているが「中断する仕組みは動く」教育目的に十分。
  setTimeout(() => {
    const start = performanceNow()
    callback({
      timeRemaining: () => Math.max(0, 16 - (performanceNow() - start)),
      didTimeout: false,
    })
  }, 0)
}

function performanceNow(): number {
  const p = (globalThis as { performance?: { now?: () => number } }).performance
  if (p && typeof p.now === 'function') return p.now()
  return Date.now()
}
