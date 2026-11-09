import { describe, expect, test } from 'claude-code/testing'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { TONES } from '../../shared/theme'
import type { GroupedSession, Piece } from '../../types'
import { detailPieces } from './detail'

const item = (fields: Partial<ListRowView>): ListRowView => ({
  id: 'w1',
  lane: 'order',
  status: 'open',
  title: 'Item',
  phases: '0/0',
  next: 'none',
  phase: null,
  actor: null,
  detail: '',
  phases_approved: 0,
  phase_count: 0,
  attention: 'open',
  sessions: ['s1'],
  session: 's1',
  branch: null,
  worktrees: [],
  ...fields,
})

const session = (items: ListRowView[]): GroupedSession => ({
  entry: { id: 's1', title: 'Session', mtimeMs: 0, size: 0, isLive: false, isCurrent: false },
  group: 'open',
  items,
  greyed: [],
})

const text = (pieces: Piece[]) => pieces.map(piece => piece.text).join('')

const GAP = { text: '  ' }
const DONE_DOT = { text: '●', color: TONES.accent }
const OPEN_DOT = { text: '○', color: TONES.rule }

describe('session detail row (T-2.2)', () => {
  test('an order at approve_phase 3 reads its lane, two approved of three dots and your step', async () => {
    const order = item({ next: 'approve_phase', actor: 'user', phase: 3, phases_approved: 2, phase_count: 3, attention: 'needs-you' })
    const pieces = detailPieces(session([order]))
    expect(text(pieces)).toBe('order  ●●○  you approve phase 3 ◀')
    expect(pieces).toEqual([
      { text: 'order', color: TONES.accent },
      GAP,
      DONE_DOT,
      DONE_DOT,
      OPEN_DOT,
      GAP,
      { text: 'you approve phase 3 ◀', color: TONES.warning, bold: true },
    ])
  })

  test('a blocked design reads its reason in error bold and counts the other item', async () => {
    const design = item({
      lane: 'design',
      status: 'blocked',
      next: 'resolve_block',
      actor: 'user',
      detail: '3 tests fail',
      phases_approved: 1,
      phase_count: 4,
      attention: 'needs-you',
    })
    const pieces = detailPieces(session([design, item({ id: 'w2', attention: 'working' })]))
    expect(text(pieces)).toBe('design  ●○○○  blocked: 3 tests fail ◀  +1')
    expect(pieces).toEqual([
      { text: 'design', color: TONES.accent },
      GAP,
      DONE_DOT,
      OPEN_DOT,
      OPEN_DOT,
      OPEN_DOT,
      GAP,
      { text: 'blocked: 3 tests fail ◀', color: TONES.error, bold: true },
      { text: '  +1', color: TONES.muted },
    ])
  })

  test('a research item with no phases draws no dots', async () => {
    const research = item({ lane: 'research', next: 'resolve_sources', actor: 'user', attention: 'needs-you' })
    const pieces = detailPieces(session([research]))
    expect(text(pieces)).toBe('research  you pick source versions ◀')
    expect(pieces).toEqual([{ text: 'research', color: TONES.accent }, GAP, { text: 'you pick source versions ◀', color: TONES.warning, bold: true }])
  })

  test('the most urgent item leads whatever the list order', async () => {
    const working = item({ id: 'w1', next: 'implement_phase', actor: 'developer', phase: 1, attention: 'working' })
    const gate = item({ id: 'w2', lane: 'design', next: 'approve_phase', actor: 'user', phase: 2, attention: 'needs-you' })
    expect(text(detailPieces(session([working, gate])))).toBe('design  you approve phase 2 ◀  +1')
  })
})

describe('session detail row (T-2.3)', () => {
  test('a working step is accent and ends with ⋯, an open one muted with no marker', async () => {
    const working = item({ next: 'implement_phase', actor: 'developer', phase: 2, attention: 'working' })
    expect(detailPieces(session([working])).at(-1)).toEqual({ text: 'developer implements phase 2 ⋯', color: TONES.accent })
    const open = item({ next: 'close', actor: 'lead', attention: 'open' })
    expect(detailPieces(session([open])).at(-1)).toEqual({ text: 'lead closes the item', color: TONES.muted })
  })

  test('a closed item reads closed, its branch and its present worktree', async () => {
    const closed = item({
      status: 'done',
      attention: 'closed',
      branch: 'fix/markdown-paths',
      worktrees: [{ repo: 'svc', path: 'svc/.worktrees/fix', present: true }],
    })
    expect(detailPieces(session([closed]))).toEqual([
      { text: 'closed', color: TONES.success },
      GAP,
      { text: '⎇ fix/markdown-paths', color: TONES.accent },
      GAP,
      { text: 'worktree', color: TONES.warning },
    ])
  })

  test('an abandoned item reads abandoned in muted', async () => {
    expect(detailPieces(session([item({ status: 'abandoned', attention: 'closed' })]))).toEqual([{ text: 'abandoned', color: TONES.muted }])
  })

  test('a closed item with no branch and no present worktree reads closed alone', async () => {
    const closed = item({ status: 'done', attention: 'closed', worktrees: [{ repo: 'svc', path: 'svc/.worktrees/gone', present: false }] })
    expect(detailPieces(session([closed]))).toEqual([{ text: 'closed', color: TONES.success }])
  })

  test('a session with no items has no detail row', async () => {
    expect(detailPieces(session([]))).toEqual([])
  })
})
