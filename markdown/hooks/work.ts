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

export function field(yaml: string, name: string): string {
  const match = new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(yaml.replace(/\r\n?/g, '\n'))
  return (match?.[1] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2')
}

export function phaseCount(artifact: string): number {
  const front = /^---\n([\s\S]*?)\n---/.exec(artifact.replace(/\r\n?/g, '\n'))?.[1] ?? ''
  return (front.match(/^\s*-\s*n:\s*\d+/gm) ?? []).length
}

export function markerCount(names: readonly string[], suffix: 'done' | 'approved'): number {
  return names.filter(name => new RegExp(`^\\d+\\.${suffix}$`).test(name)).length
}

export function statusLine(work: WorkStatus): string {
  const parts = [`work ${work.id}`, work.lane, work.status]
  if (work.total > 0) parts.push(`phase ${work.approved}/${work.total} approved`)
  if (work.done > work.approved) parts.push(`${work.done - work.approved} awaiting review`)
  return parts.filter(part => part !== '').join(' · ')
}
