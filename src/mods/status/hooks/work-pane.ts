import type { ListRowView } from '../../../lib/shared/views.mts'
import type { GroupedSession, SessionEntry, SessionGroup } from '../types'

export const SESSION_GROUPS: readonly { group: SessionGroup; label: string }[] = [
  { group: 'needs-you', label: 'NEEDS YOU' },
  { group: 'working', label: 'WORKING' },
  { group: 'open', label: 'OPEN' },
  { group: 'closed', label: 'CLOSED' },
  { group: 'none', label: 'NO WORK ITEM' },
]

export type GroupList = { group: SessionGroup; label: string; sessions: GroupedSession[] }

export type GroupedPane = { active: GroupList[]; done: GroupedSession[] }

const urgency = (group: SessionGroup): number => SESSION_GROUPS.findIndex(one => one.group === group)

const groupOf = (items: readonly ListRowView[], greyed: readonly ListRowView[]): SessionGroup => {
  if (items.length === 0) return greyed.length > 0 ? 'closed' : 'none'
  return items.map(item => item.attention).reduce((most, next) => (urgency(next) < urgency(most) ? next : most))
}

export function groupedSession(entry: SessionEntry, rows: readonly ListRowView[]): GroupedSession {
  const items = rows.filter(row => row.session === entry.id)
  const greyed = rows.filter(row => row.session !== entry.id && row.sessions.includes(entry.id))
  return { entry, group: groupOf(items, greyed), items, greyed }
}

const currentThenNewest = (a: GroupedSession, b: GroupedSession): number =>
  Number(b.entry.isCurrent) - Number(a.entry.isCurrent) || b.entry.mtimeMs - a.entry.mtimeMs

export function groupSessions(
  entries: readonly SessionEntry[],
  rows: readonly ListRowView[],
  done: readonly string[],
): GroupedPane {
  const grouped = entries.map(entry => groupedSession(entry, rows)).sort(currentThenNewest)
  const active = grouped.filter(one => !done.includes(one.entry.id))
  return {
    active: SESSION_GROUPS.map(({ group, label }) => ({ group, label, sessions: active.filter(one => one.group === group) })).filter(
      list => list.sessions.length > 0,
    ),
    done: grouped.filter(one => done.includes(one.entry.id)),
  }
}
