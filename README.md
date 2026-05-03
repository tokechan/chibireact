# chibireact

> **React を小さく作りながら学ぶ本** の日本語連載書籍プロジェクト。
> Vue 学習書 [chibivue](https://book.chibivue.land/) の構成と思想を React 向けに再設計したもの。

**ステータス**: 🟡 PoC（Proof of Concept）— サイト基盤は動作確認済み、本文執筆はこれから。

---

## このプロジェクトとは

[chibivue](https://book.chibivue.land/) は「Vue を小さく作りながら学ぶ」ことを通じて Vue.js の内部実装を理解できる、日本語の連載書籍です。chibireact はその **React 版** にあたるオリジナル教材で、以下を目指します:

- **対象読者**: React は使えるが内部の仕組みは知らない**中級者**
- **対象 React バージョン**: React 18 主軸 + React 19 差分補足
- **学習スタイル**: TDD（Vitest）で写経しながら、最小実装の React を 1 ファイルずつ作っていく
- **章構成**: 全 53 章（Getting Started → Minimum Example → Fiber → Hooks → JSX → Concurrent → Web Essentials → 付録）

詳しい企画資料は [`Plans/`](./Plans/) 配下にあります。

---

## 既存教材との違い

| 既存教材 | 状況 | chibireact との関係 |
|---|---|---|
| [Build your own React (Pombo)](https://pomb.us/build-your-own-react/) | 2019 で更新停止、useState のみ | 前半が被るので **TypeScript / Vite / TDD** で差別化 |
| [JSer.dev React Source Code Walkthrough](https://jser.dev/series/react-source-code-walkthrough/) | React 18 完全対応 | 写経ではなく**読解**スタイル、英語、有料 |
| 日本語の入門書群 | 利用者向けで内部に踏み込まない | 役割が異なる |

詳細は [`Plans/03-prior-art.md`](./Plans/03-prior-art.md) を参照。

---

## ディレクトリ構成

```
chibireact/
├── Plans/                          # 企画・調査資料（執筆前のドラフト群）
│   ├── 01-research-chibivue-stack.md   # chibivue の技術スタック調査と React 版構想
│   ├── 02-toc-draft.md                 # 目次ドラフト v2（53 章構成）
│   ├── 03-prior-art.md                 # 既存教材リサーチと差別化方針
│   └── 04-content-plan.md              # 章ごと詳細執筆計画
│
└── site/                           # 書籍サイト本体（Nextra プロジェクト）
    ├── app/
    │   ├── layout.tsx              # Nextra テーマ設定（Navbar / Banner / Footer）
    │   └── [[...mdxPath]]/
    │       └── page.tsx            # MDX 動的ルーティング
    ├── content/                    # 本文（章ごとの .mdx ファイル）
    │   ├── index.mdx
    │   └── 00-introduction/
    │       ├── _meta.js            # サイドバー順序の定義
    │       ├── 010-about.mdx
    │       └── 020-what-is-react.mdx
    ├── mdx-components.tsx
    ├── next.config.mjs
    ├── package.json
    └── tsconfig.json
```

---

## 技術スタック

| カテゴリ | 採用技術 | 採用理由 |
|---|---|---|
| サイトジェネレータ | [**Nextra v4**](https://nextra.site/) (4.5.1 にピン)| chibivue が VitePress なので、React 系の対応物として最も自然 |
| フレームワーク | **Next.js 16** (App Router) | Nextra v4 の必須要件 |
| UI ランタイム | **React 19** | 最新安定版 |
| 言語 | **TypeScript 5.9** | strict 設定 |
| パッケージマネージャ | **pnpm 10** | セキュリティ既定が強い（postinstall デフォ OFF、新版 1 日隔離）/ ディスク効率良 / モノレポ強い。詳細は [`Plans/`](./Plans/) 内の package manager 調査メモ参照 |
| MDX | Nextra 標準 | 章本文を Markdown + JSX で書く |
| コードハイライト | [Shiki](https://shiki.style/) | Nextra 標準（chibivue と同じ） |
| デプロイ予定 | **Cloudflare Workers** + Static Assets via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) | 個人開発の無料枠が広い / Pages ではなく Workers が現公式の推奨 / 将来 AI 機能を Workers AI で同居しやすい |

### Nextra のバージョン固定について
Nextra **4.6.1** は Zod v4 stable 移行時の回帰バグで `LayoutPropsSchema` の `children` 検証が失敗します。修正版がリリースされるまで **4.5.1 にピン留め**しています。修正版（恐らく 4.6.3 以降）が npm に公開されたら解除予定。

---

## 環境要件

- **Node.js**: 22 以上（pnpm 11 と Nextra 4 が要求）
- **pnpm**: 10 以上
- **OS**: macOS / Linux で動作確認（Windows は未検証）

---

## 起動方法（開発環境）

```bash
# 依存インストール
cd site
pnpm install

# 開発サーバー起動（ポート 3030）
pnpm dev
```

ブラウザで http://localhost:3030/ にアクセスすると以下のページが見えます:

- `/` — トップ（[content/index.mdx](./site/content/index.mdx)）
- `/00-introduction/010-about` — はじめに
- `/00-introduction/020-what-is-react` — React とは

---

## ビルド（本番用静的出力）

```bash
cd site
pnpm build
pnpm start  # 動作確認
```

---

## デプロイ（予定）

Cloudflare Workers + Static Assets を採用予定。OpenNext for Cloudflare の手順:

```bash
# 初回のみ
pnpm add -D @opennextjs/cloudflare wrangler

# デプロイ
npx @opennextjs/cloudflare build
npx @opennextjs/cloudflare deploy
```

`wrangler.jsonc` 等の設定はデプロイ着手時に追加します。

---

## 主要ドキュメント

執筆に着手する前に必ず参照してください:

| ファイル | 内容 |
|---|---|
| [`Plans/01-research-chibivue-stack.md`](./Plans/01-research-chibivue-stack.md) | chibivue の技術スタック調査、React 版構想、インフラ選定（Cloudflare 採用理由） |
| [`Plans/02-toc-draft.md`](./Plans/02-toc-draft.md) | 目次ドラフト v2、Vue/React の構造差をどう吸収したか、決定事項一覧 |
| [`Plans/03-prior-art.md`](./Plans/03-prior-art.md) | 既存の "Build your own React" 系教材との差別化方針 |
| [`Plans/04-content-plan.md`](./Plans/04-content-plan.md) | 章ごとの詳細執筆計画、規模見積（267〜425 時間 / 副業 5〜8 ヶ月）|

---

## ライセンス

検討中（[Plans/04-content-plan.md の保留事項](./Plans/04-content-plan.md#5-決定事項と保留事項2026-05-03-確定) を参照）。

候補:
- A) 全 MIT（chibivue と同じ、最もシンプル）
- B) コード MIT + 文章 CC BY 4.0（コードと散文を性質に応じて分離）
- C) コード MIT + 文章 CC BY-SA 4.0（派生も同ライセンス強制）

決定後に `LICENSE` ファイルを追加します。

---

## クレジット

[chibivue](https://book.chibivue.land/) の作者 [@ubugeeei](https://github.com/Ubugeeei) 氏に深い敬意を込めて。本書は chibivue の構成と思想を直接的に参考にしています。
