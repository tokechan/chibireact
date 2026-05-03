# 章テンプレート

新しい章を書くときの雛形。各章は**この構造を踏襲**することで、読者が「次に何をすべきか」を予測しやすくなる。

ファイル配置: `site/content/<part>/<chapter-number>-<slug>.mdx`
例: `site/content/10-minimum/010-create-root-api.mdx`

---

## frontmatter（必須）

```mdx
---
title: 章のタイトル（サイドバーには _meta.js の値が出る、ここはブラウザタブ用）
description: 1 文で「この章で何が学べるか」を書く（OGP / SEO に使う）
---
```

---

## 章本文の標準構造

### 1. 「この章のゴール」セクション

冒頭に必ず置く。読者が「読んだ後に何ができるようになるか」を 1〜2 行で。

```mdx
# 章タイトル

## この章のゴール

- 〜が動くようになる
- 〜という概念が理解できる

前章: [前章タイトル](./前章スラッグ)
```

### 2. 「前提知識」セクション（必要に応じて）

この章を読む前に知っているべきこと。前章リンクや外部資料も。

### 3. 「テストを書く」セクション（Part 1 以降）

TDD スタイル。期待する振る舞いを Vitest のテストとして先に書く。

```mdx
## テストを書く

まず、createRoot がどう動くべきかをテストとして表現します:

\`\`\`ts
// packages/@chibireact/core/src/__tests__/create-root.test.ts
import { describe, it, expect } from 'vitest'
import { createRoot } from '../create-root'

describe('createRoot', () => {
  it('container を渡すと render メソッドを持つオブジェクトを返す', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    expect(root).toHaveProperty('render')
  })
})
\`\`\`

実行すると当然失敗します（まだ実装がない）:

\`\`\`
✗ createRoot > container を渡すと render メソッドを持つオブジェクトを返す
  Cannot find module '../create-root'
\`\`\`
```

### 4. 「実装する」セクション

テストを通す最小実装を書く。**Fake It → Triangulation → Obvious Implementation の順**で進化させる（[tdd-cycle スキル](~/.claude/skills/tdd-cycle/SKILL.md) 参照）。

```mdx
## 実装する

最小実装はこれだけです:

\`\`\`ts
// packages/@chibireact/core/src/create-root.ts
export function createRoot(container: HTMLElement) {
  return {
    render(element) {
      // 次の章で実装
    },
  }
}
\`\`\`

テストを再実行:

\`\`\`
✓ createRoot > container を渡すと render メソッドを持つオブジェクトを返す
\`\`\`
```

### 5. 「リファクタする」セクション（必要に応じて）

テストが緑のまま、構造を整える。**赤の状態でリファクタしないことが鉄則**。

### 6. 「ちょっと深掘り」セクション（任意）

「本家の React ではどうしているか」「なぜこの設計を選んだか」など、本筋から外れる解説を入れる場合は折りたたみセクションで。

```mdx
<details>
<summary>本家 React の create-root.ts と比較する</summary>

本家では...
</details>
```

### 7. 「コミットして次へ」セクション

章末でコミットを切る運用を促す。GitHub の対応コミットへリンクできるとなお良い。

```mdx
## コミットして次へ

\`\`\`bash
git add .
git commit -m "feat: createRoot API の最小骨格を実装"
\`\`\`

→ [次の章: パッケージ設計](./015-package-architecture)
```

---

## サイズの目安

| サイズ | ページ数 (A4 換算) | 想定執筆時間 | 適した章の性質 |
|---|---|---|---|
| **S** | 3〜5 | 2〜3 時間 | 概念解説のみ、または単純な API |
| **M** | 5〜10 | 4〜6 時間 | 複数のコード片 + 概念解説 |
| **L** | 10〜20 | 8〜12 時間 | 章全体で大きな機能を作る |

[Plans/04-content-plan.md](./Plans/04-content-plan.md) で各章のサイズが指定されています。

---

## トーン・命名

- **章タイトルは動詞中心**: 「〜を実装する」「〜できるようにしよう」（chibivue と同じ）
- **「である調」**: 「〜です」「〜ます」を基本とし、コード解説のみ「である調」も可
- **読者への呼びかけ**: 「あなた」を使う（「読者」「諸君」は使わない）
- **絵文字**: 控えめに。重要な警告や成功通知のみ（💡⚠️✅）

---

## チェックリスト（章を書き終えたら）

- [ ] frontmatter の `title` と `description` を記入した
- [ ] 「この章のゴール」を冒頭に書いた
- [ ] テスト → 実装 → リファクタの順で書いた
- [ ] 章末で次の章へのリンクを貼った
- [ ] `_meta.js` に新しい章を追加した
- [ ] dev server で表示を確認した（リンクが切れていないか、コードハイライトが効いているか）
- [ ] チェックリスト項目自体も、必要に応じて読者向けに章末で再掲した
