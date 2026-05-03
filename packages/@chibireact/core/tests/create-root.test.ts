import { describe, it, expect } from 'vitest'
import { createRoot } from '../src/create-root'

describe('createRoot', () => {
  it('container を渡すと render メソッドを持つ root オブジェクトを返します', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    expect(root).toHaveProperty('render')
    expect(typeof root.render).toBe('function')
  })

  it('render() を呼び出してもエラーにならない（最小骨格）', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    expect(() => {
      root.render({ type: 'h1', props: {}, children: ['Hello'] })
    }).not.toThrow()
  })

  it('container が異なれば独立した root を返します', () => {
    const containerA = document.createElement('div')
    const containerB = document.createElement('div')

    const rootA = createRoot(containerA)
    const rootB = createRoot(containerB)

    expect(rootA).not.toBe(rootB)
  })
})
