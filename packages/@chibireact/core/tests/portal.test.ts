import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import { createPortal } from '../src/portal'
import { _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

describe('createPortal', () => {
  let mainContainer: HTMLElement
  let portalContainer: HTMLElement

  beforeEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
    mainContainer = document.createElement('div')
    portalContainer = document.createElement('div')
  })

  afterEach(() => {
    _resetSchedulerForTesting()
    _clearHooksForTesting()
  })

  it('children が portal の container に描画される', () => {
    const App = () =>
      createElement(
        'div',
        null,
        createElement('span', null, 'normal'),
        createPortal(
          createElement('span', null, 'in-portal'),
          portalContainer,
        ),
      )

    const root = createRoot(mainContainer)
    root.render(createElement(App, null))

    const main = mainContainer.firstChild as HTMLElement
    // 通常 child は main 内
    expect(main.children[0].textContent).toBe('normal')
    // portal child は portalContainer 内
    expect(portalContainer.firstChild?.textContent).toBe('in-portal')
    // 通常側に portal child は無い
    expect(main.children.length).toBe(1)
  })

  it('複数の portal を別々の container に向けられる', () => {
    const c1 = document.createElement('div')
    const c2 = document.createElement('div')

    const App = () =>
      createElement(
        'div',
        null,
        createPortal(createElement('span', null, 'first'), c1),
        createPortal(createElement('span', null, 'second'), c2),
      )

    const root = createRoot(mainContainer)
    root.render(createElement(App, null))

    expect(c1.firstChild?.textContent).toBe('first')
    expect(c2.firstChild?.textContent).toBe('second')
  })

  it('portal の中に複数の DOM 要素を描画できる', () => {
    const App = () =>
      createElement(
        'div',
        null,
        createPortal(
          createElement(
            'div',
            null,
            createElement('h1', null, 'title'),
            createElement('p', null, 'body'),
          ),
          portalContainer,
        ),
      )

    const root = createRoot(mainContainer)
    root.render(createElement(App, null))

    const wrapper = portalContainer.firstChild as HTMLElement
    expect(wrapper.nodeName).toBe('DIV')
    expect(wrapper.children.length).toBe(2)
    expect(wrapper.children[0].textContent).toBe('title')
    expect(wrapper.children[1].textContent).toBe('body')
  })

  it('portal の中身を再 render すると container 内で更新される', () => {
    type Props = { value: string }
    const App = (props: Props) =>
      createPortal(
        createElement('span', null, props.value),
        portalContainer,
      )

    const root = createRoot(mainContainer)
    root.render(createElement(App as unknown as Function, { value: 'a' }))
    expect(portalContainer.firstChild?.textContent).toBe('a')

    root.render(createElement(App as unknown as Function, { value: 'b' }))
    expect(portalContainer.firstChild?.textContent).toBe('b')
  })
})
