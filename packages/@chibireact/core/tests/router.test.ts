import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { Link, Route, Switch, useHashLocation } from '../src/router'
import { _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('useHashLocation / Link / Route', () => {
  let container: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
    container = document.createElement('div')
    document.body.appendChild(container)
    // ハッシュをリセット
    window.location.hash = ''
  })

  afterEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
    container.remove()
    window.location.hash = ''
  })

  it('Route はパスがマッチしたときだけ描画する', async () => {
    const Home = () => createElement('span', null, 'home')
    const Users = () => createElement('span', null, 'users')

    const App = () =>
      createElement(
        'div',
        null,
        createElement(Route as unknown as Function, { path: '/', component: Home }),
        createElement(Route as unknown as Function, { path: '/users', component: Users }),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    // 初期 (#) → '/' 扱い → home が表示
    const div = container.firstChild as HTMLElement
    expect(div.textContent).toBe('home')

    // ハッシュを変更
    window.location.hash = '#/users'
    // hashchange イベントが発火するまで待つ
    await new Promise<void>((r) => setTimeout(r, 10))
    await flushMicrotasks()

    expect((container.firstChild as HTMLElement).textContent).toBe('users')
  })

  it('Switch は最初にマッチした Route だけを描画する', async () => {
    const Home = () => createElement('span', null, 'home')
    const NotFound = () => createElement('span', null, 'notfound')

    const App = () =>
      createElement(
        Switch as unknown as Function,
        null,
        createElement(Route as unknown as Function, { path: '/', component: Home }),
        createElement(Route as unknown as Function, { path: '*', component: NotFound }),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.textContent).toBe('home')

    window.location.hash = '#/unknown'
    await new Promise<void>((r) => setTimeout(r, 10))
    await flushMicrotasks()

    expect(container.textContent).toBe('notfound')
  })

  it('Link は href="#/..." を生成する', () => {
    const App = () =>
      createElement(
        Link as unknown as Function,
        { to: '/users' },
        'Users link',
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    const a = container.firstChild as HTMLAnchorElement
    expect(a.nodeName).toBe('A')
    expect(a.getAttribute('href')).toBe('#/users')
    expect(a.textContent).toBe('Users link')
  })

  it('Link をクリックすると hash が更新され Route が切り替わる', async () => {
    const Home = () => createElement('span', { id: 'home-span' }, 'home')
    const About = () => createElement('span', { id: 'about-span' }, 'about')

    const App = () =>
      createElement(
        'div',
        null,
        createElement(Link as unknown as Function, { to: '/about' }, 'go-about'),
        createElement(Switch as unknown as Function, null,
          createElement(Route as unknown as Function, { path: '/', component: Home }),
          createElement(Route as unknown as Function, { path: '/about', component: About }),
        ),
      )

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.querySelector('#home-span')?.textContent).toBe('home')

    // Link をクリック (jsdom では a タグのデフォルト挙動で hash が変わる)
    const link = container.querySelector('a') as HTMLAnchorElement
    link.click()

    await new Promise<void>((r) => setTimeout(r, 10))
    await flushMicrotasks()

    expect(container.querySelector('#about-span')?.textContent).toBe('about')
  })

  it('useHashLocation の navigate でプログラム的に遷移できる', async () => {
    let navigateRef: ((to: string) => void) | null = null

    const App = () => {
      const [path, navigate] = useHashLocation()
      navigateRef = navigate
      return createElement('span', null, path)
    }

    const root = createRoot(container)
    root.render(createElement(App, null))

    expect(container.firstChild?.textContent).toBe('/')

    navigateRef!('/dashboard')
    await new Promise<void>((r) => setTimeout(r, 10))
    await flushMicrotasks()

    expect(container.firstChild?.textContent).toBe('/dashboard')
  })
})
