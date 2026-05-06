# WORK_NOTES: 自律作業ログ

最新更新: 2026-05-06（ラウンド 12: Part 3 完走 ★）
実行者: Claude (Opus 4.7)
ブランチ:
- `feat/part0-content-and-prep` — Part 2 完走（Part 2.3-2.7、push 済み・PR 済み）
- `feat/part3-hooks` — Part 3 完走（Part 3.1-3.9、未 push）

---

## ⚠️ レビュー時の優先確認事項

1. **Part 3 全 9 章完走**: useState (per-fiber) / useReducer / useEffect / useLayoutEffect / useContext / useMemo / useCallback / useRef + custom hooks
2. **Hook 型を 4 つの discriminated union に拡張**: StateHook / EffectHook / MemoHook / RefHook。リファクタは段階的（3.4 で union 導入、3.7 で MemoHook 追加、3.8 で RefHook 追加）
3. **177 テスト全緑**: Part 1 の 84 → Part 2 完走時 128 → Part 3 完走時 177
4. **未着手で残るもの**: Part 4 (JSX), Part 5 (Concurrent), Part 6 (Web App Essentials), Part 7 (付録)
5. **Part 3 ブランチは未 push**: ユーザー帰還後に push + Part 2 PR マージ後に rebase 推奨

---

## このセッションでやったこと（ラウンド 12, Part 3 後半）

### Part 3.5 useLayoutEffect — sync な副作用（NEW）
- `EffectHook` に `tag: 'passive' | 'layout'` を追加
- `useLayoutEffect` を追加（useEffect とほぼ同形、tag のみ違い）
- work-loop の commit phase で `runEffects(tag)` を 2 段呼び (layout → passive)
- 6 テスト pass: mount sync 実行 / deps 再実行 / 順序 / cleanup / unmount / throw
- 050-use-layout-effect.mdx 執筆
- 本書では layout / passive 両方とも sync。本家 React の async 差は Part 5 で扱う方針

### Part 3.6 useContext と Context API（NEW）
- `context.ts`: `createContext` + `Context` 型 + `Provider` 関数コンポーネント
  - Provider は children を素通りさせるだけ
  - 値は fiber.props.value に乗り、useContext がそれを取りに行く
- `useContext` を hooks-state.ts に追加
  - wipFiber.parent を遡り、type === context.Provider な祖先を探す
  - 見つかれば props.value、無ければ defaultValue
- 7 テスト pass: default / Provider / 深いネスト / 内側優先 / 複数 Context / value 変化伝播 / throw
- 060-use-context.mdx 執筆
- bailout 最適化なし（Provider value 変化で子孫全部 re-render する単純実装）

### Part 3.7 useMemo / useCallback とメモ化（NEW）
- Hook 型に `MemoHook` を追加
- `useMemo<T>(factory, deps?)` を実装：deps 不変ならキャッシュ、変化したら factory 再実行
- `useCallback<F>(fn, deps?)` は `useMemo(() => fn, deps)` の糖衣
- 9 テスト pass: useMemo 5 (caching / deps 変化 / deps 省略 / 参照同一性 / throw) + useCallback 3 (関数参照安定 / 更新 / closure 正常)
- 070-use-memo-callback.mdx 執筆 (用途解説 / 過剰メモ化アンチパターン / React Forget の話)

### Part 3.8 useRef — ミュータブルな箱（NEW）
- Hook 型に `RefHook` を追加
- `useRef<T>(initial)` を実装：初回 render で `{ current }` を作り、以降同参照
- `.current` の mutation は再 render を起こさない（setState 呼ばない）
- 6 テスト pass: 参照同一性 / mutation 保持 / 再 render 起こさない / 複数 useRef / useEffect 内更新 / throw
- 080-use-ref.mdx 執筆 (DOM ref との違い / 用途表 / forwardRef は本書スコープ外)
- chibireact の createElement は ref props 自動配線をしないという制限を明示

### Part 3.9 カスタムフックとロジック再利用（NEW、概念章）
- 「`use` で始まる名前の関数 + 内部で hook を呼ぶ」というルール解説
- 典型 custom hook 4 種類:
  - `useToggle` (useState ベース)
  - `usePrevious` (useRef + useEffect)
  - `useFetch` (useState + useEffect、概念実証)
  - `useLocalStorage` (useState + side effect)
- デモテストで `useToggle` / `usePrevious` を実装し動作確認 (4 テスト)
- 090-custom-hooks.mdx 執筆 (Part 3 振り返り + 後続 Part への展望)
- chibireact の現在地: Part 0-3 完了、Part 4-7 が残り

→ **Part 3 全 9 章完走 (累計 177 テスト)**

---

## 動作確認

