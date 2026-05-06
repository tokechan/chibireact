import { createElement } from './create-element'
import type { ChibireactElement, ChibireactNode } from './types'

/**
 * tagged template literal で JSX 風に書ける関数 (Part 4.4)。
 *
 * Babel/SWC のような **コンパイル時** 変換の代わりに、**ランタイム** で template
 * literal を parse して `createElement` を呼ぶ最小実装。`htm` ライブラリの
 * 教育用ミニ版に相当する。
 *
 * @example
 *   h`<div className="box">Hello, ${name}!</div>`
 *   // → createElement('div', { className: 'box' }, 'Hello, ', name, '!')
 *
 *   h`<${Counter} initial=${0} />`
 *   // → createElement(Counter, { initial: 0 })
 *
 * 対応する記法:
 *   - 通常タグ: <div>text</div>
 *   - 属性 (文字列): <div className="x">
 *   - 属性 (補間): <input value=${val} />
 *   - 子の補間: <p>${child}</p>
 *   - コンポーネント補間: <${Comp} prop=${x} />
 *   - 自閉じ: <br />
 *   - ネスト
 *
 * 対応しない記法 (本書スコープ外):
 *   - スプレッド: <input ${...props} />
 *   - boolean shorthand: <input disabled />  (= disabled=${true} と書く)
 *   - Fragment <>...</>
 */

const PLACEHOLDER = '' // 値補間のための内部マーカー

export function h(
  strings: TemplateStringsArray,
  ...values: unknown[]
): ChibireactElement {
  // 1. strings と values を 1 本のソース文字列にまとめる。値はマーカーで置換し、
  //    後で values 配列を引いて復元する。
  let source = ''
  for (let i = 0; i < strings.length; i++) {
    source += strings[i]
    if (i < values.length) {
      source += `${PLACEHOLDER}${i}${PLACEHOLDER}`
    }
  }

  const { node, end } = parseElement(source, 0, values)
  // 余ったテキストはトップレベルでは無視 (1 root 前提)
  if (end < source.trimEnd().length) {
    // pass
  }
  return node
}

/**
 * 1 つの要素を parse して、{node, end} を返す。
 * `start` 位置が `<` であることを期待する (前の whitespace は呼び出し側で skip)。
 */
function parseElement(
  src: string,
  start: number,
  values: unknown[],
): { node: ChibireactElement; end: number } {
  let pos = skipWs(src, start)
  if (src[pos] !== '<') {
    throw new Error(`Expected '<' at position ${pos}, got '${src[pos]}'`)
  }
  pos++

  // タグ名読み取り (識別子文字 + PLACEHOLDER)
  const { name, end: nameEnd } = readTagName(src, pos)
  pos = nameEnd

  // type: コンポーネント or HTML タグ
  const type = resolveType(name, values)

  // 属性 (props) 読み取り
  const props: Record<string, unknown> = {}
  while (pos < src.length) {
    pos = skipWs(src, pos)
    const c = src[pos]
    if (c === '>' || c === '/') break
    const { key, value, end: attrEnd } = readAttribute(src, pos, values)
    pos = attrEnd
    props[key] = value
  }

  // 自閉じ
  if (src[pos] === '/') {
    pos++
    pos = skipWs(src, pos)
    if (src[pos] !== '>') {
      throw new Error(`Expected '>' for self-close at position ${pos}`)
    }
    return { node: createElement(type, props), end: pos + 1 }
  }

  if (src[pos] !== '>') {
    throw new Error(`Expected '>' at position ${pos}`)
  }
  pos++ // 開きタグの '>' を消費

  // 子要素 / テキスト読み取り
  const children: ChibireactNode[] = []
  while (pos < src.length) {
    if (src[pos] === '<' && src[pos + 1] === '/') {
      // 閉じタグ
      pos += 2
      const { end: closeEnd } = readTagName(src, pos)
      // 閉じタグ名の検証は省略 (最小実装)
      pos = closeEnd
      pos = skipWs(src, pos)
      if (src[pos] !== '>') {
        throw new Error(`Expected '>' for closing tag at position ${pos}`)
      }
      pos++
      break
    }
    if (src[pos] === '<') {
      // 入れ子要素
      const result = parseElement(src, pos, values)
      children.push(result.node)
      pos = result.end
      continue
    }
    // テキスト or 補間: 次の '<' まで読む
    let textEnd = pos
    while (textEnd < src.length && src[textEnd] !== '<') {
      textEnd++
    }
    const text = src.slice(pos, textEnd)
    appendTextWithInterpolation(children, text, values)
    pos = textEnd
  }

  return { node: createElement(type, props, ...children), end: pos }
}

