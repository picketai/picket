import type { Tone } from '../../shared/theme'

export type SpanStyle = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  dim?: boolean
  tone?: Tone
}

export type Span = { text: string; style?: SpanStyle; href?: string }

export type Row =
  | { kind: 'line'; spans: Span[]; heading?: number; wide?: WideTable }
  | { kind: 'code-head'; block: number; lang: string }
  | { kind: 'code'; block: number; text: string; lang: string }
  | { kind: 'code-foot'; block: number }

export type Heading = { level: number; text: string; row: number; section: string }

export type WideTable = { table: number; width: number; isTop: boolean }

export type Layout = { rows: Row[]; code: string[]; headings: Heading[] }

const FENCE = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const QUOTE = /^\s{0,3}>\s?(.*)$/
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
const MAX_CELL = 48
const INLINE =
  /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\s][^*]*)\*|(?<![\w])_([^_\s][^_]*)_(?![\w])|\[([^\]]*)\]\(([^)\s]+)\)|<(https?:\/\/[^>\s]+)>/g

export function width(text: string): number {
  return [...text].length
}

function cut(text: string, room: number): string {
  const chars = [...text]
  if (chars.length <= room) return text
  return room <= 1 ? chars.slice(0, room).join('') : `${chars.slice(0, room - 1).join('')}…`
}

export function inline(text: string, base: SpanStyle = {}): Span[] {
  const spans: Span[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) spans.push({ text: text.slice(last, match.index), style: base })
    const [, code, bold, bold2, strike, italic, italic2, label, target, auto] = match
    if (code !== undefined) spans.push({ text: code, style: { ...base, tone: 'code' } })
    else if (bold !== undefined || bold2 !== undefined) spans.push(...inline(bold ?? bold2 ?? '', { ...base, bold: true }))
    else if (strike !== undefined) spans.push(...inline(strike, { ...base, strike: true }))
    else if (italic !== undefined || italic2 !== undefined) spans.push(...inline(italic ?? italic2 ?? '', { ...base, italic: true }))
    else if (target !== undefined) spans.push({ text: label || target, style: { ...base, tone: 'link', underline: true }, href: target })
    else if (auto !== undefined) spans.push({ text: auto, style: { ...base, tone: 'link', underline: true }, href: auto })
    last = match.index + match[0].length
  }
  if (last < text.length) spans.push({ text: text.slice(last), style: base })
  return spans.filter(span => span.text.length > 0)
}

function plain(text: string): string {
  return inline(text)
    .map(span => span.text)
    .join('')
}

type Piece = { text: string; style?: SpanStyle; href?: string; isSpace: boolean }

type Word = { parts: Piece[]; isSpace: boolean; size: number }

function words(spans: Span[]): Word[] {
  const out: Word[] = []
  for (const span of spans) {
    for (const part of span.text.split(/(\s+)/)) {
      if (part === '') continue
      const isSpace = /^\s/.test(part)
      const piece: Piece = { text: isSpace ? ' ' : part, style: span.style, href: span.href, isSpace }
      const last = out[out.length - 1]
      if (!isSpace && last !== undefined && !last.isSpace) {
        last.parts.push(piece)
        last.size += width(piece.text)
      } else out.push({ parts: [piece], isSpace, size: width(piece.text) })
    }
  }
  return out
}

function joinSpans(row: Piece[]): Span[] {
  const spans: Span[] = []
  for (const piece of row) {
    const previous = spans[spans.length - 1]
    if (previous !== undefined && previous.style === piece.style && previous.href === piece.href) previous.text += piece.text
    else spans.push({ text: piece.text, style: piece.style, href: piece.href })
  }
  return spans
}

export function wrap(spans: Span[], room: number, first: Span[] = [], rest: Span[] = first): Span[][] {
  const lines: Span[][] = []
  let prefix = first
  let line: Piece[] = []
  let used = 0
  const limit = () => Math.max(1, room - prefix.reduce((sum, span) => sum + width(span.text), 0))
  const flush = () => {
    while (line.length > 0 && line[line.length - 1]?.isSpace) line.pop()
    lines.push([...prefix, ...joinSpans(line)])
    prefix = rest
    line = []
    used = 0
  }

  const add = (piece: Piece, text: string) => {
    line.push({ ...piece, text })
    used += width(text)
  }

  const addAll = (word: Word) => {
    for (const piece of word.parts) add(piece, piece.text)
  }

  for (const word of words(spans)) {
    if (word.isSpace) {
      if (used === 0) continue
      if (used + word.size > limit()) flush()
      else addAll(word)
      continue
    }
    if (used + word.size <= limit()) {
      addAll(word)
      continue
    }
    if (used > 0 && word.size <= limit()) {
      flush()
      addAll(word)
      continue
    }
    for (const piece of word.parts) {
      let chars = [...piece.text]
      while (chars.length > 0) {
        const free = limit() - used
        if (free <= 0) {
          flush()
          continue
        }
        add(piece, chars.slice(0, free).join(''))
        chars = chars.slice(free)
      }
    }
  }
  if (line.length > 0 || lines.length === 0) flush()
  return lines
}

