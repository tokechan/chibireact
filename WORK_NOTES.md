# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-04（ラウンド 6: Part 2.3 Fiber データ構造）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep`

---

## ⚠️ レビュー時の優先確認事項

1. **Part 2.3 のスコープ判断**: データ構造のみで `render` には未統合。次章 2.4 で work loop と一緒に統合するつもり。この「データ構造章を独立させる」構成に違和感がないか
2. **`TEXT_ELEMENT` 擬似タイプ** の説明（work loop 一貫性のため）が、まだ work loop が出ていない段階で読者に伝わるか
3. **関数コンポーネントを buildFiberTree 内で eager 呼び出し** している点。本家は work loop 内で遅延呼び出しだが、Part 2.3 ではまだ work loop が無いので eager にした。「次章で書き換える」と明記したが、混乱を招かないか
4. **render.ts の TS 型エラー（pre-existing）** が typecheck に残っている。`Array.isArray` が `readonly ChibireactNode[]` を narrowing しきれない件。fiber.ts では型ガード関数 (`isNodeArray` / `isElement`) を導入して回避。render.ts も同様に直すか別 PR にするか要相談

---

## このセッションでやったこと（ラウンド 6: Part 2.3）

### Part 2.3 Fiber Node とは何か（NEW）
- `fiber.ts` 新設:
  - `Fiber` 型 (`type` / `props` / `key` / `parent` / `child` / `sibling`)
  - `TEXT_ELEMENT` 擬似タイプ（テキスト Fiber の type 用）
  - `createFiber()` 単体生成
  - `buildFiberTree(node)` で element ツリー → Fiber linked-list を同期構築
  - 関数コンポーネントは eager 呼び出し（Part 2.4 で遅延化予定）
- 型ガード `isNodeArray` / `isElement` を導入して TS の narrowing 問題を回避
- 15 テスト pass:
  - 単一ノード（type/props/key/null返却/text変換）6 ケース
  - parent/child リンク 2 ケース
  - sibling リンク 2 ケース
  - 配列・条件・スキップ 3 ケース
  - 関数コンポーネント 2 ケース
- `index.ts` から `Fiber` 型と `buildFiberTree` をエクスポート
- 本文 `030-fiber-node.mdx` 執筆（リンク構造図 / TDD / 補足の "なぜ linked-list か"）
- `_meta.js` に章追加
- 前章 `020-stack-reconciler-limits.mdx` の「執筆中」表記を撤去

→ **Part 2 が 3 章まで進んだ。次は 2.4 で work loop。**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 2.3 ページ (`/20-fiber/030-fiber-node`) | HTTP 200 |
| Part 2.2 ページ（リンク撤去後） | HTTP 200 |
| Vitest テスト | **84/84 pass** (11 ファイル) |
| TS typecheck | fiber.ts は緑。render.ts の pre-existing エラー 7 件は据え置き |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (ラウンド 6 分)

ラウンド 6 はまだコミット前。1 コミットで済む予定:

```
feat(part2): 2.3 Fiber Node データ構造（parent/child/sibling）
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
├── fiber.ts          (NEW: Fiber 型 + buildFiberTree)
└── index.ts          (Fiber 型を export 追加)

tests/  (11 ファイル / 84 テスト)
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
└── fiber.test.ts             (15) NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章中 3 章)
  010 Reconciliation の前提知識
  020 Stack Reconciler の限界
  030 Fiber Node とは何か         NEW (実装伴う)
```

---

## レビューしてほしいポイント

### A. データ構造章としての独立性
2.3 は「Fiber 型を作って tree を構築」までで止め、`render` には接続していません。
理由: work loop / スケジューラ / 二重バッファ / commit を一つの章に詰め込むと長くなりすぎ、読者の認知負荷が高い。
代わりに **「次の章で動かす」** ことを章末で明示しています。

この「動くものは無いが構造は書ける」という章立てが許容範囲か、ご意見を。

### B. eager な関数コンポーネント呼び出し
本家 React は work loop の中で関数コンポーネントを呼びます（Suspense 等のため）。
2.3 ではまだ work loop が無いので、Part 1 の render と同じく `elementChildren()` 内で即時呼び出しにしました。
2.4 でこれを「遅延呼び出し」に書き換える予定だが、その差分が読者にとって理解しやすいか。

### C. `TEXT_ELEMENT` という擬似タイプの導入
深掘り節で説明しましたが、本家 React の `HostText` 相当の抽象化です。
「文字列を Fiber に揃える」ことの利点は work loop が出るまで実感しにくいので、ここでは "未来のために揃えている" と説明しました。

### D. render.ts の TS narrowing 問題
`Array.isArray` で `readonly ChibireactNode[]` が落ちない既存問題（おそらく Part 1 の途中から）。
fiber.ts では型ガード関数で回避済。render.ts も同パターンで直すべきか、別 PR にすべきか。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | このブランチを push して PR 更新 | 1 分 |
| **b** | Part 2.4「work loop と作業の単位化」(unitOfWork / performUnitOfWork) | 3-5 時間 |
| **c** | Part 2.5「requestIdleCallback と最小スケジューラ」 | 2-3 時間 |
| **d** | render.ts の TS narrowing 問題を fiber.ts と同じ型ガード方式で修正 | 30 分 |
| **e** | examples/ ディレクトリで動くサンプル（Counter / Form）整備 | 1-2 時間 |
| **f** | License 決定 + LICENSE ファイル追加 | 30 分 |

**個人的推奨**: a (push) → d (型エラー修正; 小さい掃除) → b (Part 2.4 work loop) の順。
b で Fiber を実際の DOM 描画に繋げると「動く Fiber」が体験できるので、Part 2 の山場として満足度が高い。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
