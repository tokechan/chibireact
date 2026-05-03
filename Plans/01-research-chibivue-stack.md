# chibivue.land 調査結果と React 版構想（v1 ドラフト）

作成日: 2026-05-02
調査対象: <https://book.chibivue.land/ja/00-introduction/010-about.html>
目的: 「Vue を小さく作りながら学ぶ」chibivue 本の React 版を個人で作るにあたっての技術選定と工数見積もりの土台を整理する。

---

## 1. chibivue.land の技術スタック（実機調査）

Claude in Chrome 経由で実ページの DOM とグローバル変数を直接読んで確定したもの。

| 構成要素 | 使用技術 | 根拠 |
|---|---|---|
| サイトジェネレータ | **VitePress v2.0.0-alpha.15** | `<meta name="generator">` で明示 |
| UI ランタイム | Vue 3.5.26 | `#app.__vue_app__.version` で確認 |
| バンドラ | Vite | アセット名 `app.CiWsGcAh.js`（Vite のハッシュ形式） |
| コードハイライト | Shiki | `pre.shiki` クラスを検出 |
| 検索 | Algolia DocSearch | `.DocSearch` クラスを検出 |
| テーマ切替 | VitePress 標準 (dark/light) | `.VPSwitchAppearance` を検出 |
| サイドバー / 前後ナビ | VitePress 標準テーマ | `.VPDoc.has-sidebar.has-aside` |
| 多言語 | VitePress i18n | URL に `/ja/`, `/en/` などのプレフィックス |

### 結論
> **「Vue で全部作ったオリジナル Wiki」ではなく、VitePress というドキュメントサイトジェネレータの上に大量の Markdown を載せている**だけ。
> ジェネレータが Vue 製なので UI ランタイムも Vue だが、本文は基本 `.md` ファイル。

GitHub の `ubugeeei/chibivue` を見ると、コンテンツが章立てされた Markdown の集合であることが確認できる前提。

---

## 2. React 版で「箱」をどう作るか

VitePress の完全な React 等価物は無い。性格の近いものから 3 候補。

| 候補 | 性格 | 採用理由 | デメリット |
|---|---|---|---|
| **Nextra** (Next.js + MDX) | VitePress に最も近い | ゼロ設定、サイドバー/検索/ダーク標準、MDX で React コンポーネント埋め込み可 | Next.js の知識が必要 |
| Docusaurus (Meta 製) | 老舗の React ドキュメント SSG | 多言語/バージョニング/Algolia 標準対応、機能が一番厚い | カスタマイズに React + Webpack 知識 |
| Astro Starlight | Astro 製、React コンポーネント可 | 軽量・速い、デザインがクリーン | 厳密には React 専用ではない |

### 第一候補: **Nextra**
理由: Vue → VitePress と React → Nextra は最も自然な対応。Next.js 自体の学習曲線も React 経験があれば緩い。

### chibivue 構成要素との対応表

| chibivue | React 版 |
|---|---|
| VitePress | Nextra v3 |
| Shiki | Nextra 標準（同じ Shiki を使用） |
| Algolia DocSearch | 同じ DocSearch（無償申請可）または Nextra ローカル検索 |
| サイドバー / 前後ナビ | Nextra 標準テーマ |
| 多言語 | Next.js i18n routing |
| インタラクティブな実行例 | **Sandpack**（CodeSandbox 製、React で React の動作デモするのに最適） |

---

## 3. 時間見積もり

### A. サイト基盤（Nextra セットアップ + デプロイ）
| タスク | 想定工数 |
|---|---|
| Nextra プロジェクト初期化、テーマ調整、ナビ構造、ダーク対応 | 半日〜1日 |
| Algolia DocSearch 申請（審査 1〜2 週間）または ローカル検索 | 数時間 |
| **Cloudflare Workers + Static Assets にデプロイ**（採用理由は本ファイル末尾参照）| 1〜2 時間 |
| Sandpack 組み込み（コード実行デモが要るなら） | 半日 |
| **小計** | **2〜3 日** |

### B. コンテンツ（本体）
- chibivue は章立てで 100+ ページ規模、最小実装 → 仮想 DOM → リアクティビティ → コンパイラと積み上げる構成
- 「Build your own React」を題材にした既存教材（Rodrigo Pombo の記事、`build-your-own-react` 系）が**ベース知識として豊富**な点は追い風
- 1 章 = 概念解説 + 動くコード片 + 解説で **3〜5 時間** が現実的

