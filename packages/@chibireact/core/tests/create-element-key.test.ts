import { describe, it, expect } from 'vitest'
import { createElement } from '../src/create-element'

describe('createElement key', () => {
  it('key 指定がない場合は key は null', () => {
    const el = createElement('li', null)
    expect(el.key).toBe(null)
  })

  it('props.key がトップレベル element.key に昇格します', () => {
    const el = createElement('li', { key: 'item-1' }, 'A')
    expect(el.key).toBe('item-1')
  })

  it('key は props からは除去されます', () => {
    const el = createElement('li', { key: 'item-1', id: 'a' }, 'A')
    expect(el.props).toEqual({ id: 'a' })
    expect('key' in el.props).toBe(false)
  })

  it('数値の key も保持できます', () => {
    const el = createElement('li', { key: 42 })
    expect(el.key).toBe(42)
  })

  it('リスト内の各要素に key を付けられます', () => {
    const items = ['a', 'b', 'c']
    const elements = items.map((label, i) =>
      createElement('li', { key: i }, label),
    )
    expect(elements.map((e) => e.key)).toEqual([0, 1, 2])
  })
})