function cells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'))
}

function tableRows(header: string[], body: string[][], room: number, table: number): Row[] {
  const count = Math.max(header.length, ...body.map(row => row.length))
  const all = [header, ...body].map(row => Array.from({ length: count }, (_, i) => plain(row[i] ?? '')))
  const widths = Array.from({ length: count }, (_, i) => Math.min(MAX_CELL, Math.max(3, ...all.map(row => width(row[i] ?? '')))))
  const total = widths.reduce((a, b) => a + b, 0) + count * 3 + 1
  const wide = total > room ? { table, width: total } : undefined
  const border = (left: string, mid: string, right: string, isTop = false): Row => ({
    kind: 'line',
    spans: [{ text: left + widths.map(w => '─'.repeat(w + 2)).join(mid) + right, style: { tone: 'rule' } }],
    ...(wide !== undefined && { wide: { ...wide, isTop } }),
  })
  const line = (row: string[], isHeader: boolean): Row => {
    const spans: Span[] = [{ text: '│', style: { tone: 'rule' } }]
    row.forEach((cell, i) => {
      const w = widths[i] ?? 3
      const text = cut(cell, w)
      spans.push({ text: ` ${text}${' '.repeat(Math.max(0, w - width(text)))} `, style: isHeader ? { bold: true } : {} })
      spans.push({ text: '│', style: { tone: 'rule' } })
    })
    return { kind: 'line', spans, ...(wide !== undefined && { wide: { ...wide, isTop: false } }) }
  }
  const [head, ...rest] = all
  return [
    border('┌', '┬', '┐', true),
    line(head ?? [], true),
    border('├', '┼', '┤'),
    ...rest.map(row => line(row, false)),
    border('└', '┴', '┘'),
  ]
}

export function sliceSpans(spans: readonly Span[], from: number, count: number): Span[] {
  const out: Span[] = []
  let at = 0
  for (const span of spans) {
    const chars = [...span.text]
    const start = Math.max(0, from - at)
    const end = Math.min(chars.length, from + count - at)
    if (end > start) out.push({ ...span, text: chars.slice(start, end).join('') })
    at += chars.length
  }
  return out
}