| 規模 | 想定章数 | 工数 |
|---|---|---|
| MVP（基盤 + 1〜2 章） | 1〜2 | 1 週間 |
| α 版（主要概念を一通りカバー） | 約 10 | 1〜2 ヶ月 |
| フル版（chibivue 同等） | 約 30 | 3〜6 ヶ月（副業ペース） |

---

## 4. 「ただのコピー」にしないための論点（要検討）

ここから先は実装より企画の話。次セッションで詰める観点を列挙。

- **対象読者**: React 入門者か、それとも「React を使えるが内部を知りたい」中級者か
- **題材の選び方**: React 16 (legacy renderer) ベース / React 18 (Concurrent + Fiber) ベース / 「教育用に簡略化した独自方針」 のどれにするか
- **章立ての切り方**: chibivue の構成を踏襲するか、React 特有の概念（Fiber, Hooks, Suspense, Concurrent）を軸に再設計するか
- **インタラクティブ性の度合い**: 純粋にコード片を読んで写経するだけか、Sandpack で本書内で動かすところまでやるか
- **言語**: 日本語のみか、英語版も並走するか（chibivue は多言語対応している）
- **オリジナリティ**: 「Build your own React」既存教材との差別化ポイントは何か（より長尺/より体系的/より日本語圏向け 等）

---

## 5. 次にやること（候補）

1. **目次ドラフト**を別ファイルで作る（`02-toc-draft.md`）— React の概念を chibivue の構成にマッピング
2. **Nextra で空プロジェクトを立ち上げて手触りを確認**（基盤の見積もりが正しいかを実機で検証）
3. **既存の "Build your own React" 系教材リサーチ**を別ファイルにまとめ、被り回避と差別化の方針を決める

---

## 6. インフラ選定: Cloudflare Workers + Static Assets（2026-05-02 確定）

Vercel ではなく **Cloudflare Workers + Static Assets** を採用する。

### なぜ Pages ではなく Workers なのか
当初 Pages を検討したが、2026 年現在の公式スタンスは **Workers + Static Assets が新規プロジェクトの第一候補**。Pages は維持されているが新機能は Workers 側に来ている。具体的には:

- 元々は Pages が静的用、Workers が動的用という棲み分けだったが、**Workers が進化して静的アセット配信を巻き取った**
- 新機能（Smart Placement、広範な bindings、サーバーレス推論との統合）は Workers 側に優先投入される
- Next.js 側も **OpenNext for Cloudflare** (`@opennextjs/cloudflare`) が Workers をターゲットに整備され、Vercel 以外への Next.js デプロイが本格的に実用段階に入った
- 旧来の Pages 用アダプタ `@cloudflare/next-on-pages` はメンテナンスモード

### 採用理由
- **無料枠が個人開発者に圧倒的に優しい**: 帯域 / リクエスト数 / CPU 時間いずれも Vercel より緩い
- **Cloudflare 全体のエコシステムが現在進行形でホット**: Workers / R2 / D1 / Workers AI / Durable Objects がフロントエンドから一段下まで全部繋がる
- **AI 機能も自然に組み込める**: 将来「本書のチャットアシスタント」を作るなら同じ Worker 内で Workers AI を呼び出せる
- **Nextra（Next.js）の静的出力を Workers の `assets` 設定で配信できる**: `wrangler deploy` 一発

将来的に動的な機能（読者からのコメント、Discord 連携、AI チャット）が必要になっても、**同一の Worker に handler を追加するだけ**で済む点が、別サービスとして組む構成より圧倒的に身軽。

---

## 付記: 調査方法

Claude in Chrome MCP で以下を実機ブラウザ上で実行し、推測ではなく事実ベースで特定:

```js
// 主要な指紋を一括取得
({
  generator: document.querySelector('meta[name="generator"]')?.content,
  vueVersion: document.querySelector('#app').__vue_app__?.version,
  scripts: Array.from(document.scripts).map(s => s.src),
  vitepressGlobals: { __VP_HASH_MAP__: typeof __VP_HASH_MAP__ !== 'undefined' },
  searchProvider: !!document.querySelector('.DocSearch') ? 'algolia/DocSearch' : '...',
  shikiPresent: !!document.querySelector('pre.shiki'),
})
```

WebFetch だけでは不可視だった `__vue_app__` や hashed bundle 名は、ブラウザ上で JS 実行しないと取れない情報。
