# 既存教材リサーチと差別化方針 (Prior Art)

作成日: 2026-05-02
前提: [02-toc-draft.md](./02-toc-draft.md) の章立て案を踏まえ、既存教材との **重複箇所 / 古くなっている箇所 / 完全な空白地帯** を特定する。
目的: chibireact の差別化ポイントを言語化し、章立て v2 に反映できる材料を揃える。

---

## 1. 主要な既存教材一覧

### 英語圏

| # | 教材 | 著者 | 年 | 対象 | カバー範囲 | 形式 |
|---|---|---|---|---|---|---|
| E-1 | [Build your own React (Didact)](https://pomb.us/build-your-own-react/) | Rodrigo Pombo | 2019 (更新停止) | React 16.8 | createElement / render / Fiber / Reconciliation / **useState のみ** | 単発長文記事 + GitHub コミット履歴 |
| E-2 | [A Cartoon Intro to Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) | Lin Clark (React Conf 2017) | 2017 | React 16 (Fiber 導入直後) | Fiber 概念のみ | 30 分の講演動画 |
| E-3 | [overreacted.io](https://overreacted.io/) / [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) | Dan Abramov | 2018-2024 | React 16-18 | Reconciliation / Hooks 設計思想 / Concurrent / クロージャ問題 | 単発記事の集合 |
| E-4 | [React Source Code Walkthrough](https://jser.dev/series/react-source-code-walkthrough/) / [DDIR 有料コース](https://jser.dev/2024-05-11-introducing-ddir/) | JSer.dev | 2021-2024 継続中 | React 18 | 初回マウント / 再レンダー / **ほぼ全 Hooks** / Suspense / Concurrent / Error Boundary / Context / Hydration / memo | ブログ + 動画 + 39 エピソード超 |
| E-5 | [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) | acdlite (React コア) | 2016 | 初期 Fiber | Fiber 概念のみ | README 1 枚 |
| E-6 | Frontend Masters の React 系コース ([Performance v2](https://frontendmasters.com/courses/react-performance-v2/) 等) | 各種 | 2023-2024 | React 18 | アプリ開発 / 一部内部解説 | 有料動画コース |
| E-7 | GitHub の "tiny/mini react" 系リポジトリ群 ([TinyReact](https://github.com/theyashwanthsai/TinyReact), [zserge/o](https://github.com/zserge/o), [bubucuo/mini-react](https://github.com/bubucuo/mini-react), [KensukeTakahara/build-your-own-react](https://github.com/KensukeTakahara/build-your-own-react), [pomber/didact](https://github.com/pomber/didact)) | 各種 | 2017-2023 | 主に React 16 | createElement / Fiber 中心、ほとんどが Pombo 派生 | コードリポジトリ |
| E-8 | [How to Implement RSC From Scratch](https://letsreact.org/how-to-implement-react-server-components-from-scratch) | LetsReact | 2024 | React 19 | RSC の最小実装 | 単発記事 |

### 日本語圏

| # | 教材 | 著者 | 年 | 対象 | カバー範囲 | 形式 |
|---|---|---|---|---|---|---|
| J-1 | [React の内部の仕組み読み解きガイド](https://zenn.dev/calloc134/articles/how-react-works-guide) | calloc134 | 2025-06、執筆中 | React 18.2 | 4 フェーズ / Fiber / Lanes / Suspense / Hydration（**Hooks は未執筆**）| Zenn 連載（**読解**ガイド、自作ではない）|
| J-2 | [React Fiber とその周りについて調べた](https://zenn.dev/reo777/articles/025d6342c86980) | reo777 | 2021-09 | React 16+ | Fiber 概念 + Pombo 派生の補足 | 単発 Zenn 記事 |
| J-3 | [React を解き明かす：宣言的UIから Fiber アーキテクチャ、そして未来のWebへ](https://zenn.dev/asagumo/articles/368af532918505) | asagumo | — | — | 概念解説 | 単発 Zenn 記事 |
| J-4 | [React のトランジションで世界を分岐させるハンズオン](https://zenn.dev/uhyo/books/react-concurrent-handson-2/viewer/mixing) | uhyo | — | React 18 | Concurrent / Transitions の **使い方** | Zenn Book |
| J-5 | [POSTD: React Fiber アーキテクチャについて](https://postd.cc/react-fiber-architecture/) | acdlite (POSTD 翻訳) | 2016 | 初期 Fiber | Fiber 概念のみ | 翻訳記事 |
| J-6 | 入門書群（「作りながら学ぶ React 入門」「入門 React」「りあクト!」「基礎から学ぶ React/Hooks」）| 各種 | 2020-2024 | React 16-18 | **利用者向け、内部実装には踏み込まない** | 書籍 |

### 重要な確認: chibivue 著者の React 版は存在しない

ubugeeei 氏の [GitHub](https://github.com/Ubugeeei) と [work-log discussion](https://github.com/Ubugeeei/work-log/discussions/93) を確認したが、chibireact 系プロジェクトの **計画も実装も無し**。Vue.js / Rust / MoonBit が活動中心。

→ **最大の競合候補が不在**。これは大きな追い風。

---

## 2. 領域ごとのカバー状況マトリクス

横軸: chibireact の Part、縦軸: 既存教材

| Part | 領域 | E-1 Pombo | E-3 Dan | E-4 JSer | J-1 calloc | 既存の充実度 |
|---|---|---|---|---|---|---|
| 1 | 仮想 DOM / 最小レンダラー | ✅ | △ 概念のみ | ✅ | △ | ★★★ 既存豊富 |
| 1.9 | useState 最小実装 | ✅ | △ | ✅ | ❌ 未執筆 | ★★ |
| 2 | Fiber アーキテクチャ | ✅ | ✅ | ✅ | ✅ | ★★★ 既存豊富（ただし英語が中心） |
| 3 | Hooks 全般（useEffect / useContext / useReducer / useMemo / useRef / カスタムフック） | ❌ | △ 設計のみ | ✅ | ❌ 未執筆 | ★ **空白に近い** |
| 4 | JSX 変換（classic / automatic runtime） | △ 概要のみ | ❌ | △ | ❌ | ★ **空白に近い** |
| 5 | Concurrent / Suspense / Transitions / Error Boundary / Portal | ❌ | △ | ✅ | △ Suspense のみ | ★★ JSer 以外は薄い |
| 6 | SSR / Hydration / RSC | ❌ | △ | △ Hydration のみ | △ Hydration | ★ **特に RSC は世界的に空白** |

凡例: ✅ 充実 / △ 部分的 / ❌ 未対応

---

## 3. 「日本語 × 写経 × 連載書籍 × React 18+」の空白

> **結論: 4 条件すべてを満たす既存教材は存在しない。**

最も近い calloc134 氏の Zenn 記事も:
- (a) Hooks 章が未執筆
- (b) 写経ではなく**読解**（本家ソースを読む）スタイル
- (c) 個人記事で書籍体系ではない

の 3 点で要件を満たさない。

これは chibivue が Vue 界隈で唯一無二のポジションを取れているのと **同じ構図の空白が React 側にもそのまま残っている**ことを意味する。

---

## 4. chibireact の差別化方針（5 軸）

### 4.1 ポジション
**「日本語で React 18+ の内部を写経で 1 冊にまとめる」** — 国際的にも稀なポジション。

### 4.2 Pombo の射程外を埋める
Pombo 教材が 2019 年で止まっているため、以下は **ほぼ未開拓**:

- **Hooks の網羅**: useEffect / useContext / useReducer / useMemo / useRef / カスタムフック（chibireact Part 3 全体）
- **Concurrent 系**: useTransition / useDeferredValue / Suspense（chibireact Part 5）
- **JSX 変換の最小実装**: classic / automatic runtime の両方（chibireact Part 4）
- **Hydration の最小実装**（chibireact 6.2）
- **React Server Components の概観**（chibireact 6.3）

### 4.3 chibivue ブランド連動
ubugeeei 氏が React 版を出していないため、「同じ思想の React 版がほしい」需要を真正面から取れる。
- 章タイトルのトーン（動詞中心、[02 で確定済み](./02-toc-draft.md#5-決定事項2026-05-02-確定)）
- Part 構成の番号付け方
- 付録の「30 分で React を作る」「本家 React のソースコードを読む」

これらを意図的に chibivue と対応させ、**ファン層の橋渡し**を狙う。

### 4.4 前半（Part 1〜2）の被り対策
Pombo 教材と被る範囲（createElement → Fiber → useState）はどう差別化するか。

| 軸 | chibireact での選択 | 既存教材との差 |
|---|---|---|
| 言語 | TypeScript 完全対応 | Pombo は素の JS |
| ビルド | Vite + Bun（or pnpm） | Pombo は Parcel + Babel |
| テスト | Vitest で各章にテストを置く | 既存教材はテストほぼなし |
| 進行 | 「章末に動くサンプル + テスト」をセットで提示 | Pombo は最終形のみ |
| 説明 | 「なぜこう書くか」を Dan の overreacted 流に毎章入れる | Pombo は手順中心、なぜが薄い |

### 4.5 リスクと前提
- **着手しないと優位性が消える**: calloc134 氏が Hooks 章を書き終えると、日本語空白の一部が埋まる
- **JSer.dev 日本語化リスク**: 翻訳記事が出ると重なる範囲が増える（ただし JSer は読解寄りなので完全競合ではない）
- **公式ドキュメントの更新**: React 公式が「How React Works」的なページを充実させると一部優位性が低下

→ **MVP（基盤 + Part 1 の数章）を 1 ヶ月以内に公開**するのが望ましい。ポジション確保の意味で。

---

## 5. 02 (TOC) への反映候補

リサーチ結果を踏まえて [02-toc-draft.md](./02-toc-draft.md) に追加検討すべき項目:

1. **Part 6 の RSC 章の扱いを再考**
   - 現状「概観 1 章のみ」だが、世界的に空白なので 2-3 章に拡張する選択肢もある
   - ただし [02 の決定事項](./02-toc-draft.md#5-決定事項2026-05-02-確定) で「フレームワーク前提なのでスコープ外」と決めているので、迷うところ
   - → 「概観 1 章 + 付録に最小 RSC 実装」くらいが折衷案

2. **Part 4 (JSX) の章数を 4 → 5 に増やす検討**
   - 既存教材の空白なので、ここを厚くするとオリジナリティが出る
   - 追加候補: 「Babel/SWC プラグインの中身」「JSX の TypeScript 型 (`JSX.IntrinsicElements`)」

3. **Part 1 全体に「テスト駆動で書く」スタイルを明示**
   - Pombo との差別化軸の一つとして TOC に明記

4. **付録に「本家 React のソースコードを読む」を残す**
   - JSer.dev へのレスペクトを示しつつ、本書はあくまで「自作する本」と位置付ける橋渡し

---

## 6. 次の作業

→ [02-toc-draft.md](./02-toc-draft.md) を v2 に更新（本ファイルの第 5 節を反映）
→ その後、章ごとの詳細執筆計画 `04-content-plan.md` に進む（章ごとの目的・コード片の概略・想定ページ数）
→ 並行して、Nextra で空プロジェクトを立ち上げる作業（基盤 PoC）も着手可能
