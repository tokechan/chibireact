# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-06（ラウンド 11: Part 2 完走 + Part 3 着手 3.1-3.4）
実行者: Claude (Opus 4.7)
ブランチ:
- `feat/part0-content-and-prep` — Part 2 全章 (2.3-2.7) を載せた状態。本日 push 済み待ち
- `feat/part3-hooks` — Part 2 tip から派生。Part 3.1-3.4 を載せた状態 (現在ここ)

---

## ⚠️ レビュー時の優先確認事項

1. **Part 2 完走 (2.3〜2.7)** を `feat/part0-content-and-prep` に push 済み。Part 3 PR は Part 2 PR がマージされた後に rebase 想定
2. **Part 3.1-3.4 を新ブランチ `feat/part3-hooks` に積み上げ中**: Part 2 の tip から派生（main にまだ Part 2 が無いため）
3. **Hook を discriminated union 化**: 3.4 で `StateHook` + `EffectHook` のタグ付き union に変更。既存の useState / useReducer も `kind: 'state'` 付きに追従（後方互換は維持、Hook 型のみ変更）
4. **useEffect は同期実行**: 本書 chibireact では commit 直後に sync で走る。本家 React の async deferral との差は 3.5 で扱う方針
5. **未着手**: Part 3.5 (useLayoutEffect), 3.6 (useContext), 3.7 (useMemo/useCallback), 3.8 (useRef), 3.9 (custom hook)

---

## このセッションでやったこと（ラウンド 11）

### Part 2 完走 (本日午前)
- Part 2.7 Commit phase の最適化と createRoot の Fiber 統合
- updateDom を prop diff 化 (removeProp / setProp 分離、Object.is で同値スキップ)
- createRoot の中身を `runFiberRoot` に置換、`container.innerHTML = ''` を削除
- 7 テスト追加 (commit-phase.test.ts)
- 070-commit.mdx 執筆
- → **Part 2 全 7 章完走 (累計 128 テスト)**

### Part 3 ブランチ作成
- ブランチ運用ルールに従い `feat/part3-hooks` を `feat/part0-content-and-prep` の tip から派生
- main に Part 2 が無いため Part 2 ブランチ tip ベース。Part 2 マージ後に rebase 想定

### Part 3.1 Hook の前提知識（NEW、概念章）
- React の Rules of Hooks 2 つの説明
- 「順序ベース実装」が制約の根拠
- Part 1.9 の useState の脆さ 2 種類:
  - 順序ルール違反 (本家と同じ)
  - 複数関数コンポの hook 混線 (本書固有 → 3.2 で解決)
- Part 3 全 9 章のロードマップ
- 010-hook-rules.mdx, _meta.js 整備

### Part 3.2 useState を fiber に紐付け直す（NEW、実装章）
- `Fiber.hooks: Hook[]` フィールド追加
- hooks-state.ts を per-fiber に refactor:
  - 旧 `_rootHooks: Hook[]` / `_index` を撤去
  - `wipFiber: Fiber | null` / `hookIndex: number` に置換
  - `setWipFiber(fiber)` を export し、work-loop が関数 fiber 処理時に呼ぶ
  - render 外で useState を呼ぶと throw
- work-loop.ts: 関数 fiber 処理時に `fiber.hooks = [...alternate.hooks]` で浅いコピー、setWipFiber を呼ぶ
- 4 テスト pass (hooks-per-fiber.test.ts):
  - 2 つの Counter 独立 / 親子コンポ独立 / 3 つ並列 / render 外 throw
- 020-use-state-per-fiber.mdx 執筆
- 既存 hooks-state.test.ts (5 テスト) は無変更で全緑

### Part 3.3 useReducer の実装（NEW）
- `useReducer<S, A>(reducer, initial)` を hooks-state.ts に追加
- useState の per-fiber 基盤を流用、計算ロジックを reducer 関数に委譲
- 5 テスト pass (use-reducer.test.ts):
  - inc/dec / 同値スキップ / useState 併用 / 複数 useReducer / render 外 throw
- 030-use-reducer.mdx 執筆 (useState との使い分け表 / 内部統一の話 / Redux との関係)

### Part 3.4 useEffect — commit 後の副作用（NEW）
- Hook 型を discriminated union 化:
  - `StateHook<T>` = `{ kind: 'state'; state: T }`
  - `EffectHook` = `{ kind: 'effect'; effect; cleanup?; deps?; pendingCommit }`
  - `Hook = StateHook | EffectHook`
- 既存 useState / useReducer も `kind: 'state'` 付きに追従
- `useEffect(effect, deps?)` を実装:
  - render 時は予約のみ (本体は実行しない)
  - depsChanged で Object.is 比較
  - oldHook.cleanup を引き継いで次 effect 前に呼ぶ
- work-loop.ts の commit phase 拡張:
  - commitRoot 末で runEffects、pendingCommit 立ちの effect を sync 実行
  - commitDeletion で runCleanupsForDeletion、消える部分木の cleanup を全実行
- 9 テスト pass (use-effect.test.ts):
  - mount 後実行 / deps 省略で毎回 / [] で初回のみ / 無関係 state では走らない
  - cleanup の実行順 / unmount で cleanup / 深い場所削除 / render 外 throw / 複数 useEffect 独立
- 040-use-effect.mdx 執筆

→ **Part 3 が 4 章まで進んだ。残り 5 章 (3.5 useLayoutEffect, 3.6 useContext, 3.7 useMemo/useCallback, 3.8 useRef, 3.9 custom hook)**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 3 全章 (010, 020, 030, 040) | HTTP 200 |
| Vitest テスト | **146/146 pass** (19 ファイル) |
| TS typecheck | render.ts の pre-existing エラー 7 件は据え置き、それ以外は緑 |
| pre-commit hook | 通過済み（メールチェックのみ） |