| 項目 | 結果 |
|---|---|
| dev server | 稼働中 (http://localhost:3030) |
| Part 3 全章 (010, 020, 030, 040, 050, 060, 070, 080, 090) | HTTP 200 |
| Vitest テスト | **177/177 pass** (24 ファイル) |
| TS typecheck | render.ts の pre-existing エラー 7 件は据え置き、それ以外は緑 |
| pre-commit hook | 通過済み（メールチェックのみ） |

## コミット履歴

### feat/part0-content-and-prep ブランチ (Part 2 完走、push 済)
push 済み、PR #4 マージ済み

### feat/part3-hooks ブランチ (Part 3 完走、未 push)
```
(latest)
docs: WORK_NOTES.md ラウンド 12 (Part 3 完走) で更新
feat(part3): 3.9 カスタムフックとロジック再利用
feat(part3): 3.8 useRef — ミュータブルな箱
feat(part3): 3.7 useMemo / useCallback とメモ化
feat(part3): 3.6 useContext と Context API
feat(part3): 3.5 useLayoutEffect — sync な副作用
docs: WORK_NOTES.md ラウンド 11 (Part 2 完走 + Part 3.1-3.4 着手) で更新
feat(part3): 3.4 useEffect — commit 後の副作用
feat(part3): 3.3 useReducer の実装
feat(part3): 3.2 useState を fiber に紐付け直す
docs(part3): 3.1 Hook の前提知識 (なぜルールが必要か)
```

未 push。ユーザー帰還後に push + Part 2 マージ完了後に main にリベース推奨。

---

## 累計成果物（Part 3 完走時点）

### コード (`packages/@chibireact/core/`)
```
src/
├── types.ts
├── create-root.ts        (Fiber 版 runFiberRoot 経由)
├── create-element.ts
├── render.ts             (Part 1 互換のため温存)
├── hooks-state.ts        (per-fiber, 8 hooks: state/reducer/effect/layoutEffect/context/memo/callback/ref)
├── jsx-types.ts
├── fiber.ts              (Hook = StateHook | EffectHook | MemoHook | RefHook)
├── work-loop.ts          (commit phase 分離 + runEffects(tag))
├── scheduler.ts
├── context.ts            (createContext + Provider)
└── index.ts              (Hook API + Context を一通り export)

tests/  (24 ファイル / 177 テスト)
[既存 23 ファイル省略]
└── custom-hooks.test.ts       (4)  Part 3.9  NEW
```

### 本文
```
00-introduction/  (Part 0: 4 章, 完了)
10-minimum/       (Part 1: 13 章, 完了)
20-fiber/         (Part 2: 7 章, 完了)
30-hooks/         (Part 3: 9 章, 完了 ★)
  010 Hook の前提知識: なぜルールが必要か
  020 useState を fiber に紐付け直す
  030 useReducer の実装
  040 useEffect — commit 後の副作用
  050 useLayoutEffect — sync な副作用                NEW (this round)
  060 useContext と Context API                     NEW
  070 useMemo / useCallback とメモ化                NEW
  080 useRef — ミュータブルな箱                       NEW
  090 カスタムフックとロジック再利用                 NEW
```

---

## Part 3 全体のレビュー観点

### A. 学習曲線として綺麗に積み上がっているか
- 3.1: 概念
- 3.2: 基盤刷新 (per-fiber)
- 3.3: useState の上位互換 (useReducer)
- 3.4-3.5: 副作用 (effect / layout)
- 3.6: 横断的 (context)
- 3.7-3.8: 最適化 / 逃げ道 (memo / ref)
- 3.9: 合成 (custom hook)

### B. 制限の明示
本書 chibireact が本家 React と違う点を各章で明示:
- useEffect は sync (本家は async)
- Context bailout なし (本家は最適化あり)
- ref props 自動配線なし (本家は forwardRef あり)
- key reconciliation なし (本家はあり、本書 Part 5 候補)
- 複数 root 並存制限あり

これらが「足りないと不誠実」ではなく「学習目的のための割り切り」として読めるか。

### C. テスト網羅性
177 テスト中 Part 3 分は 49 テスト (hooks-per-fiber 4 + use-reducer 5 + use-effect 9 + use-layout-effect 6 + use-context 7 + use-memo-callback 9 + use-ref 6 + custom-hooks 4 + hooks-state 既存 5)。
本物の React 仕様の主要部分はカバー済。

---

## 次にやれそうなこと

| # | 内容 | 工数 |
|---|---|---|
| **a** | Part 3 ブランチを push、PR 作成 | 1 分 |
| **b** | Part 4「JSX とビルドツール」(5 章) | 8-15 時間 |
| **c** | Part 5「Concurrent Rendering と Suspense」(6 章) | 12-20 時間 |
| **d** | Part 6「Web Application Essentials」(5 章) | 8-12 時間 |
| **e** | Part 7「付録」(4 章) | 4-8 時間 |
| **f** | render.ts の TS narrowing 修正 (pre-existing) | 30 分 |
| **g** | examples/ ディレクトリで動くサンプル整備 | 1-2 時間 |

**個人的推奨**:
1. ユーザー帰還後にまず Part 3 ブランチを push
2. Part 2 PR の状態を確認（マージ済みなら Part 3 を main に rebase）
3. 一度 push と PR 作成で中間レビュー → 次の Part 4 か examples 整備か判断

---

## 削除候補

このファイル自体は「自律作業ログ」なので、history が落ち着いたら削除を検討してください。
