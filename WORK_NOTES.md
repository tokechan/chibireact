# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-04（ラウンド 5: Part 1 完走 + Part 2 開始）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep`

---

## ⚠️ レビュー時の優先確認事項

1. **useState の最小実装の制限**を 1.9 章で正直に明記したが、読者を不安にさせないか
2. **1.10 のバッチング** は queueMicrotask を採用、React 18 と挙動を比較したい
3. **1.11 key** は構造のみで diff 未活用 → Part 2 への布石、それで読者が納得するか
4. **Part 2.1 / 2.2 が実装なしの概念章** が連続で OK か（2.3 以降は実装伴うはず）

---

## このセッションでやったこと（ラウンド 5: 一気に Part 1 完走 + Part 2 開始）

### Part 1.7 children と入れ子構造
- types.ts: `ChibireactNode` を `boolean | null | undefined | array` まで拡張（React 互換）
- render.ts: 早期 return 2 つ追加（null/bool スキップ + 配列再帰）
- 10 テスト pass

### Part 1.8 関数コンポーネントの最小実装
- render.ts: `typeof node.type === 'function'` の分岐を追加
- `componentProps = { ...node.props, children: node.children }` で props.children を React 互換に
- 9 テスト pass

### Part 1.9 useState の最小実装 ← Part 1 のクライマックス
- hooks-state.ts 新設: モジュール状態 + index 配列で useState
- 関数型 setState (prev => next)、Object.is 同値判定
- create-root.ts: lastElement を覚えて rerender → container.innerHTML='' で再描画
- 5 テスト pass
- 制限を 1.9 章で正直に列挙: 複数コンポーネント混線 / DOM リセット / focus 消失

### Part 1.10 setState バッチング
- queueMicrotask + _scheduled フラグで同 tick 集約
- 既存 hooks-state.test.ts は async 化が必要に → flushMicrotasks helper
- 3 テスト pass

### Part 1.11 リスト描画と key
- ChibireactElement に `key?: string | number | null` を追加
- createElement で props.key をトップレベルに昇格、props からは除去
- 5 テスト pass
- 実際の diff での活用は Part 2 に委ねる "構造の準備章"

### Part 1.12 TypeScript 化
- jsx-types.ts 新設: `FC<P>` / `CommonHTMLProps` / グローバル `JSX.IntrinsicElements`
- index.ts で型エクスポート + 副作用 import で JSX namespace 有効化
- 既存 69/69 維持

### Part 1.13 ちょっと一息
- 振り返り章（実装なし）
- できるようになったこと一覧、残された問題、Part 2 への展望

### Part 2.1 Reconciliation の前提知識（NEW）
- 概念章: O(n³) → O(n) にした React の 2 前提

### Part 2.2 Stack Reconciler の限界（NEW）
- 概念章: 16ms 予算、1 万要素実験、Fiber が変えたこと

→ **Part 1 全 13 章完了。Part 2 開始（2 章のみ概念）**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 1.7 〜 1.13 ページ | 全 HTTP 200 |
| Part 2.1 / 2.2 ページ | 全 HTTP 200 |
| Vitest テスト | **69/69 pass** (10 ファイル) |
| pre-commit hook | 全コミットで通過 |

## コミット履歴 (ラウンド 5 分)

```
c1f1e15 docs(part2): 2.1 / 2.2 のコンセプト章 (Reconciliation 前提と Stack の限界)
e837495 docs(part1): 1.13 ちょっと一息 — Part 1 振り返り章を追加
9277bd2 feat(part1): 1.12 TypeScript 型定義の整備 (FC / CommonHTMLProps / JSX namespace)
42019d5 feat(part1): 1.11 element に key フィールドを追加 (Part 2 への準備)
d207fb7 feat(part1): 1.10 setState バッチング (queueMicrotask)
3c038ba feat(part1): 1.9 useState の最小実装 (Part 1 のクライマックス)
75d7cd8 feat(part1): 1.8 関数コンポーネントの最小実装
c4bf287 feat(part1): 1.7 children と入れ子構造を扱う
```

