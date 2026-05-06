# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-06（ラウンド 14: Part 5 完走 ★）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part5-concurrent` (Part 5.1-5.6 を載せた状態、未 push)

---

## ⚠️ レビュー時の優先確認事項

1. **Part 5 全 6 章完走**: Concurrent 概念 → startTransition → useDeferredValue → Suspense → Error Boundary → Portal
2. **新規実装多数**: `suspense.ts` / `error-boundary.ts` / `portal.ts` + work-loop の try/catch 拡張 / hooks-state の transition フラグ
3. **217 テスト全緑**: 新規 33 (start-transition 6 + use-deferred-value 4 + suspense 6 + error-boundary 7 + portal 4 + その他)
4. **本書実装の意図的な簡略化**: lane なし / 中断不可 / 値の分離が見えない / SSR 未対応。各章末で本家との差を明示
5. **53 章中 47 章 (89%) 到達**: 残りは Part 6 (Web Essentials) + Part 7 (付録) のみ

---

## このセッションでやったこと（ラウンド 14: Part 5）

### Part 5.1 Concurrent Rendering の前提知識（NEW、概念章）
- 並行 (concurrent) と並列 (parallel) の違い
- React 16 Fiber と React 18 Concurrent の関係
- lane (優先度) モデルの考え方
- Part 5 で扱う 5 機能 (startTransition / useDeferredValue / Suspense / Error Boundary / Portal) の位置付け

### Part 5.2 startTransition と低優先度更新（NEW、実装章）
- `_isInTransition` モジュールフラグ + `_transitionScheduled`
- `_scheduleRerender` を 2 段階分岐: urgent (queueMicrotask) / transition (setTimeout)
- `startTransition(fn)`: fn 内 setState を transition 経路に
- `useTransition()`: `[isPending, start]` を返す薄い hook
- 6 テスト pass: 遅延スケジュール / ネスト / 混在 / sync 実行 / isPending 遷移 / start 関数性
- 本書の限界 (値の分離が見えない、中断不可) を明示

### Part 5.3 useDeferredValue（NEW、実装章）
- `useState + useEffect + startTransition` の組み合わせだけで成立
- value 変化で urgent rerender → useEffect で setDeferred(value) を transition で予約
- 4 テスト pass: 初期値 / 追従 / 連続変化収束 / 参照同一性

### Part 5.4 Suspense — 「読み込み中」の一般化（NEW、実装章、最難関）
- `suspense.ts`: Suspense 関数コンポーネント (children を素通り)
- Fiber 型に `suspended` / `thrownPromise` 追加
- work-loop の try/catch:
  - Promise が throw されたら最寄り Suspense を探す → suspended=true / child=null / Suspense 再開
  - Suspense fiber 処理時 suspended=true なら fallback を pendingChildren に
- commit 後 `registerSuspensePromises` で `.then(_triggerRerender)` 登録
- hooks-state に `_triggerRerender` (export) 追加
- 6 テスト pass: throw → fallback / resolve → children / 兄弟への影響なし / ネスト / Suspense なしで throw / 通常表示

### Part 5.5 Error Boundary（NEW、実装章）
- `error-boundary.ts`: ErrorBoundary 関数コンポーネント
- Fiber 型に `error` 追加
- work-loop の try/catch に Error 経路: 最寄り ErrorBoundary を探して error セット / child=null
- ErrorBoundary fiber 処理時 error あり: fallback (値 or 関数) を pendingChildren に
- 7 テスト pass: throw → fallback / fallback 関数 / 兄弟への影響なし / ネスト / 上位伝播 / Promise はスルー / 正常子

### Part 5.6 Portal（NEW、実装章）
- `portal.ts`: `createPortal(children, container)` で type=PORTAL の特殊 element を返す
- work-loop で Portal fiber は dom = props.container を採用 (createDom はスキップ)
- commitWork で Portal の placement append をスキップ (container は document に既存)
- commitDeletion で Portal は container を消さず子のみ削除
- 4 テスト pass: 別 container 描画 / 複数 portal / 入れ子要素 / 再 render 更新

