# 章ごと詳細執筆計画 (Content Plan v1)

作成日: 2026-05-02
前提: [02-toc-draft.md v2](./02-toc-draft.md) の 53 章構成を確定として、各章の **目的・実装する成果物・想定ボリューム・既存教材との関係** を整理する。
目的: 執筆着手時に「何を書くか」を毎回ゼロから考えなくて済むテンプレートを用意し、見積もり精度を上げる。

---

## 1. 全体方針

### 1.1 章テンプレート（全章共通の構造）
すべての章は次の 5 セクションで構成する:

1. **この章のゴール**: 1〜2 行で、章末に何が動くようになるか
2. **前提知識**: この章を読む前に知っておくべきこと（前章へのリンクを含む）
3. **テストを書く**: TDD スタイル。`describe`/`it` で振る舞いを宣言（[02 で確定](./02-toc-draft.md#part-1-minimum-example-最小の-react-を作る-13)した Pombo との差別化軸）
4. **実装する**: テストを通すコードを段階的に書く
5. **コミットして次へ**: GitHub の対応コミットへのリンクで章末を締める

### 1.2 リポジトリ構造（執筆者用）
```
chibireact/
├── packages/
│   └── @chibireact/                 # 自作 React 本体
│       ├── core/
│       ├── reconciler/
│       ├── jsx-runtime/
│       └── server/
├── examples/                        # 各章末で動く完成形のサンプル
│   ├── 01-minimum-renderer/
│   ├── 02-fiber-loop/
│   └── ...
├── tests/                           # 各章のテスト
└── docs/                            # Nextra による本文 (.md / .mdx)
    ├── 00-introduction/
    ├── 10-minimum/
    ├── 20-fiber/
    └── ...
```

### 1.3 ボリューム見積もり方法
1 章あたりのページ数（A4 換算）の目安:
- **Sサイズ**: 3〜5 ページ（1 〜 2 時間で読める、コード片 1 つ）
- **Mサイズ**: 5〜10 ページ（半日で読める、複数のコード片と概念解説）
- **Lサイズ**: 10〜20 ページ（1 日かけて読む、章全体で大きな機能を作る）

執筆時間の目安（1 章あたり）:
- Sサイズ: 2〜3 時間
- Mサイズ: 4〜6 時間
- Lサイズ: 8〜12 時間

---

## 2. Part 別 詳細計画

凡例:
- **🆕**: 既存教材で空白、または大幅に古い領域 → 差別化チャンス
- **♻️**: Pombo "Build your own React" など既存教材と被る領域 → TDD/TS/Vite で差別化
- **🚧**: 設計判断が必要、執筆前に方針を固める章

### Part 0: Getting Started (4 章)

| # | タイトル | サイズ | 実装する成果物 | 注記 |
|---|---|---|---|---|
| 0.1 | はじめに | S | （実装なし、本書の説明）| chibivue を引用しつつ自書のスコープを明示 |
| 0.2 | React とは何か | S | （実装なし）| Vue との比較で位置づける |
| 0.3 | React を構成する主要な要素 | M | （実装なし）| UI ランタイム / VDOM / Reconciler / JSX / Hooks の概観図 |
| 0.4 | 本書の進め方と環境構築 | M | リポジトリ初期化、Vitest 動作確認 | Vite + TypeScript + Vitest + pnpm |

**Part 0 小計**: 4 章 / 想定 12〜20 時間 / S2 + M2

---

### Part 1: Minimum Example (13 章) — TDD スタイル

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 1.1 | createRoot API | S | `createRoot(container).render(element)` の最小骨格 | ♻️ |
| 1.2 | パッケージ設計 | M | モノレポ構成、`@chibireact/core` の切り出し | 🚧 |
| 1.3 | createElement の自作 | M | `createElement(type, props, ...children)` → `{type, props, children}` | ♻️ |
| 1.4 | 単純な再帰的レンダラー | M | DOM ツリーへの初回描画 | ♻️ |
| 1.5 | props を扱う | S | className / style / data-* | ♻️ |
| 1.6 | イベントハンドラに対応する | M | `onClick` 等の合成イベントの考え方 | ♻️ |
| 1.7 | children と入れ子構造 | S | 配列 children、テキストノード | ♻️ |
| 1.8 | 関数コンポーネントの最小実装 | M | `function App() { return ... }` のサポート | ♻️ |
| 1.9 | useState の最小実装 | L | グローバル currentComponent + index 配列で実装 | ♻️ |
| 1.10 | 再レンダリングのトリガーと差分適用 | L | setState → 再描画 | ♻️ |
| 1.11 | リスト描画と key | M | key による効率的な diff | ♻️ |
| 1.12 | TypeScript 化: JSX.IntrinsicElements の整備 | M | 型補完が効く状態にする | 🆕 |
| 1.13 | ちょっと一息 | S | Part 1 の総括、次 Part への橋渡し | — |

**Part 1 小計**: 13 章 / 想定 60〜90 時間 / S4 + M7 + L2

---

### Part 2: Reconciler の改良: Fiber へ (7 章)

> **方針**: Pombo は Fiber を扱うが浅め。JSer.dev は深いが日本語版がない。ここは「**日本語で写経しながら Fiber を理解する唯一の連載**」を目指す。

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 2.1 | Reconciliation の前提知識 | M | （実装なし、概念図中心） | 🆕 |
| 2.2 | Stack Reconciler の限界 | M | 同期再帰版を計測 → UI が止まる現象を再現 | 🆕 |
| 2.3 | Fiber Node とは何か | M | Fiber 構造体の定義（child / sibling / return） | ♻️ |
| 2.4 | work loop と作業の単位化 | L | performUnitOfWork の実装 | ♻️ |
| 2.5 | requestIdleCallback と最小スケジューラ | M | scheduler の自作 | ♻️ |
| 2.6 | 二重バッファ: current ツリーと workInProgress | L | alternate ポインタの整備 | 🆕 ほぼ既存教材で扱われない |
| 2.7 | Commit phase と副作用フラグ | L | placement / update / deletion の集約適用 | 🆕 |

**Part 2 小計**: 7 章 / 想定 40〜60 時間 / M3 + L4

---

### Part 3: Hooks の実装 (9 章)

> **方針**: ここが本書最大の差別化ポイント。Pombo は useState のみ、JSer は本家ソースの読解、calloc134 氏は未執筆。**「日本語で全 Hook を写経で実装する初の連載書籍」**になる。

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 3.1 | Hook の前提知識: なぜルールが必要か | M | （実装なし、ルールの理由を実装の都合から導く） | 🆕 |
| 3.2 | useState の内部実装 | L | Fiber に hook list を持たせて再構築 | 🆕 |
| 3.3 | useReducer の実装 | M | useState を useReducer の特殊形として実装 | 🆕 |
| 3.4 | useEffect: commit 後の副作用 | L | effect list、cleanup、deps 比較 | 🆕 |
| 3.5 | useLayoutEffect との違いと使い分け | M | commit phase での実行タイミング | 🆕 |
| 3.6 | useContext と Context API の実装 | L | createContext / Provider / consumer | 🆕 |
| 3.7 | useMemo / useCallback とメモ化 | M | deps に依存した再計算 | 🆕 |
| 3.8 | useRef: ミュータブルな箱 | S | `{current: T}` の単純さを伝える | 🆕 |
| 3.9 | カスタムフックとロジックの再利用 | M | useToggle, useDebounce 等を例に | 🆕 |

**Part 3 小計**: 9 章 / 想定 50〜80 時間 / S1 + M5 + L3

---

### Part 4: JSX とビルドツール (5 章) 🆕 既存空白領域

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 4.1 | JSX とは何か（シンタックスシュガーの正体）| M | （実装なし） | 🆕 |
| 4.2 | classic runtime: JSX → React.createElement 変換 | M | Babel 設定で動かしてみる | 🆕 |
| 4.3 | automatic runtime: JSX → jsx() 変換（React 17+）| M | jsx-runtime / jsx-dev-runtime | 🆕 |
| 4.4 | 簡単な JSX トランスフォーマを Babel プラグインとして実装する | L | `@chibireact/babel-plugin-jsx` | 🆕 |
| 4.5 | JSX の TypeScript 型 (`JSX.IntrinsicElements`) | M | 型補完を効かせる | 🆕 |

**Part 4 小計**: 5 章 / 想定 25〜40 時間 / M4 + L1

---

### Part 5: Concurrent Rendering と Suspense (6 章)

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 5.1 | Concurrent Rendering の前提知識 | M | （実装なし）| 🆕 |
| 5.2 | startTransition と低優先度更新 | L | Lanes の最小実装 | 🆕 |
| 5.3 | useDeferredValue | M | startTransition の派生 | 🆕 |
| 5.4 | Suspense: 「読み込み中」の一般化 | L | Promise を throw する仕組み | 🆕 |
| 5.5 | Error Boundary | M | componentDidCatch / getDerivedStateFromError | 🆕 |
| 5.6 | Portal | S | ReactDOM.createPortal の最小実装 | 🆕 |

**Part 5 小計**: 6 章 / 想定 30〜50 時間 / S1 + M3 + L2

---

### Part 6: Web Application Essentials (5 章)

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| 6.1 | SSR: renderToString | L | サーバ側で HTML を文字列化 | 🆕 |
| 6.2 | Hydration の仕組み | L | クライアントで既存 DOM と Fiber を紐付ける | 🆕 |
| 6.3 | React Server Components の概観 | M | 概念のみ（実装は付録 A.4 へ） | 🆕 |
| 6.4 | 組み込みコンポーネント: Fragment / StrictMode | S | 内部実装の説明 | 🚧 |
| 6.5 | パフォーマンス最適化のチェックリスト | M | memo / useMemo / Profiler API | — |

**Part 6 小計**: 5 章 / 想定 30〜50 時間 / S1 + M2 + L2

---

### 付録 (4 章)

| # | タイトル | サイズ | 成果物 | 種別 |
|---|---|---|---|---|
| A.1 | 30 分で React を作る（1 ファイル版）| M | 1 ファイルに本書全体を圧縮 | — |
| A.2 | 本家 React のソースコードを読む（JSer.dev 連動）| M | 読み方ガイド + JSer.dev へのリンク集 | — |
| A.3 | chibivue ↔ chibireact 章マッピング表 | S | 表 + 解説 | — |
| A.4 | 最小 RSC 実装に挑戦する | L | 世界的空白領域、本書の挑戦 | 🆕🆕 |

**付録 小計**: 4 章 / 想定 20〜35 時間 / S1 + M2 + L1

---

## 3. 全体ボリュームまとめ

| Part | 章数 | サイズ内訳 | 想定時間 |
|---|---|---|---|
| 0. Getting Started | 4 | S2 + M2 | 12〜20 時間 |
| 1. Minimum Example | 13 | S4 + M7 + L2 | 60〜90 時間 |
| 2. Fiber | 7 | M3 + L4 | 40〜60 時間 |
| 3. Hooks | 9 | S1 + M5 + L3 | 50〜80 時間 |
| 4. JSX | 5 | M4 + L1 | 25〜40 時間 |
| 5. Concurrent | 6 | S1 + M3 + L2 | 30〜50 時間 |
| 6. Web Essentials | 5 | S1 + M2 + L2 | 30〜50 時間 |
| 付録 | 4 | S1 + M2 + L1 | 20〜35 時間 |
| **合計** | **53** | S10 + M28 + L15 | **267〜425 時間** |

### 期間換算（副業ペース）
- 平日 1 時間 + 土日各 4 時間 = 週 13 時間 換算
- 267 時間 → **約 5 ヶ月**
- 425 時間 → **約 8 ヶ月**

→ [01-research](./01-research-chibivue-stack.md) の「3〜6 ヶ月」見積もりと整合（最大値はやや超過）。

### マイルストーン
| マイルストーン | 内容 | 累積時間 | 副業換算 |
|---|---|---|---|
| **MVP 公開** | Part 0 + Part 1 の最初の 3 章まで（1.1〜1.3）+ Cloudflare Workers にデプロイ | 〜30 時間 | **2〜3 週間** |
| **α 版** | Part 0 + Part 1 完了 + Part 2 の半分 | 〜100 時間 | **2 ヶ月** |
| **β 版** | Part 0〜3 完了（実用最低限の自作 React まで）| 〜200 時間 | **4 ヶ月** |
| **v1.0** | 全 53 章完了 | 〜400 時間 | **6〜8 ヶ月** |

---

## 4. 執筆順の提案

時系列で「読者にとって意味のある単位」で公開するなら:

1. **Phase 1 (MVP)**: Part 0 (4) + Part 1.1〜1.3 (3) — サイトが立って「俺 React が createElement まで動く」が見える
2. **Phase 2 (α)**: Part 1 完走 (残り 10 章) — Hooks 抜きの最小 React が動く
3. **Phase 3 (β)**: Part 2 (Fiber) + Part 3 (Hooks) — ここで本書の主力差別化要素が公開される
4. **Phase 4**: Part 4 (JSX) + Part 5 (Concurrent) — オリジナリティ強化
5. **Phase 5**: Part 6 + 付録 — 完全版

各 Phase 終わりに **GitHub のリリースタグを切る + 簡単なリリースノート** を出すのを推奨。読者のフィードバックを取り込む契機になる。

---

## 5. 決定事項と保留事項（2026-05-03 確定）

### 確定（5 件）

| # | 項目 | 決定 | 補足 |
|---|---|---|---|
| 0 | プロジェクト名のスペル統一 | **`chibireact`**（chibi + react、chibivue と命名パターン揃う） | ディレクトリ rename 完了 |
| 1 | モノレポツール | **pnpm workspaces** | 最小依存で十分。将来 Turborepo を段階追加可 |
| 2 | テストフレームワーク | **Vitest** | Vite 系との親和性 + `tdd-cycle` スキルの中核 |
| 3 | GitHub リポジトリ名 | **`chibireact`** | 取得可否は git push 時に確認、ダメなら `chibi-react` を予備 |
| 6 | i18n | **MVP は日本語のみ + 将来英語化を見据えた構成** | Next.js i18n routing 互換のディレクトリ構成は今のうちに整える。ただし MVP では `/ja/` プレフィックスは付けず root を日本語に |

### 保留（2 件）

| # | 項目 | 検討中の選択肢 | 保留中の代替動作 |
|---|---|---|---|
| 4 | ライセンス | A) 全 MIT / B) コード MIT + 文章 CC BY 4.0 / C) コード MIT + 文章 CC BY-SA 4.0 | `LICENSE` を仮で TBD プレースホルダ。決まり次第差し替え |
| 5 | ホスト名 | `chibireact.land` / `book.chibireact.land` / その他 | Cloudflare Workers 既定の `*.workers.dev` URL で運用。独自ドメインは後付け可 |

---

## 6. 次の作業

→ Nextra PoC は完了済み（[site/](../site/) で `pnpm dev` で起動可能）
→ git init + GitHub repo 作成
→ Cloudflare Workers + Static Assets デプロイ（OpenNext 経由）
→ Part 0 / Part 1 の本文執筆スタート
