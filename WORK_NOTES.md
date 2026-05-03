# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-03（夜、外出中作業 ラウンド 3）
実行者: Claude (Opus 4.7)
ブランチ: `feat/part0-content-and-prep`

---

## ⚠️ レビュー時の優先確認事項

1. **render.ts のサイズと責務** — 1.4 → 1.5 → 1.6 で render.ts が育ちました。ファイル分割すべきか
2. **isEventProp の判定ロジック** — `on` 始まり + 3 文字目が大文字、で正しく React の慣習を反映できているか
3. **章ごとの粒度** — 1.4 (M) / 1.5 (S) / 1.6 (M) のサイズ感、章単位で commit する方針が読みやすいか

---

## このセッションでやったこと（ラウンド 3）

外出中に **Part 1.4 / 1.5 / 1.6 の 3 章** を TDD で実装・執筆。各章ごとに独立したコミットに分割。

### Part 1.4 単純な再帰的レンダラー
- `src/render.ts` を新設、仮想 DOM を実 DOM に再帰変換
- `create-root.ts` から `render` を呼ぶように接続
- text node (string/number) と element の分岐
- 関数コンポーネントは未対応エラーを投げる（Part 1.8 で対応予定）
- 8 テスト pass、累計 19/19
- 章本文に Pombo 方式（`TEXT_ELEMENT` 型）との差別化を記載

### Part 1.5 props を扱う
- `applyProps` ヘルパーを追加
- `className` / `style` / 一般属性 (`id`, `data-*`, `aria-*`) を反映
- `null` / `undefined` はスキップ、`children` 紛れ込みも防御
- 10 テスト pass、累計 29/29
- 章本文に boolean 属性の本家との違いを補足

### Part 1.6 イベントハンドラに対応する
- `isEventProp` / `getEventName` ヘルパーを追加
- 判定ルール: `on` 始まり + 3 文字目大文字 + 値が関数
- `onClick` → `addEventListener('click')` 、`onMouseDown` → `'mousedown'`
- `onclick` (lowercase) や `open` は attribute 扱い（React 互換）
- 9 テスト pass、累計 **38/38**
- 章本文に React 合成イベント / イベント委譲との違いを記載

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | ✅ 稼働中 (http://localhost:3030) |
| Part 1.4 ページ | ✅ HTTP 200 |
| Part 1.5 ページ | ✅ HTTP 200 |
| Part 1.6 ページ | ✅ HTTP 200 |
| 既存ページ (Part 0, 1.1, 1.3) | ✅ 全て HTTP 200 |
| Vitest テスト | ✅ **38/38 pass** (5 ファイル) |
| pre-commit hook | ✅ 3 回とも通過 |

## コミット履歴 (ラウンド 3 分)

```
ef137f0 feat(part1): 1.6 イベントハンドラを実装           ← 今回
b6e75bb feat(part1): 1.5 props を DOM 属性として反映      ← 今回
b4c1b2f feat(part1): 1.4 単純な再帰的レンダラーを実装      ← 今回
d58226a docs: WORK_NOTES.md を Part 1.3 完了で更新
f0d92e1 feat(part1): 1.3 createElement を実装
cebdfc4 feat: Part 0 ドラフト完成 + Part 1 開始 (createRoot API)
72dbcad chore: プロジェクト初期化
```

リモートには **未 push**（ラウンド 2 〜 3 分）。`feat/part0-content-and-prep` ブランチ上のローカル commit。

---

## レビューしてほしいポイント

### A. render.ts のサイズと責務（提案あり）

現在の `render.ts` は 1.4 → 1.6 で育ち、約 90 行。`render`, `applyProps`, `isEventProp`, `getEventName` の 4 つを持っています。

提案:
- **そのまま**: 教育目的で 1 ファイルにまとまっている方が章で読みやすい
- **分割**: `apply-props.ts` を独立させる
- **新規 events.ts**: イベント判定ロジックだけ別ファイルに

私の暫定推奨は **そのまま**。Part 1.10（差分計算）まで進んでから複雑度を見て判断する方が良さそうです。

### B. テストファイルの構成

現在 `tests/` 配下に:
- `create-root.test.ts` (3)
- `create-element.test.ts` (8)
- `render.test.ts` (8)
- `props.test.ts` (10)
- `events.test.ts` (9)

`render` 周りの 3 ファイルを `render/` サブディレクトリに集めるか? 現状はフラットで読みやすいですが将来増えると検討余地あり。

### C. 章タイトル・ナンバリング

`010 / 030 / 040 / 050 / 060` と `020` をスキップしています（020 = 1.2 「パッケージ設計」を未執筆）。
1.2 は 1.3 で types.ts を分離した時の流れに自然に組み込めるので、**遡って書くか / 削除するか / 別の位置にするか** が論点。

### D. TypeScript の `key[2] === key[2]?.toUpperCase()` イディオム

`isEventProp` での 3 文字目大文字判定にこの書き方を使いました。読みづらければ `/^on[A-Z]/.test(key)` の正規表現の方が直感的かもしれません。

```ts
// 現状
function isEventProp(key: string): boolean {
  return key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()
}

// 案: 正規表現
function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key)
}
```

正規表現の方が短く意図が明確かも。コメント募集です。

---

## 累計成果物（このブランチ全体）

### コード
- `packages/@chibireact/core/src/`
  - `types.ts` ✅
  - `create-root.ts` ✅
  - `create-element.ts` ✅
  - `render.ts` ✅ (props + events 含む)
  - `index.ts` ✅
- `packages/@chibireact/core/tests/`
  - 5 ファイル / **38 テスト all pass**

### 本文 (10-minimum/)
- `010-create-root-api.mdx` (1.1)
- `030-create-element.mdx` (1.3)
- `040-recursive-renderer.mdx` (1.4)
- `050-props.mdx` (1.5)
- `060-event-handlers.mdx` (1.6)

### Part 0 (00-introduction/)
- `010-about` / `020-what-is-react` / `030-react-core-components` / `040-setup-project`

### ドキュメント
- `README.md`
- `CHAPTER_TEMPLATE.md`
- `CONTRIBUTING.md`
- `WORK_NOTES.md` (このファイル)
- `Plans/01〜04`

---

## 次にやれそうなこと

| # | タスク | 工数 | 備考 |
|---|---|---|---|
| **a** | 1.4〜1.6 を push して PR 作成 (もしくは branch 整理) | 5〜15 分 | レビュー OK の場合 |
| **b** | Part 1.7「children と入れ子構造」を書く | 1〜2 時間 | サイズ S、最初の動的 children を考える |
| **c** | Part 1.8「関数コンポーネントの最小実装」を書く | 2〜3 時間 | サイズ M、render から関数を呼べるようにする |
| **d** | 1.2「パッケージ設計」を遡って書く | 1〜2 時間 | スキップしている 020 番のスロット |
| **e** | examples/ ディレクトリを実際に動かせるようにする | 1〜2 時間 | 1.4 章で言及した examples/01-render を実装 |
| **f** | 仕事プロジェクトの ~/work/ 移行 | 別セッション推奨 | git multi-account 整備の続き |
| **g** | Cloudflare Workers デプロイ | 1〜2 時間 | OpenNext 経由で実機公開 |

私の推奨は **a (PR/レビュー) → b (1.7) → c (1.8)** の順。Part 1 のクライマックスは 1.9〜1.10（useState + 再レンダリング）で、そこに到達すると「動く React」が完成します。

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。各ラウンドの内容は git log に残るので、WORK_NOTES.md は補助メモとしての役割です。
