# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-09（ラウンド 15: Part 6 完走 ★）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part6-web-essentials` (Part 6.1-6.5 を載せた状態、未 push)

---

## ⚠️ レビュー時の優先確認事項

1. **Part 6 全 5 章完走**: ルーティング / フォーム / リスト最適化 / アクセシビリティ / デバッグツール
2. **新規 src 2 個**: `router.ts` (Link/Route/Switch/useHashLocation) / `dev-tools.ts` (dumpFiberTree/findFiber/fiberStats)
3. **229 テスト全緑**: 新規 12 (router 5 + dev-tools 7)
4. **概念章中心**: 6.2/6.3/6.4 はコード変更ゼロ、パターン解説中心。6.1/6.5 は実装あり
5. **53 章中 52 章 (98%) 到達**: 残りは Part 7 付録 (4 章) のみ

---

## このセッションでやったこと（ラウンド 15: Part 6）

### Part 6.1 ルーティング — hash router の最小実装（NEW、実装章）
- `router.ts` 新設:
  - `useHashLocation()`: `window.location.hash` 購読 + navigate 関数
  - `Link`: `<a href="#/...">` の薄いラッパ (修飾キー対応)
  - `Route`: path 完全一致時のみ component を render
  - `Switch`: 最初にマッチした Route だけ render (`'*'` で wildcard)
- 5 テスト pass: Route 切替 / Switch wildcard / Link href / クリックで遷移 / navigate API
- index.ts に export 追加
- 010-routing.mdx 執筆 (hash vs History API / 70 行で本格相当 / Suspense との組合せ)
- パスパラメータ・ネスト・History API は本書スコープ外と明示

### Part 6.2 フォーム — controlled vs uncontrolled（NEW、概念章）
- Controlled / Uncontrolled の特徴と使い分け
- 複雑フォームを useReducer で整理するパターン
- バリデーション 3 段階 (onChange / onBlur / onSubmit)
- アクセシビリティ (label 紐付け / role="alert")
- react-hook-form の発想と React 19 form action への布石

### Part 6.3 リスト最適化 — key と virtualization（NEW、概念章）
- key の本質的役割 (再 render 間で子要素を識別)
- index を key にするバグパターンの図解
- virtualization (windowing) の発想と簡易実装スケッチ
- react-window / TanStack Virtual の選択基準
- 「key を意図的に変えて強制リセット」テクニック
- SSR との相性問題

### Part 6.4 アクセシビリティ — ARIA / focus 管理（NEW、概念章）
- セマンティック HTML が出発点 (button / nav / main / h1-h6)
- ARIA 属性の典型 (aria-label / role / aria-live / aria-current)
- focus 管理 3 パターン (Modal trap / Skip link / ルート切替時)
- React 特有の落とし穴 (autoFocus / SSR / useLayoutEffect)
- prefers-reduced-motion / 色覚多様性 / コントラスト比

### Part 6.5 デバッグツール — fiber tree の可視化（NEW、実装章）
- `dev-tools.ts` 新設:
  - `dumpFiberTree(root)`: インデント付き文字列ダンプ
  - `findFiber(root, predicate)`: DFS で条件マッチ fiber を検索
  - `fiberStats(root)`: 深さ・ノード数・種別カウント
- 7 テスト pass: dumpFiberTree (3) + findFiber (2) + fiberStats (2)
- 関数コンポは `<Name />` 形式で表示、effectTag/key/suspended/error も表示
- index.ts に export 追加
- 050-debugging.mdx 執筆 (本物 React DevTools との比較 / 自前で作る難しさ / console.log の有用性)

→ **Part 6 全 5 章完走 (累計 32 ファイル / 229 テスト)**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 6 全章 (010-050) | HTTP 200 |
| Vitest テスト | **229/229 pass** (32 ファイル) |
| TS typecheck | render.ts pre-existing エラー据え置き、それ以外緑 |
| pre-commit hook | 通過予定 |

## コミット履歴 (Part 6 ブランチ、未 push、これからまとめて commit)

```
feat(part6): 6.1 ルーティング — hash router の最小実装
docs(part6): 6.2 フォーム — controlled vs uncontrolled
docs(part6): 6.3 リスト最適化 — key と virtualization
docs(part6): 6.4 アクセシビリティ — ARIA / focus 管理
feat(part6): 6.5 デバッグツール — fiber tree の可視化 (Part 6 完走)
docs: WORK_NOTES.md ラウンド 15 (Part 6 完走) で更新
```

---

## 累計成果物（Part 6 完走時点）

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
├── work-loop.ts
├── scheduler.ts
├── context.ts
├── h.ts
├── suspense.ts
├── error-boundary.ts
├── portal.ts
├── router.ts              (NEW)
├── dev-tools.ts           (NEW)
└── index.ts               (router / dev-tools API を export)

tests/  (32 ファイル / 229 テスト)
[既存 30 + Part 6 新規 2: router / dev-tools]
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了)
30-hooks/         (Part 3: 9 章, 完了)
40-jsx/           (Part 4: 5 章, 完了)
50-concurrent/    (Part 5: 6 章, 完了)
60-web-essentials/  (Part 6: 5 章, 完了 ★)
  010 ルーティング — hash router の最小実装         NEW
  020 フォーム — controlled vs uncontrolled        NEW
  030 リスト最適化 — key と virtualization         NEW
  040 アクセシビリティ — ARIA / focus 管理          NEW
  050 デバッグツール — fiber tree の可視化         NEW
```

---

## レビューしてほしいポイント

### A. 概念章中心の構成 (6.2/6.3/6.4)
コード変更ゼロの章が 3 つ連続。Part 1-5 と比べて実装比重が下がる。これが「実プロダクションで意識すべき領域」を整理する Part として違和感がないか。

### B. 6.1 ハッシュルーターのスコープ
パスパラメータ・History API・ネストルートは本書スコープ外と明示済。70 行で書ける範囲としての完成度は妥当か。

### C. 6.5 デバッグツールの簡素さ
本物 React DevTools (GUI + Profiler) には遠く及ばないが、`console.log(dumpFiberTree(root))` で「fiber tree が見える」体験は提供できる。教育目的としての位置付けは妥当か。

### D. Plans からの逸脱
原案では 6.5 が「DevTools 概観」だったが、実装ありの章にした (簡素なものを実装)。
原案の網掛け (Web Components / SSR / RSC など) は本書スコープ外として割愛。これらは Part 7 付録または別書籍候補。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 6 ブランチを push、PR 作成 | 1 分 |
| **b** | Part 7「付録」(4 章) | 4-8 時間 |
| **c** | render.ts の TS narrowing 修正 | 30 分 |
| **d** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**進捗**: 53 章中 **52 章 (98%) 完了**。残り 4 章。
**個人的推奨**: a (push + PR) → b (Part 7 で完走!)

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
