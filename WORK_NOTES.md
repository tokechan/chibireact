# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-05（ラウンド 8: Part 2.5 RIC スケジューラ）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep` (Part 2 終了まではこのブランチを継続。Part 3 で新ブランチに切る運用に変更済)

---

## ⚠️ レビュー時の優先確認事項

1. **`scheduleFiberRoot` を `runFiberRoot` と並列共存**: API が 3 種類 (`render` / `runFiberRoot` / `scheduleFiberRoot`) になっているが、Part 2.7 で `render` と `runFiberRoot` を畳む計画。共存期間が長すぎないか
2. **setTimeout フォールバック** の deadline 計算が「16ms 全部使える」体の決め打ち。実際のフレーム余裕が分からない環境での近似として妥当か
3. **テスト用 `_resetSchedulerForTesting()` を export している**: 本番 API ではないが index.ts には出していない。命名・露出範囲の判断
4. **`isScheduled` フラグの 1-root 前提**: 複数 root の同時スケジュールは未対応。Part 2.6 の setState 連動再描画で問題になる可能性あり

---

## このセッションでやったこと（ラウンド 8: Part 2.5）

### Part 2.5 requestIdleCallback と最小スケジューラ（NEW）
- `scheduler.ts` 新設:
  - `requestIdleWork(callback)`: グローバル `requestIdleCallback` があれば委譲、無ければ setTimeout フォールバック
  - `IdleDeadline` / `IdleWorkCallback` 型を export
  - `performance.now()` を経由した deadline 残り時間計算（Date.now にもフォールバック）
- `work-loop.ts` を拡張:
  - `scheduleFiberRoot(element, container)`: 中断可能な非同期版
  - 内部 `workLoopStep(deadline)`: `deadline.timeRemaining() < 1` で yield、残作業があれば再 RIC
  - `isScheduled` フラグで二重スケジュール防止
  - 既存 `runFiberRoot` (同期版) は変更なし
  - テスト用 `_resetSchedulerForTesting()` を追加
- `index.ts` から `scheduleFiberRoot` / `requestIdleWork` / `IdleDeadline` 型を export
- 9 テスト pass:
  - `scheduler.test.ts` (3): RIC 委譲 / フォールバック動作 / deadline.timeRemaining
  - `work-loop-scheduler.test.ts` (6): 非同期描画 / 関数コンポ / イベント / yield 挙動
- 本文 `050-scheduler.mdx` 執筆（RIC 解説 / setTimeout フォールバック / 同期版との比較表 / テストでの polyfill 戦略）
- `_meta.js` に章追加、040 章の「執筆中」リンク撤去

→ **Part 2 が 5 章まで進んだ。残り 2 章 (2.6 二重バッファ / 2.7 commit phase)。**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 2.5 ページ (`/20-fiber/050-scheduler`) | HTTP 200 |
| Vitest テスト | **112/112 pass** (14 ファイル) |
| TS typecheck | scheduler.ts / work-loop.ts は緑。render.ts の pre-existing エラー 7 件は据え置き |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (ラウンド 8 分・予定)

```
feat(part2): 2.5 requestIdleCallback と最小スケジューラ
docs: WORK_NOTES.md ラウンド 8 (Part 2.5 スケジューラ) で更新
```

---

## 累計成果物

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts
├── create-element.ts
├── render.ts
├── hooks-state.ts
├── jsx-types.ts
├── fiber.ts
├── work-loop.ts      (scheduleFiberRoot / workLoopStep を追加)
├── scheduler.ts      (NEW: requestIdleWork ラッパ)
└── index.ts          (scheduleFiberRoot / requestIdleWork を export)

tests/  (14 ファイル / 112 テスト)
├── create-root.test.ts        (3)
├── create-element.test.ts     (8)
├── create-element-key.test.ts (5)
├── render.test.ts             (7)
├── render-props.test.ts      (10)
├── render-events.test.ts      (9)
├── render-children.test.ts   (10)
├── render-function-components.test.ts (9)
├── hooks-state.test.ts        (5)
├── hooks-batching.test.ts     (3)
├── fiber.test.ts             (15)
├── work-loop.test.ts         (19)
├── scheduler.test.ts          (3) NEW
└── work-loop-scheduler.test.ts (6) NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章中 5 章)
  010 Reconciliation の前提知識
  020 Stack Reconciler の限界
  030 Fiber Node とは何か
  040 work loop と作業の単位化
  050 requestIdleCallback と最小スケジューラ   NEW
```

---

## レビューしてほしいポイント

### A. API 3 種類並存の状態
`render` (Part 1) / `runFiberRoot` (Part 2.4) / `scheduleFiberRoot` (Part 2.5) の 3 種類が共存中。
教育的に「段階を追える」利点がある反面、ユーザーが混乱する可能性も。Part 2.7 で `render` と `runFiberRoot` を廃止 → `scheduleFiberRoot` を `createRoot` の中で使う、という畳み方を計画。

### B. setTimeout フォールバックの精度
「16ms 全部使える」体の決め打ち。本物の RIC は次フレームまでの残り時間を正確に返すが、setTimeout ではその情報なし。「楽観的に 16ms」がフォールバックとして妥当か。
本家 React は `MessageChannel` ベースで精度を上げているが、本書は教育目的のため簡易化。

### C. テスト戦略 (jsdom polyfill)
jsdom には `requestIdleCallback` が無いので、テスト側で `globalThis.requestIdleCallback` を polyfill して RIC 経由分岐に乗せている。これにより deadline を完全支配できるが、本番との挙動差は説明が必要。

### D. `_resetSchedulerForTesting` の露出
work-loop.ts から export しているが、index.ts には出していない。テスト専用の internal API として `_` prefix で表現。Part 1 の `_resetHooks` と同じ流儀。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | このブランチを push して PR 作成 | 1 分 |
| **b** | Part 2.6「二重バッファ: current ツリーと workInProgress」 | 3-5 時間 |
| **c** | Part 2.7「Commit phase と副作用フラグ」 | 3-4 時間 |
| **d** | render.ts の TS narrowing 問題を fiber.ts と同じ型ガード方式で修正 | 30 分 |
| **e** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**個人的推奨**: a (push) で中間レビュー → b (二重バッファ) で「再描画でも DOM が壊れない」状態に。
2.6 が Part 2 の山場で、reconciliation の本質。これをやり切ると `createRoot` を Fiber 版に差し替える前段が整う。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
