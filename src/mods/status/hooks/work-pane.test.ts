import { describe, expect, test } from 'claude-code/testing'

import type { ListRowView } from '../../../lib/shared/views.mts'
import type { SessionEntry } from '../types'
import { groupSessions } from './work-pane'

const entry = (id: string, mtimeMs = 0, isCurrent = false): SessionEntry => ({ id, title: `title ${id}`, mtimeMs, isLive: false, isCurrent })

const row = (id: string, attention: ListRowView['attention'], sessions: string[]): ListRowView => ({
  id,
  lane: 'design',
  status: attention === 'closed' ? 'done' : 'open',
  title: `item ${id}`,
  phases: '0/1',
  next: 'none',
  attention,
  sessions,
  session: sessions.at(-1) ?? null,
  branch: null,
  worktrees: [],
})

const activeOf = (entries: SessionEntry[], rows: ListRowView[], done: string[] = []) =>
  groupSessions(entries, rows, done).active.map(list => ({ label: list.label, ids: list.sessions.map(one => one.entry.id) }))

describe('work pane grouping (T-4.1)', () => {
  test('a session holding a needs-you and a working item goes under NEEDS YOU', async () => {
    expect(activeOf([entry('s1')], [row('a', 'working', ['s1']), row('b', 'needs-you', ['s1'])])).toEqual([{ label: 'NEEDS YOU', ids: ['s1'] }])
  })

  test('a session holding only working items goes under WORKING', async () => {
    expect(activeOf([entry('s1')], [row('a', 'working', ['s1'])])).toEqual([{ label: 'WORKING', ids: ['s1'] }])
  })

  test('a session holding an open item goes under OPEN', async () => {
    expect(activeOf([entry('s1')], [row('a', 'open', ['s1']), row('b', 'closed', ['s1'])])).toEqual([{ label: 'OPEN', ids: ['s1'] }])
  })

  test('a session holding only closed items goes under CLOSED', async () => {
    expect(activeOf([entry('s1')], [row('a', 'closed', ['s1'])])).toEqual([{ label: 'CLOSED', ids: ['s1'] }])
  })

  test('a session holding only an item continued in a later session goes under CLOSED with that item greyed', async () => {
    const continued = row('a', 'needs-you', ['s1', 's2'])
    const pane = groupSessions([entry('s1', 1), entry('s2', 2)], [continued], [])
    const closed = pane.active.find(list => list.label === 'CLOSED')
    expect(closed?.sessions.map(one => one.entry.id)).toEqual(['s1'])
    expect(closed?.sessions[0]?.items).toEqual([])
    expect(closed?.sessions[0]?.greyed).toEqual([continued])
    expect(pane.active.find(list => list.label === 'NEEDS YOU')?.sessions[0]?.items).toEqual([continued])
  })

  test('a session with no item goes under NO WORK ITEM', async () => {
    expect(activeOf([entry('s1')], [row('a', 'open', ['s9'])])).toEqual([{ label: 'NO WORK ITEM', ids: ['s1'] }])
  })

  test('a done session shows in Done and in no Active group', async () => {
    const pane = groupSessions([entry('s1'), entry('s2')], [row('a', 'working', ['s1'])], ['s1'])
    expect(pane.done.map(one => one.entry.id)).toEqual(['s1'])
    expect(pane.active.flatMap(list => list.sessions.map(one => one.entry.id))).toEqual(['s2'])
  })

  test('the current session comes first in its group, then the newest', async () => {
    expect(activeOf([entry('old', 1), entry('me', 2, true), entry('new', 3)], [])).toEqual([{ label: 'NO WORK ITEM', ids: ['me', 'new', 'old'] }])
  })
})
