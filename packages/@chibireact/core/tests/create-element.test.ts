import { describe, it, expect } from 'vitest'
import { createElement } from '../src/create-element'

describe('createElement', () => {
  it('type と props を持つ element オブジェクトを返します', () => {
    const element = createElement('h1', { className: 'title' })

    expect(element.type).toBe('h1')
    expect(element.props).toEqual({ className: 'title' })
  })

  it('children を渡さないと空配列になります', () => {
    const element = createElement('div', null)

    expect(element.children).toEqual([])
  })

  it('props が null/undefined のときは空オブジェクトを使います', () => {
    expect(createElement('div', null).props).toEqual({})
    expect(createElement('div', undefined).props).toEqual({})
  })

  it('可変長の children を配列にまとめます', () => {
    const element = createElement('p', null, 'Hello', ' ', 'World')

    expect(element.children).toEqual(['Hello', ' ', 'World'])
    expect(element.children).toHaveLength(3)
  })

  it('入れ子の element を children に保持します', () => {
    const child = createElement('span', null, 'Inner')
    const parent = createElement('div', null, child)

    expect(parent.children).toEqual([child])
    expect(parent.children[0]).toBe(child)
  })

  it('数値の child もそのまま保持します', () => {
    const element = createElement('p', null, 'Count: ', 42)

    expect(element.children).toEqual(['Count: ', 42])
  })

  it('type が関数（コンポーネント）の場合もそのまま保持します', () => {
    const Component = (props: { id: string }) =>
      createElement('div', { id: props.id })
    const element = createElement(Component, { id: 'app' })

    expect(element.type).toBe(Component)
    expect(element.props).toEqual({ id: 'app' })
  })

  it('呼び出し元の props オブジェクトを変更してもデフォルト処理に影響しません', () => {
    // 防御的: createElement(div, null) 後に元の参照に変更を加えても、
    // 過去に作った element の props が壊れないことを確認します。
    const element = createElement('div', null)
    expect(element.props).toEqual({})

    // ※ 実装が同じ空オブジェクトを使い回すと壊れる場合があるテスト。
    //    最小実装では問題になりませんが、将来のリファクタの保険として置きます。
    const elementB = createElement('div', null)
    expect(elementB.props).toEqual({})
    elementB.props.test = 'mutated'
    expect(element.props).toEqual({}) // 別のオブジェクトであるべき
  })
})
