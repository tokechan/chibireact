# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-05（ラウンド 9: Part 2.6 二重バッファ）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep` (Part 2 終了まではこのブランチで継続。Part 3 で新ブランチに切る運用)

---

## ⚠️ レビュー時の優先確認事項

1. **render phase / commit phase 完全分離** を 2.6 で済ませた。本来 2.7 でやる予定だった「DOM 操作を work loop から外す」を前倒しした形。意図したか
2. **effect tag 3 種 (PLACEMENT/UPDATE/DELETION) も 2.6 で揃えた**: 「2.6 = 二重バッファ」「2.7 = effect tag」と章を分けるよりも、「2.6 で全部揃える / 2.7 で diff 最適化と createRoot 差し替え」にする方が自然と判断
3. **`currentRoot?.dom === container` ガード**: 別 container での render を新規扱いにする実装上の暫定処理。本格的な multi-root は 2.7 以降
4. **key 比較は未対応**: index ベースの reconcile のみ。並び替えは全 UPDATE 扱いで非効率。2.7 で改善
5. **「変わった prop だけ更新」も未対応**: updateDom は新 props を全適用、古いイベントリスナを除去。2.7 で diff 最小化

---

## このセッションでやったこと（ラウンド 9: Part 2.6）

### Fiber 型を拡張
- `alternate: Fiber | null`: 前回 commit 済ツリーの対応 fiber
- `effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION'`: commit 時の操作
- `createFiber` のデフォルトに `alternate: null` を追加
- `EffectTag` 型を export

### work-loop.ts を全面リファクタ
- モジュール状態追加: `wipRoot`, `currentRoot`, `deletions`
- `prepareWipRoot` で同期/非同期エントリ共通の準備処理
- `runFiberRoot` / `scheduleFiberRoot` 共に commit phase を経由する形に
- `performUnitOfWork` から DOM の append を削除（render phase で DOM を触らない）
- `reconcileChildren` を実装: alternate.child と並走して effect tag を付ける
- `reconcileSingleChild` を実装: type 一致なら DOM 再利用 (UPDATE)、不一致なら PLACEMENT、text fiber も UPDATE 対応
- `commitRoot` / `commitWork` / `commitDeletion` を実装
- `updateDom` を実装: text の nodeValue 差し替え、古いイベントリスナ除去 + 新 props 全適用
- 同じ container への 2 度目以降のみ alternate を引き継ぐガード

### Part 2.6 双方向バッファのテスト（NEW）
- 9 テスト pass:
  - DOM identity 保存 (3): className 更新で同じノード / text の nodeValue 差し替え / type 変更で再生成
  - 子の追加・削除 (3): 既存維持 / 余り削除 / 全削除
  - イベントリスナ多重登録防止 (1)
  - 関数コンポーネント再レンダ (2): 同じ関数で DOM 再利用 / 違う関数で再生成

### 本文 `060-double-buffer.mdx` 執筆
- 二重バッファの mental model（front/back buffer の比喩）
- render phase / commit phase 分離の規律
- alternate リンクの図
- effect tag 振り分けの実装
- depth: なぜ render phase で DOM を触らないか / key 比較の話 / `currentRoot?.dom === container` ガードの意味
- _meta.js 追加、050 章の「執筆中」リンク撤去

→ **Part 2 が 6 章まで進んだ。残り 1 章 (2.7 commit phase 最適化 + createRoot 差し替え)。**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 2.6 ページ (`/20-fiber/060-double-buffer`) | HTTP 200 |
| Vitest テスト | **121/121 pass** (15 ファイル) |
| TS typecheck | work-loop.ts / fiber.ts / double-buffer.test.ts は緑。render.ts pre-existing エラー 7 件は据え置き |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (ラウンド 9 分・予定)

```
feat(part2): 2.6 二重バッファ - current/workInProgress と effect tag
docs: WORK_NOTES.md ラウンド 9 (Part 2.6 二重バッファ) で更新
```

---

## 累計成果物

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts        (Part 1; Part 2.7 で Fiber 版に差し替え予定)
├── create-element.ts
├── render.ts             (Part 1; Part 2.7 で廃止予定)
├── hooks-state.ts
├── jsx-types.ts
├── fiber.ts              (alternate / EffectTag を追加)
├── work-loop.ts          (二重バッファ + commit phase に全面リファクタ)
├── scheduler.ts
└── index.ts              (EffectTag を export 追加)

tests/  (15 ファイル / 121 テスト)
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
├── scheduler.test.ts          (3)
├── work-loop-scheduler.test.ts (6)
└── double-buffer.test.ts      (9) NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章中 6 章)
  010 Reconciliation の前提知識
  020 Stack Reconciler の限界
  030 Fiber Node とは何か
  040 work loop と作業の単位化
  050 requestIdleCallback と最小スケジューラ
  060 二重バッファ — current ツリーと workInProgress  NEW
```

---

## レビューしてほしいポイント

### A. 章の境界判断（2.6 で commit phase まで踏み込んだ）
当初の計画では「2.6 = 二重バッファ概念」「2.7 = commit phase + effect tag」と分けるつもりだった。
だが二重バッファは effect tag があって初めて動くので、**2.6 で commit phase まで一気にやる**形に変更。
代わりに 2.7 では「diff 最小化」「createRoot を Fiber 版に差し替え」に集中する想定。
この章の切り方が読者にとって自然か。

### B. updateDom の単純実装
- text fiber: nodeValue 差し替えのみ
- host fiber: 古いイベントリスナを全部除去 + 新 props を全適用
- **削除された属性 (key in old, not in new) は残ったまま** ← 2.7 の課題

このトーン（「動くがまだ最適化していない」）で章を閉じるのが pedagogical に良いか、それとも 2.6 の中で完璧な diff まで書くべきか。

### C. `currentRoot?.dom === container` ガードの妥当性
現状は 1 root 前提のため、別 container に render する場合に「前のは別物」と扱う必要がある。
2.7 で本格的な multi-root 対応を入れるか、それとも本書のスコープ外とするか。

### D. テストでの `_resetSchedulerForTesting()`
新規 double-buffer.test.ts は beforeEach/afterEach で必ず reset。既存 work-loop.test.ts はリセットしていないが現状は通っている（container guard が効いているため）。整合性のため既存にも入れるべきか。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 2 残り (2.7) を仕上げる: prop diff 最小化 + key 対応 + createRoot 差し替え | 3-5 時間 |
| **b** | このタイミングで一度 push して中間レビュー | 1 分 |
| **c** | render.ts の TS narrowing 修正 (pre-existing) | 30 分 |
| **d** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**個人的推奨**: a (Part 2.7 仕上げ) → b (Part 2 完走で一気に push) の順。
2.7 で `createRoot` を Fiber 版に差し替えると useState (Counter) が真にスケジューラ経由で動くようになり、Part 2 のクライマックス。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
