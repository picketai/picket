import type { ListRowView } from '../../../lib/shared/views.mts'

export type WorkStat = { id: string; stateMs: number | null; verdictsMs: number | null }

export const watchedIds = (folders: readonly string[], rows: readonly ListRowView[]): string[] => {
  const closed = new Set(rows.filter(row => row.attention === 'closed').map(row => row.id))
  return folders.filter(id => !closed.has(id))
}

export const workSignature = (folders: readonly string[], stats: readonly WorkStat[]): string =>
  JSON.stringify([[...folders].sort(), [...stats].sort((a, b) => a.id.localeCompare(b.id))])

export const needYouCount = (rows: readonly ListRowView[], currentId: string | null): number =>
  rows.filter(row => row.attention === 'needs-you' && (row.session === null || row.session !== currentId)).length

export const activeSessionCount = (transcriptIds: readonly string[], done: readonly string[]): number =>
  transcriptIds.filter(id => !done.includes(id)).length