→ **Part 5 全 6 章完走 (累計 30 ファイル / 217 テスト)**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 5 全章 (010-060) | HTTP 200 |
| Vitest テスト | **217/217 pass** (30 ファイル) |
| TS typecheck | render.ts pre-existing エラー据え置き、それ以外緑 |
| pre-commit hook | 通過予定 |

## コミット履歴 (Part 5 ブランチ、未 push、これからまとめて commit)

```
docs(part5): 5.1 Concurrent Rendering の前提知識
feat(part5): 5.2 startTransition と低優先度更新
feat(part5): 5.3 useDeferredValue
feat(part5): 5.4 Suspense — 「読み込み中」の一般化
feat(part5): 5.5 Error Boundary
feat(part5): 5.6 Portal
docs: WORK_NOTES.md ラウンド 14 (Part 5 完走) で更新
```

---

## 累計成果物（Part 5 完走時点）

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts
├── create-element.ts
├── render.ts
├── hooks-state.ts          (transition / useDeferredValue / _triggerRerender 追加)
├── jsx-types.ts
├── fiber.ts                (suspended / thrownPromise / error 追加)
├── work-loop.ts            (try/catch + Suspense / ErrorBoundary / Portal 対応)
├── scheduler.ts
├── context.ts
├── h.ts
├── suspense.ts             (NEW)
├── error-boundary.ts       (NEW)
├── portal.ts               (NEW)
└── index.ts                (Part 5 API を一通り export)

tests/  (30 ファイル / 217 テスト)
[既存 25 + Part 5 新規 5: start-transition / use-deferred-value / suspense / error-boundary / portal]
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了)
30-hooks/         (Part 3: 9 章, 完了)
40-jsx/           (Part 4: 5 章, 完了)
50-concurrent/    (Part 5: 6 章, 完了 ★)
  010 Concurrent Rendering の前提知識                   NEW
  020 startTransition と低優先度更新                     NEW
  030 useDeferredValue                                  NEW
  040 Suspense — 「読み込み中」の一般化                   NEW
  050 Error Boundary                                    NEW
  060 Portal                                           NEW
```

---

## レビューしてほしいポイント

### A. lane 簡略化の妥当性
本家 31 lane → 本書 2 段階 (urgent / transition)。「優先度がある」感覚は伝わるが、本家の細かい挙動は再現できない。教育目的のトレードオフとして妥当か。

### B. Suspense の `_triggerRerender` 横断
Suspense Promise resolve 後の再 render で、work-loop から hooks-state の `_triggerRerender` を呼ぶ設計。モジュール間の循環参照や再 render フローの一貫性を確認したい。

### C. Error Boundary の制限
- 子の effect cleanup が漏れる (child=null で fiber を捨てる)
- ライフサイクル相当 (componentDidCatch) なし
- resetError API なし

各章末で明示済だが、本書スコープとして妥当か。

### D. Portal のイベント伝播
React の合成イベントシステムを実装していないため、Portal 配下 → React ツリー伝播は再現できない。実 DOM のバブリングのみ。これは本書全体の制限なので別問題。

### E. 章の順序
5.6 Portal が「Concurrent じゃない」位置付け。本書は本家 React の構成に倣ったが、独立 Part にしてもいいかもしれない。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 5 ブランチを push、PR 作成 | 1 分 |
| **b** | Part 6「Web Application Essentials」(5 章) | 8-12 時間 |
| **c** | Part 7「付録」(4 章) | 4-8 時間 |
| **d** | render.ts の TS narrowing 修正 | 30 分 |
| **e** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**進捗**: 53 章中 **47 章 (89%) 完了**。残り 9 章。
**個人的推奨**: a (push + PR) → b (Part 6) で実用面のトピックを補完。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
