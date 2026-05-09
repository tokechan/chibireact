import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot } from '../src/create-root'
import { createElement } from '../src/create-element'
import {
  renderToRSCPayload,
  payloadToElement,
  registerClientComponent,
  markAsClientComponent,
  _clearClientRegistry,
} from '../src/rsc'
import { useState, _clearHooksForTesting } from '../src/hooks-state'
import { _resetSchedulerForTesting } from '../src/work-loop'

const flushMicrotasks = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve))

describe('renderToRSCPayload (server side)', () => {
  beforeEach(() => {
    _clearClientRegistry()
  })

  it('host element をそのまま payload に変換', async () => {
    const el = createElement('h1', { className: 'title' }, 'Hello')
    const payload = await renderToRSCPayload(el)

    expect(payload).toEqual({
      $$typeof: 'host',
      type: 'h1',
      props: { className: 'title' },
      children: ['Hello'],
    })
  })

  it('Server Component を呼び出して payload 化', async () => {
    const Greeting = (props: { name: string }) =>
      createElement('span', null, `hello, ${props.name}`)

    const el = createElement(Greeting as unknown as Function, { name: 'world' })
    const payload = await renderToRSCPayload(el)

    expect(payload).toEqual({
      $$typeof: 'host',
      type: 'span',
      props: {},
      children: ['hello, world'],
    })
  })

  it('async Server Component (await できる)', async () => {
    const fakeFetch = async (id: number) => ({ name: `User ${id}` })

    const UserCard = async (props: { id: number }) => {
      const user = await fakeFetch(props.id)
      return createElement('div', null, user.name)
    }

    const el = createElement(UserCard as unknown as Function, { id: 42 })
    const payload = await renderToRSCPayload(el)

    expect(payload).toMatchObject({
      $$typeof: 'host',
      type: 'div',
      children: ['User 42'],
    })
  })

  it('Client Reference は ref として serialize', async () => {
    const Counter = markAsClientComponent('Counter', () =>
      createElement('button', null, 'click'),
    )

    const el = createElement(Counter as unknown as Function, { initial: 0 })
    const payload = await renderToRSCPayload(el)

    expect(payload).toEqual({
      $$typeof: 'client-ref',
      ref: 'Counter',
      props: { initial: 0 },
      children: [],
    })
  })

  it('関数 props はシリアライズ時に除去される (function は JSON 化できない)', async () => {
    const handler = () => undefined
    const el = createElement('button', { onClick: handler, id: 'btn' }, 'click')
    const payload = await renderToRSCPayload(el)

    expect((payload as { props: Record<string, unknown> }).props).toEqual({
      id: 'btn',
    })
    // onClick は payload に入らない
  })

  it('Server Component の中に Client Component が混在しても OK', async () => {
    const ClientButton = markAsClientComponent('ClientButton', () =>
      createElement('button', null, 'click me'),
    )

    const Page = () =>
      createElement(
        'main',
        null,
        createElement('h1', null, 'Welcome'),
        createElement(ClientButton as unknown as Function, null),
      )

    const payload = await renderToRSCPayload(createElement(Page, null))
    // main > h1 + Client Reference
    expect(payload).toMatchObject({
      $$typeof: 'host',
      type: 'main',
      children: [
        { $$typeof: 'host', type: 'h1', children: ['Welcome'] },
        { $$typeof: 'client-ref', ref: 'ClientButton' },
      ],
    })
  })

  it('payload は JSON.stringify でシリアライズ可能', async () => {
    const Page = () =>
      createElement(
        'div',
        null,
        createElement('h1', null, 'Title'),
        createElement('p', null, 'Body'),
      )

    const payload = await renderToRSCPayload(createElement(Page, null))
    const json = JSON.stringify(payload)
    const restored = JSON.parse(json)
    expect(restored).toEqual(payload)
  })
})

describe('payloadToElement (client side)', () => {
  let container: HTMLElement

  beforeEach(() => {
    _clearClientRegistry()
    _clearHooksForTesting()
    _resetSchedulerForTesting()
    container = document.createElement('div')
  })

  afterEach(() => {
    _clearClientRegistry()
    _clearHooksForTesting()
    _resetSchedulerForTesting()
  })

  it('payload から element に戻して描画できる', async () => {
    // Server side
    const Page = () =>
      createElement(
        'div',
        null,
        createElement('h1', null, 'Hello'),
      )
    const payload = await renderToRSCPayload(createElement(Page, null))

    // Client side: payload → element → render
    const restored = payloadToElement(payload)
    const root = createRoot(container)
    root.render(restored as ReturnType<typeof createElement>)

    const div = container.firstChild as HTMLElement
    expect(div.nodeName).toBe('DIV')
    expect(div.firstChild?.textContent).toBe('Hello')
  })

  it('Client Reference を registry から解決して描画', async () => {
    // Client component
    const Counter = markAsClientComponent('Counter', function Counter() {
      const [count, setCount] = useState(0)
      return createElement(
        'button',
        { onClick: () => setCount(count + 1) },
        `${count}`,
      )
    })
    registerClientComponent('Counter', Counter)

    // Server: render Counter as Client Reference
    const Page = () => createElement(Counter as unknown as Function, null)
    const payload = await renderToRSCPayload(createElement(Page, null))

    // Client: restore + render
    const restored = payloadToElement(payload)
    const root = createRoot(container)
    root.render(restored as ReturnType<typeof createElement>)

    const button = container.firstChild as HTMLButtonElement
    expect(button.nodeName).toBe('BUTTON')
    expect(button.textContent).toBe('0')

    // Client component なので state を持つ
    button.click()
    await flushMicrotasks()
    expect((container.firstChild as HTMLElement).textContent).toBe('1')
  })

  it('Client Component が登録されていなければ throw', () => {
    const payload = {
      $$typeof: 'client-ref' as const,
      ref: 'NotRegistered',
      props: {},
      children: [],
    }
    expect(() => payloadToElement(payload)).toThrow(/not registered/)
  })
})
