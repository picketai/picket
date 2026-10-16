import { describe, expect, test } from 'claude-code/testing'

import type { Bar, Piece } from '../types'
import { rows, sessionLine, widthOf } from './band'

const NOW = Date.parse('2026-10-16T10:00:00Z')
const MINUTE = 60_000

const CANVAS: Bar = {
  model: 'claude-opus-5-5',
  effort: 'high',
  skill: 'picket:ordering',
  cacheRead: 48_000,
  contextTokens: 62_000,
  contextWindow: 200_000,
  contextPercent: 31,
  limits: [
    { kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 134 * MINUTE).toISOString() },
    { kind: 'seven_day', percentUsed: 71, resetsAt: new Date(NOW + 78 * 60 * MINUTE).toISOString() },
  ],
  now: NOW,
  cost: 4.12,
  compactAt: 167_000,
  lastRequestAt: NOW - 8 * MINUTE,
  cacheTtl: '1h',
  ttlSource: 'switch',
}

const text = (pieces: Piece[]) => pieces.map(piece => piece.text).join('')

const cachePiece = (state: Bar) => {
  const right = sessionLine(state).right
  const index = right.findIndex(piece => piece.text === 'cache ')
  return right[index + 3]
}

describe('band', () => {
  test('a line that fits is one row padded to the columns, else left then right', async () => {
    const line = sessionLine(CANVAS)
    const wide = rows(line, 160)
    expect(wide.length).toBe(1)
    expect(widthOf(wide[0] ?? [])).toBe(160)
    expect(text(wide[0] ?? []).startsWith(text(line.left))).toBe(true)
    expect(text(wide[0] ?? []).endsWith(text(line.right))).toBe(true)

    const narrow = rows(line, 90)
    expect(narrow.map(text)).toEqual([text(line.left), text(line.right)])
    expect(rows({ left: line.left, right: [] }, 10)).toEqual([line.left])
  })

  test('the session line reads the canvas figures', async () => {
    const line = sessionLine(CANVAS)
    expect(text(line.left)).toBe('◆ Opus 5.5 · high · picket:ordering')
    expect(text(line.right)).toBe(
      '5h 42% ↻2h14m   7d 71% ↻3d6h   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k ◷ 52m   $4.12',
    )
    expect(line.left[1]).toEqual({ text: 'Opus 5.5', color: 'claude', bold: true })
    expect(line.right.find(piece => piece.text.startsWith('['))?.color).toBe('success')
  })

  test('the cache part warns while unlearned and runs cold past its ttl', async () => {
    const unlearned = { ...CANVAS, cacheTtl: null, ttlSource: null, lastRequestAt: NOW - 2 * MINUTE }
    expect(cachePiece(unlearned)).toEqual({ text: '◷ ~3m', color: 'warning' })

    const cold = { ...CANVAS, lastRequestAt: NOW - 61 * MINUTE }
    expect(cachePiece(cold)).toEqual({ text: 'cold', color: 'error', bold: true })
    expect(text(sessionLine(cold).right)).toContain('cache 48k cold')

    const fresh = { ...CANVAS, lastRequestAt: null, cost: null, limits: [] }
    expect(text(sessionLine(fresh).right)).toBe('5h n/a   7d n/a   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k')
  })
})
