# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-06（ラウンド 10: Part 2.7 完走 → Part 3 開始）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep` (Part 2) / `feat/part3-hooks` (Part 3 着手時に作成)

---

## ⚠️ レビュー時の優先確認事項

1. **Part 2 完走済**: 7 章（2.1-2.7）すべて執筆 + 実装済。テスト 128/128 緑
2. **createRoot を `runFiberRoot` (同期版) に差し替え**: 既存 hooks-state.test.ts (queueMicrotask flush) との整合性のため `scheduleFiberRoot` (RIC 版) は採用しなかった。`scheduleFiberRoot` は別 API として残置。`createConcurrentRoot` 的なラッパは将来課題
3. **key reconciliation は deferred**: index ベース比較のまま。070 章「ちょっと深掘り」で実装方針を記載。Part 3 以降の付録か Part 5 の Concurrent 関連で着手予定
4. **Part 3 の進め方**: ブランチ運用ルールに従い `feat/part3-hooks` を `feat/part0-content-and-prep` の tip から派生（main にまだ Part 2 が無いため）。Part 2 の PR がマージされたら Part 3 を main にリベースする想定

---

## このセッションでやったこと（ラウンド 10: Part 2.7 → Part 2 完走）

### Part 2.7 Commit phase の最適化と createRoot の Fiber 統合（NEW）
- `updateDom` を prop diff に最適化:
  - 削除された prop を明示的に除去（`removeAttribute` / `removeEventListener`）
  - 変更がある prop だけ DOM に反映（`Object.is` で同値判定）
  - `removeProp` / `setProp` ヘルパに分離
  - style サブキーの最小 diff（古いキーで新側に無いものは `''` でクリア）
- `createRoot` を Fiber 版に差し替え:
  - `renderToContainer` (Part 1 の render) → `runFiberRoot` に置換
  - `container.innerHTML = ''` を削除（DOM 全消ししない）
  - useState の `_scheduleRerender` (queueMicrotask) はそのまま動く
- 7 テスト pass (`commit-phase.test.ts`):
  - prop diff (4): 削除属性 / className 削除 / setAttribute は変更時のみ呼ばれる / style サブキー削除
  - createRoot Fiber 統合 (3): Counter button DOM identity / input focus 保存 / 複数 setState バッチング
- 本文 `070-commit.mdx` 執筆（prop diff 解説 / Before/After 比較 / Counter クライマックス / Part 2 振り返り）
- _meta.js 追加、060 章「執筆中」リンク撤去
- mdx の `<video>` を `\`<video>\`` で escape（生 HTML タグが MDX に解釈されてエラーになる罠を踏んだ）

→ **Part 2 全 7 章完走。Fiber アーキテクチャの背骨が一通り揃った。**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 2.7 ページ (`/20-fiber/070-commit`) | HTTP 200 |
| Part 2 全章 | HTTP 200 |
| Vitest テスト | **128/128 pass** (16 ファイル) |
| TS typecheck | work-loop.ts / fiber.ts / scheduler.ts / 各 test は緑。render.ts pre-existing エラー 7 件は据え置き |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (ラウンド 10 分・予定)

```
feat(part2): 2.7 commit phase 最適化と createRoot の Fiber 統合
docs: WORK_NOTES.md ラウンド 10 (Part 2 完走) で更新
```

---

## 累計成果物（Part 2 完走時点）

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts        (Fiber 版 runFiberRoot 経由に変更)
├── create-element.ts
├── render.ts             (Part 1 互換のため温存。Part 3 以降で廃止予定)
├── hooks-state.ts        (Part 1.9-1.10 のまま、Fiber 経由で動作)
├── jsx-types.ts
├── fiber.ts              (alternate, EffectTag, dom, pendingChildren)
├── work-loop.ts          (render phase / commit phase 分離 + prop diff)
├── scheduler.ts          (RIC ラッパ + setTimeout フォールバック)
└── index.ts              (Fiber API を一通り export)

tests/  (16 ファイル / 128 テスト)
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
├── double-buffer.test.ts      (9)
└── commit-phase.test.ts       (7) NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了 ★)
  010 Reconciliation の前提知識
  020 Stack Reconciler の限界
  030 Fiber Node とは何か
  040 work loop と作業の単位化
  050 requestIdleCallback と最小スケジューラ
  060 二重バッファ — current ツリーと workInProgress
  070 Commit phase の最適化と createRoot の Fiber 統合   NEW
30-hooks/         (Part 3: これから)
```

---

## レビューしてほしいポイント

### A. Part 2 完走の達成度
chibireact が Counter / Form / Object state を Fiber 経由で動かせるようになった。
- DOM identity 保存 ✓
- focus 保存 ✓
- 二重バッファによる効率的な再レンダ ✓
- prop diff による最小 DOM 操作 ✓

「動く React の核」として読者に提示できるレベルに到達したか、評価して欲しい。

### B. 残された制限の説明
070 章末で次の制限を明示:
- key 並び替え（index ベースのまま）
- 複数関数コンポーネントの hook 混線（Part 3.1 で解決予定）
- 高度な hooks (useEffect / useContext 等) は Part 3 全体

これらが「次章への合理的な布石」として機能しているか。

### C. `runFiberRoot` 採用の妥当性
createRoot で `scheduleFiberRoot` (RIC 版) ではなく `runFiberRoot` (同期版) を採用。
理由: 既存テストの `flushMicrotasks` で済ませたかった + 教育目的の同期完結。
本番想定では `scheduleFiberRoot` を使う旨を 070 章に注記。
本書のスコープでこの選択が妥当か。

### D. mdx 内の生 HTML タグへの注意喚起
`<video>` `<input>` などを地の文に直接書くと MDX が JSX として解釈してビルドエラー。
バッククォートで囲って escape するルールを CHAPTER_TEMPLATE.md に追記すべきか。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 3 着手: hooks を fiber に紐付ける基盤を作る | 3-5 時間 |
| **b** | Part 2 / Part 3 まとめて push（ユーザーから依頼済み） | 1 分 |
| **c** | render.ts の TS narrowing 修正 (pre-existing) | 30 分 |
| **d** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**進行中**: a (Part 3 着手) を継続中。Part 3.1 から始める想定。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
