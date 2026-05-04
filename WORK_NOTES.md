# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-05（ラウンド 7: Part 2.4 work loop）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep`

---

## ⚠️ レビュー時の優先確認事項

1. **`runFiberRoot` を独立 API として追加** し、`createRoot` は Part 1 の `render` のまま温存。差し替えは Part 2.6/2.7 予定。useState との相互作用を二重バッファ後に処理する方針。これで OK か
2. **`HOST_ROOT` sentinel** をモジュール内 const として導入。本家 React の `HostRoot` 相当。説明はしたが、読者が混乱しないか
3. **関数コンポーネントの呼び出しタイミングが 2.3 → 2.4 で eager → 遅延** に変わった。`pendingChildren` を介した遅延評価。読者にとって自然な進化に見えるか
4. **`pendingChildren` という新フィールド名**: 本家 React は `props.children` に入れるが、本書は `ChibireactElement.children` を別フィールドに置く設計なので、Fiber でも同じく別フィールドにした

---

## このセッションでやったこと（ラウンド 7: Part 2.4）

### Fiber 型を拡張
- `dom: Node | null` 追加（host/text fiber は持つ、関数 fiber は null）
- `pendingChildren: readonly ChibireactNode[]` 追加（次に Fiber 化すべき子の vDOM）
- `createFiber` のデフォルトに反映
- 2.3 の `buildFiberTree` は新フィールドを使わないので既存 15 テストはそのまま緑

### Part 2.4 work loop と作業の単位化（NEW）
- `work-loop.ts` 新設:
  - `runFiberRoot(element, container)`: 同期 work loop による初回描画
  - `HOST_ROOT` sentinel + ルート Fiber 作成
  - `performUnitOfWork`: 5 ステップ（関数呼び出し / DOM 作成 / append / 子 fiber 化 / 次のユニット）
  - `findNextUnit` (child → sibling → uncle 探索)
  - `findClosestDomAncestor` (関数 fiber を透過)
  - `applyProps` は Part 1.5/1.6 と同じロジックを内蔵（共有モジュール化は 2.7 以降）
- `index.ts` から `runFiberRoot` をエクスポート
- 19 テスト pass:
  - 基本 DOM 生成 3
  - props/属性/イベント 4
  - 関数コンポーネント (遅延評価含む) 5
  - 配列/条件/スキップ 4
  - テキスト 3
- 本文 `040-work-loop.mdx` 執筆（次の仕事の決定規則 / 5 ステップ / Fiber 拡張 / `HOST_ROOT` / 関数透過）
- `_meta.js` に章追加
- 030 の「執筆中」表記撤去

→ **Part 2 が 4 章まで進んだ。次は 2.5 で requestIdleCallback スケジューラ。**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 2.4 ページ (`/20-fiber/040-work-loop`) | HTTP 200 |
| Vitest テスト | **103/103 pass** (12 ファイル) |
| TS typecheck | work-loop.ts は緑。render.ts の pre-existing エラー 7 件は据え置き |
| pre-commit hook | 通過予定（メールチェックのみ） |

## コミット履歴 (ラウンド 7 分・予定)

```
feat(part2): 2.4 work loop と作業の単位化
docs: WORK_NOTES.md ラウンド 7 (Part 2.4) で更新
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
├── fiber.ts          (dom / pendingChildren を追加)
├── work-loop.ts      (NEW: runFiberRoot + performUnitOfWork)
└── index.ts          (runFiberRoot を export 追加)

tests/  (12 ファイル / 103 テスト)
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
└── work-loop.test.ts         (19) NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章中 4 章)
  010 Reconciliation の前提知識
  020 Stack Reconciler の限界
  030 Fiber Node とは何か
  040 work loop と作業の単位化     NEW
```

---

## レビューしてほしいポイント

### A. `runFiberRoot` を `render` と並列で温存している判断
`createRoot` (= useState 連動の rerender 機構) を 2.4 で差し替えると、二重バッファ未実装ゆえに Counter 等が壊れる可能性大。
2.6 で二重バッファ + diff を入れてから差し替える方が安全。
Part 1 の `render` と Part 2 の `runFiberRoot` が共存している期間がある（2.4 〜 2.6）ことに違和感は無いか。

### B. eager → 遅延への進化を読者が理解できるか
2.3 では `elementChildren()` 内で関数を即時呼び出し、2.4 では `performUnitOfWork` で呼ぶ。
表で比較を出した（章本文 "Part 2.3 (`buildFiberTree`) vs Part 2.4 (`performUnitOfWork`)"）が、説明としてわかりやすいか。

### C. `applyProps` を work-loop.ts にコピーした
Part 1.5/1.6 と同じロジックを `render.ts` と `work-loop.ts` の両方に持つことになった。
共通モジュールへの抽出 (`apply-props.ts` 等) は Part 2.7 で `render` を完全に廃止するタイミングでまとめてやる予定。
今コピペしたままで OK か、早めに括り出すべきか。

### D. テスト 19 個の妥当性
work-loop は Part 1 の render の上位互換なので、テストも render.test.ts と重複する内容が多い。
カバー範囲: DOM 生成 / props / イベント / 関数コンポーネント / 配列・条件 / テキスト。
追加で「Fiber 構造を直接検証するテスト」を加えるべきか（現状は DOM 出力経由で検証）。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | このブランチを push して PR 更新 | 1 分 |
| **b** | Part 2.5「requestIdleCallback と最小スケジューラ」(while を中断・再開) | 2-3 時間 |
| **c** | Part 2.6「二重バッファ: current ツリーと workInProgress」 | 3-5 時間 |
| **d** | Part 2.7「Commit phase と副作用フラグ」 | 3-4 時間 |
| **e** | render.ts の TS narrowing 問題を fiber.ts と同じ型ガード方式で修正 | 30 分 |
| **f** | examples/ ディレクトリで動くサンプル（Counter / Form）整備 | 1-2 時間 |

**個人的推奨**: a (push) → b (Part 2.5 スケジューラ) で「Fiber が中断される姿」を体験できる状態にしてから c へ。
2.5 はコード量こそ少ないが、「ブラウザに制御を返す感覚」が掴める重要な章。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
