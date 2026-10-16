import { describe, expect, test } from 'claude-code/testing'

import type { AgentRow, Bar, Piece, Work } from '../types'
import { agentsLine, rows, sessionLine, widthOf, workLine } from './band'

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
      '5h 42% (2h14m)   7d 71% (3d6h)   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k ◷ 52m   $4.12',
    )
    expect(line.left[1]).toEqual({ text: 'Opus 5.5', color: 'claude', bold: true })
    expect(line.right.find(piece => piece.text.startsWith('['))?.color).toBe('success')
    expect(line.right.find(piece => piece.text === ' (2h14m)')?.dim).toBe(true)
    const unknownReset = { ...CANVAS, limits: [{ kind: 'five_hour', percentUsed: 42 }] }
    expect(text(sessionLine(unknownReset).right).startsWith('5h 42% (?)   7d n/a')).toBe(true)
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

const WORK: Work = {
  id: '20261016-ship-picket-markdown-mod-with-picket-init',
  lane: 'order',
  title: 'Ship picket-markdown mod with picket init',
  status: 'open',
  action: 'approve_phase',
  actor: 'user',
  phase: 1,
  detail: 'phase 1 of 2 is done and awaits your decision',
  phases_approved: 1,
  phase_count: 2,
  blocked_reason: null,
  since: new Date(NOW - 6 * MINUTE).toISOString(),
  by: 'developer',
}

describe('work line', () => {
  test('the left part reads lane, title and approved phase dots', async () => {
    const line = workLine(WORK, NOW)
    expect(text(line?.left ?? [])).toBe('▶ order  Ship picket-markdown mod with picket init  ●○ 1/2')
    expect(line?.left.filter(piece => piece.text === '●').map(piece => piece.color)).toEqual(['ide'])
    expect(line?.left.filter(piece => piece.text === '○').map(piece => piece.color)).toEqual(['subtle'])
    expect(text(workLine({ ...WORK, phase_count: 0, phases_approved: 0 }, NOW)?.left ?? [])).toBe(
      '▶ order  Ship picket-markdown mod with picket init',
    )
    expect(workLine(null, NOW)).toBe(null)
  })

  test('a user gate reads as your step with the minutes waited', async () => {
    const right = workLine(WORK, NOW)?.right ?? []
    expect(text(right)).toBe('you approve phase 1 ◀ 6m')
    expect(right[0]).toEqual({ text: 'you approve phase 1 ◀', color: 'warning', bold: true })
  })

  test('an agent step reads as its actor at work, a block as the reason', async () => {
    const implementing = { ...WORK, action: 'implement_phase', actor: 'developer', phase: 2 }
    expect(workLine(implementing, NOW)?.right).toEqual([{ text: 'developer implements phase 2 ⋯', color: 'permission' }])
    const blocked = { ...WORK, status: 'blocked', action: 'resolve_block', blocked_reason: 'phase 2 stalled, 3 tests fail' }
    expect(workLine(blocked, NOW)?.right).toEqual([
      { text: 'blocked: phase 2 stalled, 3 tests fail ◀', color: 'error', bold: true },
    ])
  })
})

const agent = (name: string, status: string, clocks: Partial<AgentRow> = {}): AgentRow => ({
  id: `id-${name}`,
  name,
  role: name,
  status,
  startedAt: NOW,
  idleAt: null,
  ...clocks,
})

describe('agents line', () => {
  test('a working agent shows its time since start and an idle one is not drawn', async () => {
    const line = agentsLine(
      [agent('developer', 'running', { startedAt: NOW - 192_000 }), agent('architect', 'idle', { idleAt: NOW })],
      null,
      NOW,
    )
    expect(text(line?.left ?? [])).toBe('⚇ developer working (3m12s)')
    expect(line?.left.find(piece => piece.text === 'working')).toEqual({ text: 'working', color: 'ide', bold: true })
    expect(line?.right).toEqual([])
  })

  test('the idle agent whose verdict the user is answering waits', async () => {
    const developer = agent('developer', 'idle', { idleAt: NOW - 6 * MINUTE })
    const gate = { ...WORK, actor: 'user', by: 'developer' }
    const waiting = agentsLine([developer], gate, NOW)
    expect(text(waiting?.left ?? [])).toBe('⚇ developer waiting (6m)')
    expect(waiting?.left.find(piece => piece.text === 'waiting')?.color).toBe('warning')
    expect(agentsLine([developer], { ...gate, by: 'reviewer' }, NOW)).toBe(null)

    const earlier = { ...developer, id: 'id-old', name: 'developer-old', idleAt: NOW - 20 * MINUTE }
    expect(text(agentsLine([earlier, developer], gate, NOW)?.left ?? [])).toBe('⚇ developer waiting (6m)')
  })

  test('no working or waiting agent means no agents line', async () => {
    expect(agentsLine([], null, NOW)).toBe(null)
    expect(agentsLine([agent('a', 'completed'), agent('b', 'failed'), agent('c', 'killed')], null, NOW)).toBe(null)
    expect(agentsLine([agent('a', 'idle'), agent('b', 'idle')], null, NOW)).toBe(null)
  })
})
