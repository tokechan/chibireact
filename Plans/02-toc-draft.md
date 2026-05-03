# 目次ドラフト v2: React 版「chibireact」

作成日: 2026-05-02 (v1) / 2026-05-02 (v2 更新)
前提: [01-research-chibivue-stack.md](./01-research-chibivue-stack.md) と [03-prior-art.md](./03-prior-art.md) の調査結果を反映。
目的: chibivue を骨格にしつつ React の本質に合わせて再設計した目次の **確定案**。実装着手の前提情報。

## v2 での変更点
- **Part 4 (JSX): 4 → 5 章**（既存教材で空白なのでオリジナリティ強化、03 の指摘反映）
- **Part 6 の RSC: 概観 1 章 + 付録に最小実装を追加**（世界的空白だが本書スコープを保つための折衷）
- **Part 1 全体に TDD スタイルを明示**（Pombo との明確な差別化軸）
- **インフラ採用: Cloudflare Workers + Static Assets**（Pages ではない理由含め [01 の第 6 節](./01-research-chibivue-stack.md#6-インフラ選定-cloudflare-workers--static-assets2026-05-02-確定)参照）
- **合計章数: 51 → 53** に増加

---

## 1. 設計方針（なぜ単純コピーにしないのか）

Vue と React は **アーキテクチャが根本的に違う**ので、chibivue の章をそのまま React に置換すると不自然な部分が大量に出る。具体的な差:

| 観点 | Vue (chibivue) | React (chibireact) | 影響 |
|---|---|---|---|
| テンプレート言語 | HTML 風テンプレート + ディレクティブ (`v-if` など) | **JSX = JavaScript 式そのもの** | chibivue の Template Compiler 16 章は React では大幅縮小 |
| コンポーネント定義 | SFC (`.vue`、template/script/style の 3 ブロック) | **関数（or クラス）コンポーネントのみ** | chibivue の SFC Compiler 6 章は React では不要 → JSX 変換に置換 |
| リアクティビティ | Proxy ベース (`ref`/`reactive`) で値の変更を追跡 | **不変 state + 再レンダリング**、変更は setState で明示 | リアクティビティの章群は哲学から書き直し |
| 描画戦略 | Stack ベースの再帰的 diff | **Fiber（中断可能な作業単位）** | React の心臓部、専用 Part を新設 |
| ロジックの再利用 | Composition API (`setup` 内のフック関数) | **Hooks**（React 固有の主役機能） | 新設 Part として厚く扱う |
| 並行描画 | Vapor Mode（実験的） | **Concurrent Rendering / Suspense / Transition** | React の現代的特徴、Part として独立 |

### 結論
- **章番号体系は chibivue を踏襲しない**。React の構造に合わせて Part を再設計する
- ただし chibivue 経験者が読んでも対応関係が分かるよう、付録に **マッピング表** を置く
- chibivue にない React 固有トピック（Fiber / Hooks / Concurrent）は **別 Part として独立** させて存在感を出す

### 想定の対象 React バージョン
**React 18 を主軸に React 19 の差分を補足**。ただし「Fiber がなぜ生まれたか」を語るために React 16 以前の Stack Reconciler の話も冒頭で触れる。

---

## 2. 第一案：Part 構成の全体像

| Part | タイトル | 章数 | chibivue 対応 |
|---|---|---|---|
| 0 | Getting Started | 4 | Getting Started (4) |
| 1 | Minimum Example: 最小の React を作る | 13 | Minimum Example (20) を React 用に再構成 |
| 2 | Reconciler の改良: Fiber へ | 7 | **新設**（Basic Virtual DOM 4 + α を発展） |
| 3 | Hooks の実装 | 9 | Basic Reactivity System (6) + Basic Component System (5) を統合・再設計 |
| 4 | JSX とビルドツール | **5** | Basic Template Compiler (16) を大幅縮小、ただし既存教材空白なので 1 章増 |
| 5 | Concurrent Rendering と Suspense | 6 | **新設**（一部 Web Application Essentials の Vapor Mode を置換） |
| 6 | Web Application Essentials | 5 | Web Application Essentials (5) と同名 |
| 7 | 付録 | **4** | 付録 (2) + マッピング表 + 最小 RSC 実装 |
| **合計** | — | **53** | （chibivue は 68 章） |

---

## 3. 章立て詳細案

### Part 0: Getting Started (4)

| # | タイトル | メモ |
|---|---|---|
| 0.1 | はじめに | 本書の目的、想定読者、進め方 |
| 0.2 | React とは何か | Vue との比較で位置づける（あえて Vue を引き合いに出す） |
| 0.3 | React を構成する主要な要素 | UI ランタイム / 仮想 DOM / Reconciler / JSX / Hooks の概観 |
| 0.4 | 本書の進め方と環境構築 | Vite + TypeScript + Vitest |

---

### Part 1: Minimum Example: 最小の React を作る (13)

> **方針**: 「render 関数 1 個で DOM を描く」から始めて、props・children・状態・関数コンポーネントまで最小機能で動く「俺 React」を作る。Fiber や Hooks の詳細は次 Part 以降に分離する。
>
> **重要な書き口**: **テスト駆動 (Vitest)** で進める。各章の冒頭に「期待する振る舞い」をテストとして書き、その後実装する。これは Pombo "Build your own React" との明確な差別化軸（Pombo は最終形のみ提示、テストなし）。

| # | タイトル | chibivue 対応 |
|---|---|---|
| 1.1 | 初めてのレンダリングと createRoot API | createApp API |
| 1.2 | パッケージ設計 | パッケージの設計 |
| 1.3 | 仮想 DOM ノードを作る（createElement の自作） | HTML要素をレンダリングできるようにしよう |
| 1.4 | DOM への描画: 単純な再帰的レンダラー | ↑の続き |
| 1.5 | props を扱う | Props の実装 |
| 1.6 | イベントハンドラに対応する（合成イベントの考え方） | イベントハンドラや属性に対応してみる |
| 1.7 | children と入れ子構造 | （chibivue では仮想 DOM 章に統合）|
| 1.8 | 関数コンポーネントの最小実装 | コンポーネント指向で開発したい |
| 1.9 | 状態を持たせる: useState の最小実装 | 小さいリアクティビティシステムを実装してみる |
| 1.10 | 再レンダリングのトリガーと差分適用 | 小さい仮想 DOM |
| 1.11 | リスト描画と key | key属性とパッチレンダリング |
| 1.12 | TypeScript 化: JSX.IntrinsicElements の整備 | （新設）|
| 1.13 | ちょっと一息 | ちょっと一息 |

> **chibivue にあって省くもの**: Emit の実装（React は props 経由のコールバックなので 1.5 に内包）、テンプレートコンパイラ全般（Part 4 へ）、SFC 関連（不要）、データバインディング（React は単方向なので存在しない）

---

### Part 2: Reconciler の改良: Fiber へ (7) 【新設】

> **方針**: ここが React 本の差別化ポイント。「なぜ Stack Reconciler を捨てて Fiber にしたのか」を歴史的経緯とともに語り、最小の Fiber 実装まで作る。

| # | タイトル | 補足 |
|---|---|---|
| 2.1 | Reconciliation の前提知識 | diff アルゴリズム一般論 |
| 2.2 | Stack Reconciler の限界 | 同期再帰の問題、長時間タスクが UI を止める |
| 2.3 | Fiber Node とは何か | Linked-list ベースの作業単位 |
| 2.4 | work loop と作業の単位化 | unitOfWork、performUnitOfWork |
| 2.5 | requestIdleCallback と最小スケジューラ | chibivue の「スケジューラ」章相当 |
| 2.6 | 二重バッファ: current ツリーと workInProgress | React 固有の概念 |
| 2.7 | Commit phase と副作用フラグ | placement / update / deletion |

---

### Part 3: Hooks の実装 (9) 【新設】

> **方針**: React の主役機能。「なぜ Hook ルールがあるのか」を実装の都合から導く。chibivue の Reactivity System (6) と Component System (5) を統合し、React の文脈で再構成する。

| # | タイトル | chibivue 対応 |
|---|---|---|
| 3.1 | Hook の前提知識: なぜルールが必要か | Reactivity の最適化 |
| 3.2 | useState の内部実装 | ref api（の React 版） |
| 3.3 | useReducer の実装 | （新設）|
| 3.4 | useEffect: commit 後の副作用 | ライフサイクルフック |
| 3.5 | useLayoutEffect との違いと使い分け | （新設）|
| 3.6 | useContext と Context API の実装 | Provide/Inject |
| 3.7 | useMemo / useCallback とメモ化 | computed / watch api |
| 3.8 | useRef: ミュータブルな箱 | （新設）|
| 3.9 | カスタムフックとロジックの再利用 | （新設）|

> **chibivue にあって省くもの**: スロット（React は children prop で素直）、setupContext、Options API、Effect Scope の細部、Reactive Proxy Handler の章群（React の哲学では不要）

---

### Part 4: JSX とビルドツール (5)

> **方針**: chibivue の 16 章ある Template Compiler を 5 章に圧縮。理由は明白で、JSX は JavaScript 式そのものなので独自パーサが要らない。Babel/SWC の `@babel/plugin-transform-react-jsx` 相当を最小実装する。
>
> **既存教材で空白の領域** ([03 のリサーチ](./03-prior-art.md))。Pombo は概要止まり、JSer.dev も部分的なので、ここを厚く書くと差別化になる。

| # | タイトル | chibivue 対応 |
|---|---|---|
| 4.1 | JSX とは何か（シンタックスシュガーの正体）| テンプレートコンパイラを理解する |
| 4.2 | classic runtime: JSX → React.createElement 変換 | テンプレートコンパイラを実装する |
| 4.3 | automatic runtime: JSX → jsx() 変換（React 17+）| （新設）|
| 4.4 | 簡単な JSX トランスフォーマを Babel プラグインとして実装する | （新設）|
| 4.5 | JSX の TypeScript 型 (`JSX.IntrinsicElements`) | （新設）|

> **chibivue にあって省くもの**: ディレクティブ全般（v-bind / v-on / v-if / v-for）、SFC 関連 6 章すべて、Scoped CSS、defineProps/defineEmits

---

### Part 5: Concurrent Rendering と Suspense (6) 【新設】

> **方針**: React の現代的特徴。Vue にも存在しない領域なのでオリジナリティが出せる。

| # | タイトル | 補足 |
|---|---|---|
| 5.1 | Concurrent Rendering の前提知識 | 中断・優先度・複数ツリーの並走 |
| 5.2 | startTransition と低優先度更新 | |
| 5.3 | useDeferredValue | |
| 5.4 | Suspense: 「読み込み中」の一般化 | データ取得 + コード分割の統一インターフェース |
| 5.5 | Error Boundary | |
| 5.6 | Portal | |

---

### Part 6: Web Application Essentials (5)

| # | タイトル | chibivue 対応 |
|---|---|---|
| 6.1 | SSR: renderToString | Server Side Rendering |
| 6.2 | Hydration の仕組み | （新設）|
| 6.3 | React Server Components の概観 | （Vapor Mode を置換）|
| 6.4 | 組み込みコンポーネント: Fragment / StrictMode | 組み込みコンポーネント |
| 6.5 | パフォーマンス最適化のチェックリスト | 最適化 |

---

### 付録 (4)

| # | タイトル | chibivue 対応 |
|---|---|---|
| A.1 | 30 分で React を作る（1 ファイル版）| 15 分で Vue を作る |
| A.2 | 本家 React のソースコードを読む（JSer.dev 連動）| 本家のソースコードをデバッグする |
| A.3 | chibivue ↔ chibireact 章マッピング表 | （新設）|
| A.4 | 最小 RSC 実装に挑戦する | （新設、世界的空白領域への挑戦）|

---

## 4. 章数比較サマリ

| Part | chibivue | chibireact | 増減 | 理由 |
|---|---|---|---|---|
| Getting Started | 4 | 4 | ±0 | |
| Minimum Example | 20 | 13 | -7 | テンプレート/SFC 関連を別 Part / 不要に |
| Virtual DOM 系 | 4 | (Part 2 に統合) 7 | +3 | Fiber 専用 Part に格上げ |
| Reactivity System | 6 | (Part 3 に統合) | | Hooks に再構成 |
| Component System | 5 | (Part 3 に統合) 9 | -2 | Reactivity と統合 |
| Template Compiler | 16 | 5 | **-11** | JSX で大幅縮小（既存空白なので 1 章増やしてオリジナリティ強化）|
| SFC Compiler | 6 | 0 | **-6** | React に SFC は無い |
| Web App Essentials | 5 | 5 + 6 (Concurrent) | +6 | Concurrent/Suspense を新設 |
| 付録 | 2 | 4 | +2 | マッピング表 + 最小 RSC 実装 |
| **合計** | **68** | **53** | **-15** | |

→ **15 章の純減**。テンプレート/SFC で減らした分を Fiber と Concurrent に投資した格好。執筆工数は単純比例ではないが、概算で **3 章減 ≒ 半月減** とすると、フル版の見積もりは [01-research](./01-research-chibivue-stack.md) の「3〜6 ヶ月」が妥当。

---

## 5. 決定事項（2026-05-02 確定）

1. **対象読者**: **中級者**（React は使えるが内部を知らない人）
   - 理由: chibivue 自体がそのトーンで対応関係を取りやすい / 入門者向けは既存資料が豊富で差別化困難 / エキスパート向けは読者数が少なく執筆モチベーションが続きにくい
   - 影響: Part 0 の「React とは何か」は概観に留めて深入りしない

2. **対象 React バージョン**: **React 18 主軸 + React 19 差分補足**
   - 18 が現在の事実上の標準（Concurrent / Suspense / startTransition が安定済み）
   - 19 は Server Components / Actions / `use()` など破壊的でない追加が中心 → 最後に差分章で吸収
   - 16（Fiber 導入）は Part 2 の歴史的経緯の章で触れるだけ
   - **Server Components は概観 1 章のみ、深入りしない**（理由: フレームワーク前提の話が多く「React 本体を作る本」のスコープから外れる）

3. **インタラクティブ性**: **段階的 Sandpack**
   - MVP / α 版: コードブロック（Shiki）のみ
   - β 版以降: 「動かすと理解が深まる章」だけ Sandpack 化（Part 1 の最小レンダラー / Part 3 の useState / Part 5 の Suspense あたり）
   - 理由: 全章 Sandpack 化は工数 +30〜50% で着手ハードルが上がる。書きながら判断する

4. **章タイトルのトーン**: **動詞中心**
   - chibivue 同様「〜を実装する」「〜できるようにしよう」系で統一
   - 理由: 「自分が手を動かす本」だと一目で伝わる / chibivue ファンへの世界観継承 / 体言止めは公式ドキュメント感が出すぎる

---

## 6. 次の作業

→ `03-prior-art.md`（既存の "Build your own React" 系教材リサーチ）に進む。差別化ポイントを固めてから、章ごとの詳細執筆計画（`04-content-plan.md`）に入る予定。
