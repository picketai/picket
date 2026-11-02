import { describe, expect, test } from 'claude-code/testing'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { activeSessionCount, needYouCount, watchedIds, workSignature } from './watch'

const row = (id: string, attention: ListRowView['attention'], session: string | null): ListRowView => ({
  id,
  lane: 'order',
  status: attention === 'closed' ? 'done' : 'open',
  title: id,
  phases: '0/1',
  next: 'none',
  phase: null,
  actor: null,
  detail: '',
  phases_approved: 0,
  phase_count: 1,
  attention,
  sessions: session === null ? [] : [session],
  session,
  branch: null,
  worktrees: [],
})

describe('need-you count (T-6.2)', () => {
  test('needs-you rows of another session and of no session count', async () => {
    expect(needYouCount([row('a', 'needs-you', 'other'), row('b', 'needs-you', null)], 'me')).toBe(2)
  })

  test("the current session's needs-you rows and rows that need nothing are skipped", async () => {
    expect(needYouCount([row('a', 'needs-you', 'me'), row('b', 'working', 'other'), row('c', 'open', null), row('d', 'closed', 'other')], 'me')).toBe(0)
  })
})

describe('work watch', () => {
  test('closed items are not watched; open and unknown folders are', async () => {
    expect(watchedIds(['a', 'b', 'new'], [row('a', 'closed', null), row('b', 'open', null)])).toEqual(['b', 'new'])
  })

  test('the signature ignores order and changes with any mtime or folder', async () => {
    const stats = [
      { id: 'b', stateMs: 1, verdictsMs: 2 },
      { id: 'a', stateMs: 3, verdictsMs: null },
    ]
    const base = workSignature(['a', 'b'], stats)
    expect(workSignature(['b', 'a'], [...stats].reverse())).toBe(base)
    expect(workSignature(['a', 'b'], [stats[0]!, { id: 'a', stateMs: 3, verdictsMs: 4 }])).not.toBe(base)
    expect(workSignature(['a', 'b', 'c'], stats)).not.toBe(base)
  })
})

describe('session count', () => {
  test('transcripts marked done are not counted', async () => {
    expect(activeSessionCount(['s1', 's2', 's3'], ['s2'])).toBe(2)
  })
})
