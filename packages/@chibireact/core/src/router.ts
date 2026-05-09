import { useEffect, useState } from './hooks-state'
import { createElement } from './create-element'
import type { ChibireactElement, ChibireactNode } from './types'

/**
 * 最小ハッシュルーター (Part 6.1)。
 *
 * ハッシュベース (#/foo) を採用する理由:
 *   - ブラウザの戻る/進むが自動で動く
 *   - サーバ側の設定が一切要らない (静的ホスティングで OK)
 *   - SPA ルーティングの本質 (URL → component) を最小コードで示せる
 *
 * 提供する API:
 *   - useHashLocation(): 現在のハッシュパス + 遷移関数を返す
 *   - <Link to="..."> : ハッシュ更新リンク (a タグでアクセシブル)
 *   - <Route path="..." component={...} /> : path に合えば描画
 *
 * 制限 (本書スコープ外):
 *   - パスパラメータ (/users/:id)
 *   - ネストルート
 *   - クエリパラメータ抽出
 *   - History API ベースルーティング
 */

/** 現在のハッシュからパス部分 (#/foo → '/foo') を取り出す。 */
function getHashPath(): string {
  if (typeof window === 'undefined') return '/'
  const hash = window.location.hash
  if (!hash || hash === '#') return '/'
  // '#/foo' → '/foo'
  return hash.startsWith('#') ? hash.slice(1) || '/' : hash
}

/**
 * 現在のハッシュパスとナビゲーション関数を返す hook。
 * `hashchange` イベントを購読して再 render する。
 *
 * @example
 *   const [path, navigate] = useHashLocation()
 *   navigate('/users')  // → location.hash = '#/users'
 */
export function useHashLocation(): [string, (to: string) => void] {
  const [path, setPath] = useState<string>(getHashPath())

  useEffect(() => {
    const listener = (): void => {
      setPath(getHashPath())
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', listener)
      return () => window.removeEventListener('hashchange', listener)
    }
    return undefined
  }, [])

  const navigate = (to: string): void => {
    if (typeof window !== 'undefined') {
      window.location.hash = to.startsWith('/') ? to : `/${to}`
    }
  }

  return [path, navigate]
}

/**
 * a タグの薄いラッパで、href を `#/...` に変換しつつクリックで navigate する。
 * 中クリック (新タブ) や Cmd+クリックは通常の挙動に任せる。
 *
 * @example
 *   <Link to="/users">Users</Link>
 *   // → <a href="#/users">Users</a>
 */
export function Link(props: {
  to: string
  children?: ChibireactNode | ChibireactNode[]
  [key: string]: unknown
}): ChibireactElement {
  const { to, children, onClick, ...rest } = props
  const handleClick = (e: MouseEvent): void => {
    // 修飾キー付きクリックは default に任せる
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    if (typeof onClick === 'function') {
      ;(onClick as (e: MouseEvent) => void)(e)
    }
    // hash の場合は <a href="#..."> がデフォルトでハッシュ書き換えるので、
    // ここでは明示的な navigate は不要 (ブラウザ任せ)。preventDefault もしない。
  }
  const href = `#${to.startsWith('/') ? to : `/${to}`}`
  return createElement(
    'a',
    { href, onClick: handleClick, ...rest },
    children as never,
  )
}

/**
 * パスがマッチしたら component を、そうでなければ null を返す。
 *
 * @example
 *   <Route path="/users" component={UsersPage} />
 *
 * 制限: 完全一致のみ。'/users/:id' のようなパターンは未対応。
 */
export function Route(props: {
  path: string
  component: () => ChibireactNode
}): ChibireactNode {
  const [current] = useHashLocation()
  if (current !== props.path) return null
  return props.component() as ChibireactNode
}

/**
 * 複数 Route から最初にマッチした 1 つだけ描画する。
 *
 * @example
 *   <Switch>
 *     <Route path="/" component={Home} />
 *     <Route path="/users" component={Users} />
 *     <Route path="*" component={NotFound} />  // 末尾でフォールバック
 *   </Switch>
 */
export function Switch(props: {
  children?: ChibireactNode | ChibireactNode[]
}): ChibireactNode {
  const [current] = useHashLocation()
  const list = Array.isArray(props.children) ? props.children : [props.children]
  for (const child of list) {
    if (
      child !== null &&
      child !== undefined &&
      typeof child === 'object' &&
      !Array.isArray(child) &&
      'type' in child &&
      (child as ChibireactElement).type === Route
    ) {
      const path = (child as ChibireactElement).props.path as string
      if (path === '*' || path === current) {
        return ((child as ChibireactElement).props.component as () => ChibireactNode)()
      }
    }
  }
  return null
}
