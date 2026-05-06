# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-06（ラウンド 13: Part 4 完走 ★）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part4-jsx` (Part 4.1-4.5 を載せた状態、未 push)

---

## ⚠️ レビュー時の優先確認事項

1. **Part 4 全 5 章完走**: JSX 概念 → classic runtime → automatic runtime → 自前 tagged template `h` 実装 → TypeScript 型
2. **`h` 関数 (htm-lite)** が新規実装: 約 200 行の再帰下降パーサで JSX 風 tagged template literal を解釈
3. **190 → 190 テスト**: Part 4 では 4.4 で `h` 用 13 テスト追加、累計 25 ファイル / 190 テスト
4. **コード追加箇所**: `packages/@chibireact/core/src/h.ts` のみ。他は本文のみの章
5. **ブランチ運用**: メモリのルール通り Part 4 用に `feat/part4-jsx` を main から派生

---

## このセッションでやったこと（ラウンド 13）

### Part 4.1 JSX とは何か（NEW、概念章）
- JSX = JavaScript 式（HTML 文字列ではない）の説明
- 大文字始まり (=変数参照) と小文字始まり (=HTML タグ) の使い分け
- `{...}` 内に JS 式が書けるルール / `{}` の中は文ではなく式
- ビルド時に Babel/SWC/TSC が createElement に変換する全体像
- Vue/chibivue のテンプレート方式との比較

### Part 4.2 classic runtime — JSX → createElement 変換（NEW、概念章）
- 6 つの変換ルールを入力 → 出力で対応:
  - HTML タグ / 関数コンポーネント / 中括弧展開 / 入れ子 / spread props / Fragment
- なぜ React 16 まで `import React` が必要だったか
- 練習問題: Counter コンポを手動で createElement に展開

### Part 4.3 automatic runtime — React 17+ の jsx() 変換（NEW、概念章）
- classic との 4 つの違い: 変換先関数 / children を props 内 / 単一/複数で関数分離 (`jsx`/`jsxs`) / key 独立引数
- なぜ `import React` が要らなくなったか (コンパイラが自動 import 挿入)
- TypeScript 設定 `"jsx": "react-jsx"` の意味
- 本書 chibireact は classic 互換で進める方針を表明

### Part 4.4 簡単な JSX トランスフォーマを実装する（NEW、実装章）
- `packages/@chibireact/core/src/h.ts` 新規実装:
  - tagged template literal `h\`<div>${val}</div>\`` 形式
  - 再帰下降パーサで src 文字列を AST 化 → createElement 呼び出しに展開
  - 値補間に NUL マーカー (``) を使用、values 配列で復元
  - 対応: HTML タグ / 静的属性 / 補間属性 / 文字列内補間 / 子の補間 / コンポーネント補間 (`<${Foo}>`) / 自閉じ / ネスト
  - 未対応 (本書スコープ外): spread props / boolean shorthand / Fragment / HTML エンティティ
- 13 テスト pass (h.test.ts):
  - HTML タグ基本 (空 / テキスト / 自閉じ / ネスト)
  - 属性 (静的 / 補間 / 文字列内補間 / 関数)
  - 子要素補間 (数値 / テキスト混在 / 複数)
  - コンポーネント補間 (関数型 / props + children 渡し)
- 040-jsx-transformer.mdx 執筆 (実装解説 / 制限表 / Babel との違い / `h` 命名の歴史)
- index.ts から `h` を export

### Part 4.5 JSX の TypeScript 型（NEW、概念章）
- `JSX.Element` / `JSX.IntrinsicElements` / `ElementChildrenAttribute` の役割
- 大文字 vs 小文字タグでの型推論の違い
- 本書 jsx-types.ts (Part 1.12 で実装済) の解読
- カスタムタグ (Web Components) の追加方法
- `tsconfig.json` の `jsx` オプション解説
- chibireact で本物の JSX を使う手順 (将来課題)

→ **Part 4 全 5 章完走 (累計 25 ファイル / 190 テスト)**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 4 全章 (010 〜 050) | HTTP 200 |
| Vitest テスト | **190/190 pass** (25 ファイル) |
| TS typecheck | render.ts の pre-existing エラー 7 件は据え置き、それ以外は緑 |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (Part 4 ブランチ、未 push)

```
docs: WORK_NOTES.md ラウンド 13 (Part 4 完走) で更新
docs(part4): 4.5 JSX の TypeScript 型 (Part 4 完走)
feat(part4): 4.4 簡単な JSX トランスフォーマを実装する
docs(part4): 4.3 automatic runtime — React 17+ の jsx() 変換
docs(part4): 4.2 classic runtime — JSX → createElement 変換
docs(part4): 4.1 JSX とは何か (シンタックスシュガーの正体)
```

(これからまとめてコミット予定)

---

## 累計成果物（Part 4 完走時点）

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts
├── create-element.ts
├── render.ts
├── hooks-state.ts
├── jsx-types.ts          (Part 1.12 から既存)
├── fiber.ts
├── work-loop.ts
├── scheduler.ts
├── context.ts
├── h.ts                  (NEW: tagged template literal パーサ)
└── index.ts              (h を追加 export)

tests/  (25 ファイル / 190 テスト)
[既存 24 + h.test.ts (13)]
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了)
30-hooks/         (Part 3: 9 章, 完了)
40-jsx/           (Part 4: 5 章, 完了 ★)
  010 JSX とは何か（シンタックスシュガーの正体）        NEW
  020 classic runtime — JSX → createElement 変換   NEW
  030 automatic runtime — React 17+ の jsx() 変換   NEW
  040 簡単な JSX トランスフォーマを実装する             NEW
  050 JSX の TypeScript 型                          NEW
```

---

## レビューしてほしいポイント

### A. 概念章 3 連 (4.1/4.2/4.3) は実装軽め
Part 2/3 と違い、コード変更を伴わない概念章が連続。読者が飽きないように:
- 4.1: 全体像
- 4.2: classic の具体ルール 6 種
- 4.3: automatic との比較
という流れで段差を作った。連続でテンポが落ちないか。

### B. 自前 `h` 関数のスコープ
htm の教育用ミニ版として実装。約 200 行で Babel と等価ではないが「JSX の本質」は伝わる。
本物より大幅に劣る点（spread, fragment, エラー回復）を本文で明示してあるが、過小評価に見えないか。

### C. Part 4.5 で実装ゼロは妥当か
TypeScript 型は Part 1.12 で既に実装済（jsx-types.ts）なので、4.5 は「読み解き」章。
本書スコープでは妥当だが、他のパートのバランス上、実装が無いのは寂しいかもしれない。

### D. Part 5 への布石
4.5 章末で Part 5 (Concurrent Rendering) に予告。Part 2 の Fiber + scheduler が下地として活きる旨を強調。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 4 ブランチを push、PR 作成 | 1 分 |
| **b** | Part 5「Concurrent Rendering と Suspense」(6 章) | 12-20 時間 (本書最難関) |
| **c** | Part 6「Web Application Essentials」(5 章) | 8-12 時間 |
| **d** | Part 7「付録」(4 章) | 4-8 時間 |
| **e** | render.ts の TS narrowing 修正 (pre-existing) | 30 分 |
| **f** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**個人的推奨**: a (push と PR) で中間レビュー → b (Part 5) に着手。
Part 5 は本書最難関なので、入る前に Part 1-4 の基盤を確実に main に取り込んでおきたい。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
