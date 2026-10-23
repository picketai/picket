import { describe, expect, test } from 'claude-code/testing'

import type { Work } from '../types'
import { elapsed, minutes, stepText } from './format'

const NOW = Date.parse('2026-10-16T10:00:00Z')

const OTHER: Work = {
  id: '20261016-ship',
  lane: 'order',
  title: 'Ship',
  status: 'open',
  action: 'implement_phase',
  actor: 'developer',
  phase: 2,
  detail: 'phase 2 of 3',
  phases_approved: 1,
  phase_count: 3,
  blocked_reason: null,
  since: new Date(NOW).toISOString(),
  by: null,
  session: 's1',
  other_session: true,
}

const step = (work: Work) => stepText(work, NOW)

describe('another session step', () => {
  test('each step is one muted piece with no ask, no marker and no ellipsis', async () => {
    const muted = (text: string) => [{ text, color: 'inactive' }]
    expect(step({ ...OTHER, action: 'approve_phase', actor: 'user', phase: 1 })).toEqual(muted('waits for approval of phase 1'))
    expect(step({ ...OTHER, action: 'resolve_sources', actor: 'user' })).toEqual(muted('waits for source picks'))
    expect(step({ ...OTHER, status: 'blocked', action: 'resolve_block', actor: 'user', blocked_reason: '3 tests fail' })).toEqual(
      muted('blocked: 3 tests fail'),
    )
    expect(step(OTHER)).toEqual(muted('developer implements phase 2'))
  })
})

describe('format', () => {
  test('elapsed reads seconds, then minutes and seconds, then hours and minutes', async () => {
    expect(elapsed(42_000)).toBe('42s')
    expect(elapsed(192_000)).toBe('3m12s')
    expect(elapsed(3_900_000)).toBe('1h05m')
  })

  test('minutes reads whole minutes, then hours and minutes', async () => {
    expect(minutes(6 * 60_000)).toBe('6m')
    expect(minutes(65 * 60_000)).toBe('1h05m')
  })
})
