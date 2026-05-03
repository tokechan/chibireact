# Contributing to chibireact

本書の執筆・改善に関わるためのガイドです。当面は著者本人 (tokechan) の備忘も兼ねています。

## 開発環境のセットアップ

### 必要なもの

- **Node.js 22+** (推奨: 最新 LTS)
- **pnpm 10+**
- **Git**
- GitHub アカウント

### Clone (推奨: SSH エイリアス使用)

このプロジェクトは個人アカウント (`tokechan`) のリポジトリです。複数 GitHub アカウント運用環境では、SSH ホストエイリアスを使うのが安全です:

```bash
# 個人アカウント用のエイリアスで clone
git clone git@github.com-tokechan:tokechan/chibireact.git ~/personal/chibireact
cd ~/personal/chibireact
```

> **配置場所が `~/personal/` であることが重要**
> `~/.gitconfig` の `includeIf` ルールにより、`~/personal/` 配下のリポジトリは自動的に個人 GitHub の noreply メールでコミットされます。それ以外の場所に置くと、仕事用メールが履歴に紛れる可能性があります。詳細は [`~/dev/Plans/github-multi-account-guide-2026.md`](https://github.com/tokechan/chibireact/blob/main/Plans/) のローカル参照ガイドを参照してください（個人ノート）。

### 依存インストールと dev server

```bash
cd site
pnpm install
pnpm dev    # http://localhost:3030
```

## ブランチ戦略

### 鉄則: **main に直接コミット・push しない**

初回リポジトリ作成時を除き、すべての変更は feature ブランチ → PR → main マージ の流れで進めます。

### ブランチ名の規約

```
<type>/<short-description-kebab-case>
```

| type | 用途 | 例 |
|---|---|---|
| `feat` | 新規機能、新しい章の追加 | `feat/part1-create-root-api` |
| `fix` | バグ修正、誤字脱字 | `fix/typo-in-040-setup` |
| `docs` | ドキュメント更新（本文以外）| `docs/update-readme` |
| `chore` | 雑務（依存更新、設定変更）| `chore/upgrade-nextra` |
| `refactor` | 動作不変の整理 | `refactor/extract-toc-helper` |

### 典型的な作業フロー

```bash
# 最新の main を取得
git checkout main
git pull origin main

# feature ブランチを切る
git checkout -b feat/part1-create-root-api

# 作業 → コミット
# (pre-commit hook が user.email を自動検証する)

# push
git push -u origin feat/part1-create-root-api

# GitHub で PR 作成
gh pr create
```

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) 形式、**日本語で書きます**。

```
<type>: <タイトル50文字以内>

<本文 - 任意>
- なぜこの変更が必要か
- どう変えたか

<footer - Co-Authored-By など>
```

### type の使い分け

| type | 意味 |
|---|---|
| `feat:` | 新機能、新しい章の本文追加 |
| `fix:` | バグ修正、誤字脱字 |
| `docs:` | ドキュメント変更（README, CONTRIBUTING など）|
| `chore:` | 雑務（依存更新、設定変更）|
| `refactor:` | 動作不変の整理 |
| `test:` | テストのみの追加・修正 |
| `style:` | フォーマット、空白など（動作に影響しない）|

### 例

```
feat: Part 1.1 createRoot API の章を追加

- 最小実装の createRoot を TDD で書く流れを記述
- 章末で動作確認サンプル (examples/01-create-root) へのリンク追加
```

## 本文を書くとき

[`CHAPTER_TEMPLATE.md`](./CHAPTER_TEMPLATE.md) に章の標準構造と書き方の流儀がまとめてあります。新しい章を書く前に必ず参照してください。

### 主要なファイル配置

```
site/content/
├── index.mdx                  # トップページ
├── _meta.js                   # トップレベルのサイドバー順序
├── 00-introduction/           # Part 0
│   ├── _meta.js
│   ├── 010-about.mdx
│   └── ...
├── 10-minimum/                # Part 1（執筆中）
│   └── ...
└── ...
```

### 新しい章を追加する手順

1. 該当 Part のディレクトリに `<番号>-<slug>.mdx` を作成
2. [`CHAPTER_TEMPLATE.md`](./CHAPTER_TEMPLATE.md) の構造に従って執筆
3. その Part の `_meta.js` に章を追加（順序が決まる）
4. `pnpm dev` で表示確認
5. feature ブランチでコミット → PR

## ローカル環境のチェック

push する前に以下を確認:

- [ ] `pnpm dev` で警告・エラーが出ない
- [ ] 追加した章のリンクが正しく機能する
- [ ] サイドバーに新章が表示される
- [ ] ダーク/ライトモード切替で崩れがない
- [ ] `git log -1` で commit 内容を最終確認
- [ ] pre-commit hook が通った（user.email = noreply）

## デプロイ

Cloudflare Workers + Static Assets via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) を使う予定（執筆時点では未実装）。詳細は [Plans/04-content-plan.md](./Plans/04-content-plan.md) のセクション 6 参照。

## 質問・議論

- バグ報告・改善提案: [GitHub Issues](https://github.com/tokechan/chibireact/issues)
- 章ごとのフィードバック: 該当 PR のコメント

---

最後に: 本書はゆっくり成長する個人プロジェクトです。完璧主義より「動くものを定期的に出す」を優先します。