function frontMatter(lines: readonly string[]): { pairs: string[][]; rest: string[] } {
  const pairs: string[][] = []
  const rest: string[] = []
  let inBlock = false
  for (const line of lines) {
    const top = /^([A-Za-z_][\w.-]*):\s*(.*)$/.exec(line)
    if (top !== null) {
      const value = (top[2] ?? '').trim()
      inBlock = value === '' || value === '|' || value === '>'
      if (inBlock) rest.push(line)
      else pairs.push([top[1] ?? '', value.replace(/^(["'])(.*)\1$/, '$2')])
      continue
    }
    if (inBlock || rest.length > 0) rest.push(line)
  }
  return { pairs, rest }
}

function lines(spans: Span[][]): Row[] {
  return spans.map(row => ({ kind: 'line', spans: row }))
}

export function layout(text: string, room: number): Layout {
  const source = text.replace(/\r\n?/g, '\n').split('\n')
  const rows: Row[] = []
  const code: string[] = []
  const found: { level: number; text: string; row: number; line: number }[] = []
  let tables = 0
  let i = 0
  let lastKind = ''

  const gap = (kind: string) => {
    const tight = kind === 'item' && lastKind === 'item'
    if (rows.length > 0 && !tight) rows.push({ kind: 'line', spans: [] })
    lastKind = kind
  }
  const pushCode = (lang: string, body: string[]) => {
    gap('code')
    const block = code.length
    code.push(body.join('\n'))
    rows.push({ kind: 'code-head', block, lang })
    for (const line of body) rows.push({ kind: 'code', block, text: line, lang })
    rows.push({ kind: 'code-foot', block })
  }

  if (source[0]?.trim() === '---') {
    const end = source.findIndex((line, n) => n > 0 && line.trim() === '---')
    if (end > 0) {
      const { pairs, rest } = frontMatter(source.slice(1, end))
      if (pairs.length > 0) {
        gap('table')
        rows.push(...tableRows(['field', 'value'], pairs, room, tables++))
      }
      if (rest.length > 0) pushCode('yaml', rest)
      i = end + 1
    }
  }

  while (i < source.length) {
    const line = source[i] ?? ''
    if (line.trim() === '') {
      if (lastKind === 'item') lastKind = 'list-end'
      i++
      continue
    }

    const fence = FENCE.exec(line)
    if (fence !== null) {
      const marker = fence[1] ?? '```'
      const body: string[] = []
      i++
      while (i < source.length && !(source[i] ?? '').trim().startsWith(marker)) body.push(source[i++] ?? '')
      i++
      pushCode(fence[2] ?? '', body)
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      gap('heading')
      const level = heading[1]?.length ?? 1
      const style: SpanStyle = level <= 2 ? { bold: true } : { bold: true, italic: true }
      const title = heading[2] ?? ''
      const [first, ...more] = lines(wrap(inline(title, style), Math.max(1, room - 4)))
      found.push({ level, text: plain(title), row: rows.length, line: i })
      if (first !== undefined && first.kind === 'line') rows.push({ ...first, heading: found.length - 1 })
      rows.push(...more)
      if (level === 1) rows.push({ kind: 'line', spans: [{ text: '━'.repeat(room), style: { tone: 'rule' } }] })
      i++
      continue
    }

    if (RULE.test(line)) {
      gap('rule')
      rows.push({ kind: 'line', spans: [{ text: '─'.repeat(room), style: { tone: 'rule' } }] })
      i++
      continue
    }

    if (line.includes('|') && TABLE_DIVIDER.test(source[i + 1] ?? '')) {
      gap('table')
      const header = cells(line)
      const body: string[][] = []
      i += 2
      while (i < source.length && (source[i] ?? '').includes('|') && (source[i] ?? '').trim() !== '') body.push(cells(source[i++] ?? ''))
      rows.push(...tableRows(header, body, room, tables++))
      continue
    }

    if (QUOTE.test(line)) {
      gap('quote')
      const quoted: string[] = []
      while (i < source.length && QUOTE.test(source[i] ?? '')) quoted.push(QUOTE.exec(source[i++] ?? '')?.[1] ?? '')
      const bar: Span[] = [{ text: '│ ', style: { tone: 'rule' } }]
      rows.push(...lines(wrap(inline(quoted.join(' '), { italic: true, dim: true }), room, bar)))
      continue
    }

    const item = ITEM.exec(line)
    if (item !== null) {
      gap('item')
      const depth = Math.floor((item[1]?.length ?? 0) / 2)
      const marker = /\d/.test(item[2] ?? '') ? item[2] ?? '' : '•'
      const text = [item[3] ?? '']
      i++
      while (i < source.length) {
        const next = source[i] ?? ''
        if (next.trim() === '' || ITEM.test(next) || FENCE.test(next) || HEADING.test(next) || QUOTE.test(next)) break
        text.push(next.trim())
        i++
      }
      const indent = '  '.repeat(depth + 1)
      const first: Span[] = [{ text: indent }, { text: `${marker} `, style: { tone: 'muted' } }]
      const rest: Span[] = [{ text: indent + ' '.repeat(width(marker) + 1) }]
      rows.push(...lines(wrap(inline(text.join(' ')), room, first, rest)))
      continue
    }

    gap('paragraph')
    const paragraph: string[] = []
    while (i < source.length) {
      const next = source[i] ?? ''
      if (next.trim() === '' || FENCE.test(next) || HEADING.test(next) || QUOTE.test(next) || ITEM.test(next) || RULE.test(next)) break
      if (next.includes('|') && TABLE_DIVIDER.test(source[i + 1] ?? '')) break
      paragraph.push(next.trim())
      i++
    }
    rows.push(...lines(wrap(inline(paragraph.join(' ')), room)))
  }

  const headings = found.map((heading, n) => {
    const next = found.slice(n + 1).find(later => later.level <= heading.level)
    const section = source.slice(heading.line, next === undefined ? source.length : next.line).join('\n').trimEnd()
    return { level: heading.level, text: heading.text, row: heading.row, section }
  })
  return { rows, code, headings }
}

export function rowText(row: Row): string {
  if (row.kind === 'line') return row.spans.map(span => span.text).join('')
  return row.kind === 'code' ? row.text : ''
}

export function changedRows(before: readonly Row[], after: readonly Row[]): Set<number> {
  const left = new Map<string, number>()
  for (const row of before) {
    const text = rowText(row)
    if (text.trim() !== '') left.set(text, (left.get(text) ?? 0) + 1)
  }
  const marked = new Set<number>()
  after.forEach((row, n) => {
    const text = rowText(row)
    if (text.trim() === '') return
    const count = left.get(text) ?? 0
    if (count > 0) left.set(text, count - 1)
    else marked.add(n)
  })
  return marked
}