## コミット履歴

### feat/part0-content-and-prep ブランチ (Part 2 完走、push 済)
```
17afe98 feat(part2): 2.7 commit phase 最適化と createRoot の Fiber 統合
c4cce70 docs: WORK_NOTES.md ラウンド 10 (Part 2 完走) で更新
b7c0c67 feat(part2): 2.6 二重バッファ - current/workInProgress と effect tag
8551b3b docs: WORK_NOTES.md ラウンド 9 (Part 2.6 二重バッファ) で更新
9a31173 feat(part2): 2.5 requestIdleCallback と最小スケジューラ
115162c docs: WORK_NOTES.md ラウンド 8 (Part 2.5 RIC スケジューラ) で更新
a8bb087 feat(part2): 2.4 work loop と作業の単位化
66105bb docs: WORK_NOTES.md ラウンド 7 (Part 2.4 work loop) で更新
412a7b2 feat(part2): 2.3 Fiber Node データ構造（parent/child/sibling）
b2c9a08 docs: WORK_NOTES.md ラウンド 6 (Part 2.3 Fiber データ構造) で更新
```

### feat/part3-hooks ブランチ (Part 3.1-3.4)
```
922a4c5 feat(part3): 3.4 useEffect — commit 後の副作用
5c057b9 feat(part3): 3.3 useReducer の実装
768b485 feat(part3): 3.2 useState を fiber に紐付け直す
6c7dd68 docs(part3): 3.1 Hook の前提知識 (なぜルールが必要か)
```

両ブランチとも未 push。ユーザーが帰ってから一括 push 予定。

---

## 累計成果物（Part 3.4 終了時点）

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts        (Fiber 版 runFiberRoot 経由)
├── create-element.ts
├── render.ts             (Part 1 互換のため温存)
├── hooks-state.ts        (per-fiber, useState/useReducer/useEffect)
├── jsx-types.ts
├── fiber.ts              (StateHook + EffectHook の discriminated union)
├── work-loop.ts          (commit phase 分離 + runEffects + cleanup)
├── scheduler.ts
└── index.ts              (Hook API を一通り export)

tests/  (19 ファイル / 146 テスト)
├── create-root.test.ts        (3)
├── create-element.test.ts     (8)
├── create-element-key.test.ts (5)
├── render.test.ts             (7)
├── render-props.test.ts      (10)
├── render-events.test.ts      (9)
├── render-children.test.ts   (10)
├── render-function-components.test.ts (9)
├── hooks-state.test.ts        (5)  Part 1 era - useState 基本
├── hooks-batching.test.ts     (3)  Part 1 era - バッチング
├── fiber.test.ts             (15)  Part 2.3
├── work-loop.test.ts         (19)  Part 2.4
├── scheduler.test.ts          (3)  Part 2.5
├── work-loop-scheduler.test.ts (6)  Part 2.5
├── double-buffer.test.ts      (9)  Part 2.6
├── commit-phase.test.ts       (7)  Part 2.7
├── hooks-per-fiber.test.ts    (4)  Part 3.2  NEW
├── use-reducer.test.ts        (5)  Part 3.3  NEW
└── use-effect.test.ts         (9)  Part 3.4  NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了 ★)
30-hooks/         (Part 3: 9 章中 4 章)
  010 Hook の前提知識: なぜルールが必要か       NEW
  020 useState を fiber に紐付け直す          NEW
  030 useReducer の実装                       NEW
  040 useEffect — commit 後の副作用            NEW
```

---

## レビューしてほしいポイント

### A. Hook を discriminated union 化したタイミング
3.4 で StateHook / EffectHook の 2 種類が必要になったタイミングで union 化。
useState の Part 1.9 時点では union ではなく `Hook<T>` (= `{ state: T }`) だった。
リファクタは破壊的だが既存テスト全緑。読者にとって「2 種類目が出たから自然に拡張」と見えるか。

### B. useEffect が同期実行 (sync after commit)
本家 React は **async (ブラウザ描画後)**、本書は **sync (commit 直後)**。
これは事実上 useLayoutEffect の挙動なので、3.5 で「実は今書いたのは useLayoutEffect 寄り」という反転を入れる予定。
このストーリー展開が良いか。

### C. Part 3 の進度
Part 3 は 9 章。今は 4 章まで。残り 5 章（useLayoutEffect, useContext, useMemo/useCallback, useRef, custom hook）。

### D. ブランチ運用
- `feat/part0-content-and-prep` を Part 2 用、`feat/part3-hooks` を Part 3 用に分離
- Part 2 がマージされたら Part 3 を main に rebase する想定
- メモリの「Part が変わったら別ブランチ」ルールに従って実行

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 2 と Part 3.1-3.4 をまとめて push | 1 分 |
| **b** | Part 3.5 useLayoutEffect (useEffect の async 化 + Layout 版追加) | 2-3 時間 |
| **c** | Part 3.6 useContext (Context API + Provider/Consumer) | 3-4 時間 |
| **d** | Part 3.7 useMemo / useCallback (メモ化 + 参照安定性) | 2-3 時間 |
| **e** | Part 3.8 useRef (ミュータブルな箱) | 1-2 時間 |
| **f** | Part 3.9 カスタムフック (再利用パターン) | 1-2 時間 |
| **g** | render.ts の TS narrowing 修正 (pre-existing) | 30 分 |

**個人的推奨**:
1. ユーザー帰還後にまず両ブランチを push、PR 状況を確認
2. Part 2 PR が main にマージされたら Part 3 ブランチを main に rebase
3. Part 3.5 → 3.6 の順で続行（3.6 useContext は Provider/Consumer の概念が大きいので山場）

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