/** 属性 1 つ ( name="val" / name=${val} ) を読む。 */
function readAttribute(
  src: string,
  start: number,
  values: unknown[],
): { key: string; value: unknown; end: number } {
  // key 読み取り (英数字とハイフン)
  let p = start
  let nameStart = p
  while (p < src.length && /[A-Za-z0-9_-]/.test(src[p])) p++
  const key = src.slice(nameStart, p)
  if (key.length === 0) {
    throw new Error(`Expected attribute name at position ${start}`)
  }
  if (src[p] !== '=') {
    // 値なし属性 (= boolean shorthand) は本書スコープ外。とりあえず true を入れる。
    return { key, value: true, end: p }
  }
  p++ // '=' を消費
  // 値: "string" or ${value} or ${PLACEHOLDER}n${PLACEHOLDER}
  if (src[p] === '"') {
    p++
    const valStart = p
    while (p < src.length && src[p] !== '"') p++
    const raw = src.slice(valStart, p)
    p++ // closing '"' を消費
    // 文字列内に PLACEHOLDER があれば値に置換
    return { key, value: resolveInterpolations(raw, values), end: p }
  }
  if (src[p] === PLACEHOLDER) {
    // 直接補間: <div value=${x} />
    const valStart = p
    p++
    while (p < src.length && src[p] !== PLACEHOLDER) p++
    p++ // closing PLACEHOLDER
    const indexStr = src.slice(valStart + 1, p - 1)
    return { key, value: values[parseInt(indexStr, 10)], end: p }
  }
  throw new Error(`Expected '"' or interpolation for attribute value at position ${p}`)
}

/** タグ名を読む。コンポーネント補間 (<${Comp}>) にも対応。 */
function readTagName(
  src: string,
  start: number,
): { name: string; end: number } {
  let p = start
  // 補間で始まる場合
  if (src[p] === PLACEHOLDER) {
    const valStart = p
    p++
    while (p < src.length && src[p] !== PLACEHOLDER) p++
    p++ // closing
    return { name: src.slice(valStart, p), end: p }
  }
  // 通常タグ名 (英数字 + ハイフン + ドット)
  while (p < src.length && /[A-Za-z0-9_.-]/.test(src[p])) p++
  return { name: src.slice(start, p), end: p }
}

/** type を関数 / 文字列のいずれかに解決。 */
function resolveType(name: string, values: unknown[]): string | Function {
  if (name.startsWith(PLACEHOLDER) && name.endsWith(PLACEHOLDER)) {
    const indexStr = name.slice(1, -1)
    const index = parseInt(indexStr, 10)
    return values[index] as string | Function
  }
  return name
}

/** 文字列内の PLACEHOLDER を values から復元してくっつける。 */
function resolveInterpolations(raw: string, values: unknown[]): unknown {
  // 補間が 1 つだけで前後に文字なし → 値そのまま (型を保つ)
  const trimmed = raw
  if (
    trimmed.startsWith(PLACEHOLDER) &&
    trimmed.endsWith(PLACEHOLDER) &&
    countOccurrences(trimmed, PLACEHOLDER) === 2
  ) {
    const indexStr = trimmed.slice(1, -1)
    return values[parseInt(indexStr, 10)]
  }
  // それ以外: 文字列として concat
  let result = ''
  let i = 0
  while (i < raw.length) {
    if (raw[i] === PLACEHOLDER) {
      const end = raw.indexOf(PLACEHOLDER, i + 1)
      const indexStr = raw.slice(i + 1, end)
      result += String(values[parseInt(indexStr, 10)])
      i = end + 1
    } else {
      result += raw[i]
      i++
    }
  }
  return result
}

function appendTextWithInterpolation(
  children: ChibireactNode[],
  text: string,
  values: unknown[],
): void {
  let i = 0
  let buffer = ''
  while (i < text.length) {
    if (text[i] === PLACEHOLDER) {
      // バッファを flush
      if (buffer.length > 0) {
        // 末尾の whitespace のみは無視しすぎないよう、そのまま追加
        if (buffer.trim().length > 0) {
          children.push(buffer)
        } else {
          // 全部 whitespace のみ → 改行込みのインデント。スキップ
        }
        buffer = ''
      }
      const end = text.indexOf(PLACEHOLDER, i + 1)
      const indexStr = text.slice(i + 1, end)
      children.push(values[parseInt(indexStr, 10)] as ChibireactNode)
      i = end + 1
    } else {
      buffer += text[i]
      i++
    }
  }
  if (buffer.length > 0 && buffer.trim().length > 0) {
    children.push(buffer)
  }
}

function skipWs(src: string, start: number): number {
  let p = start
  while (p < src.length && /\s/.test(src[p])) p++
  return p
}

function countOccurrences(s: string, c: string): number {
  let n = 0
  for (const ch of s) if (ch === c) n++
  return n
}
