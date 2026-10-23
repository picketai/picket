export type WorkStatus = {
  id: string
  lane: string
  status: string
  approved: number
  done: number
  total: number
}

export function workId(relativePath: string): string | undefined {
  return /^work\/([^/]+)\//.exec(relativePath.replace(/\\/g, '/'))?.[1]
}

export function statusLine(work: WorkStatus): string {
  const parts = [`work ${work.id}`, work.lane, work.status]
  if (work.total > 0) parts.push(`phase ${work.approved}/${work.total} approved`)
  if (work.done > work.approved) parts.push(`${work.done - work.approved} awaiting review`)
  return parts.filter(part => part !== '').join(' · ')
}