8 コミット、未 push。ブランチには合計 18 commits（cebdfc4 から）。

---

## 累計成果物

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts            (key 追加で拡張)
├── create-root.ts      (rerender 機構追加)
├── create-element.ts   (key 抽出)
├── render.ts           (children/array/関数コンポーネント対応)
├── hooks-state.ts      (NEW: useState + バッチング)
├── jsx-types.ts        (NEW: FC / JSX namespace)
└── index.ts

tests/  (10 ファイル / 69 テスト)
├── create-root.test.ts        (3)
├── create-element.test.ts     (8)
├── create-element-key.test.ts (5) NEW
├── render.test.ts             (7)
├── render-props.test.ts      (10)
├── render-events.test.ts      (9)
├── render-children.test.ts   (10) NEW
├── render-function-components.test.ts (9) NEW
├── hooks-state.test.ts        (5) NEW
└── hooks-batching.test.ts     (3) NEW
```

### 本文 (Part 1 完走 + Part 2 開始)
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
  010 createRoot API
  020 パッケージ設計
  030 createElement の自作
  040 単純な再帰的レンダラー
  050 props を扱う
  060 イベントハンドラに対応する
  070 children と入れ子構造        NEW
  080 関数コンポーネントの最小実装   NEW
  090 useState の最小実装          NEW (クライマックス)
  100 再レンダリングのトリガーと差分適用 NEW (バッチング)
  110 リスト描画と key            NEW
  120 TypeScript 化               NEW
  130 ちょっと一息                NEW (振り返り)
20-fiber/         (Part 2: 7 章中 2 章, 概念のみ)
  010 Reconciliation の前提知識   NEW
  020 Stack Reconciler の限界     NEW
```

---

## レビューしてほしいポイント

### A. 1.9 useState の制限の説明
1.9 章では制限を以下のように正直に書きました:
- 複数の関数コンポーネントが配列を共有
- DOM リセットで input focus が消える
- 1 root 前提

これらは Part 2 (Fiber) で本格解決を予告。「動かないと言われると萎える」読者がいないか、トーンを見てほしいです。

### B. 1.10 のスコープ判断
章タイトルが「再レンダリングのトリガーと差分適用」ですが、**差分適用 (DOM diff)** は意図的に Part 2 に分離しました。理由は「Fiber 抜きで diff を書くと教育的に複雑すぎる」。
このスコープ分割が読者にとって自然か、ご意見ください。

### C. 1.11 を「構造のみ」の章にした判断
key は追加したが活用しない。Part 2 の準備章として位置付け。**Part 1 の中で完結しない章** が混じる構成が許容できるか。

### D. Part 2.1 / 2.2 が実装なし 2 連続
Part 1 ではほぼ全章で実装が伴いましたが、Part 2 はまず **概念整理 2 章** から始めました。3 章以降は本格実装が入る予定。

### E. ラウンド 5 で大量に commit した

8 commits / 11 章 / +約 2300 行。ブランチがかなり大きくなりました。マージは大変かも。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | このブランチを push して PR 更新 | 1 分 |
| **b** | Part 2.3「Fiber Node とは何か」を書く（実装伴う）| 2-3 時間 |
| **c** | Part 2.4「work loop と作業の単位化」(L) | 3-5 時間 |
| **d** | examples/ ディレクトリで動くサンプル（Counter / Form）整備 | 1-2 時間 |
| **e** | License 決定 + LICENSE ファイル追加 | 30 分 |
| **f** | Cloudflare Workers デプロイ | 1-2 時間 |
| **g** | 仕事プロジェクトの ~/work/ 移行（別セッション推奨）| — |

**個人的推奨**: a (push) → d (examples で動くサンプル整備) で 「読者が触って楽しめる」状態にしてから b (Part 2 実装) に行くのが良い気がします。Part 2 は重いので、その前に動くものを増やしておくとモチベーションが続きやすい。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
