import { describe, expect, test } from 'claude-code/testing'

import type { AgentRow, Piece, Work } from '../types'
import { agentsLine, rows, widthOf, workLine } from './band'

const NOW = Date.parse('2026-10-16T10:00:00Z')
const MINUTE = 60_000

const text = (pieces: Piece[]) => pieces.map(piece => piece.text).join('')

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

describe('rows', () => {
  test('a work line that fits is one row padded to the columns, else left then right', async () => {
    const line = workLine(WORK, NOW) ?? { left: [], right: [] }
    const wide = rows(line, 158)
    expect(wide.length).toBe(1)
    expect(widthOf(wide[0] ?? [])).toBe(158)
    expect(text(wide[0] ?? []).startsWith(text(line.left))).toBe(true)
    expect(text(wide[0] ?? []).endsWith(text(line.right))).toBe(true)

    expect(rows(line, 60).map(text)).toEqual([text(line.left), text(line.right)])
    expect(rows({ left: line.left, right: [] }, 10)).toEqual([line.left])
  })
})

describe('work line', () => {
  test('the left part reads lane, title and approved phase dots', async () => {
    const line = workLine(WORK, NOW)
    expect(text(line?.left ?? [])).toBe('▶ order  Ship picket-markdown mod with picket init  ●○ 1/2')
    expect(line?.left.filter(piece => piece.text === '●').map(piece => piece.color)).toEqual(['claude'])
    expect(line?.left.filter(piece => piece.text === '○').map(piece => piece.color)).toEqual(['promptBorder'])
    expect(line?.left.find(piece => piece.text === ' 1/2')?.color).toBe('inactive')
    expect(text(workLine({ ...WORK, phase_count: 0, phases_approved: 0 }, NOW)?.left ?? [])).toBe(
      '▶ order  Ship picket-markdown mod with picket init',
    )
    expect(workLine(null, NOW)).toBe(null)
  })

  test('a user gate reads as your step with the minutes waited', async () => {
    const right = workLine(WORK, NOW)?.right ?? []
    expect(text(right)).toBe('you approve phase 1 ◀ 6m')
    expect(right).toEqual([
      { text: 'you approve phase 1 ◀', color: 'warning', bold: true },
      { text: ' 6m', color: 'inactive' },
    ])
  })

  test('an agent step reads as its actor at work, a block as the reason', async () => {
    const implementing = { ...WORK, action: 'implement_phase', actor: 'developer', phase: 2 }
    expect(workLine(implementing, NOW)?.right).toEqual([{ text: 'developer implements phase 2 ⋯', color: 'claude' }])
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
    expect(text(line?.left ?? [])).toBe('  developer working (3m12s)')
    expect(line?.left.find(piece => piece.text === 'working')).toEqual({ text: 'working', color: 'claude', bold: true })
    expect(line?.left.find(piece => piece.text === ' (3m12s)')?.color).toBe('inactive')
    expect(line?.right).toEqual([])
  })

  test('the idle agent whose verdict the user is answering waits', async () => {
    const developer = agent('developer', 'idle', { idleAt: NOW - 6 * MINUTE })
    const gate = { ...WORK, actor: 'user', by: 'developer' }
    const waiting = agentsLine([developer], gate, NOW)
    expect(text(waiting?.left ?? [])).toBe('  developer waiting (6m)')
    expect(waiting?.left.find(piece => piece.text === 'waiting')?.color).toBe('warning')
    expect(agentsLine([developer], { ...gate, by: 'reviewer' }, NOW)).toBe(null)

    const earlier = { ...developer, id: 'id-old', name: 'developer-old', idleAt: NOW - 20 * MINUTE }
    expect(text(agentsLine([earlier, developer], gate, NOW)?.left ?? [])).toBe('  developer waiting (6m)')
  })

  test('the first agent name starts in the same column as the lane name', async () => {
    const lane = text(workLine(WORK, NOW)?.left ?? []).indexOf(WORK.lane)
    const name = text(agentsLine([agent('developer', 'running')], null, NOW)?.left ?? []).indexOf('developer')
    expect(name).toBe(lane)
  })

  test('no working or waiting agent means no agents line', async () => {
    expect(agentsLine([], null, NOW)).toBe(null)
    expect(agentsLine([agent('a', 'completed'), agent('b', 'failed'), agent('c', 'killed')], null, NOW)).toBe(null)
    expect(agentsLine([agent('a', 'idle'), agent('b', 'idle')], null, NOW)).toBe(null)
  })
})
