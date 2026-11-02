import type { SessionEntry } from '../types'

const USER_TITLES: Record<string, string> = {
  'agent-name': 'agentName',
  'custom-title': 'customTitle',
}

const GENERATED_TITLES: Record<string, string> = {
  'ai-title': 'aiTitle',
}

export const TITLE_RECORD = /^\{"type":"(agent-name|custom-title|ai-title)"/

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const projectSlug = (root: string): string => root.replace(/[^A-Za-z0-9]/g, '-')

const latestTitle = (lines: string[], kinds: Record<string, string>): string | null => {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? ''
    const kind = /^\{"type":"([a-z-]+)"/.exec(line)?.[1]
    const field = kind === undefined ? undefined : kinds[kind]
    if (field === undefined) {
      continue
    }
    try {
      const value = (JSON.parse(line) as Record<string, unknown>)[field]
      if (typeof value === 'string' && value.trim() !== '') {
        return value.trim()
      }
    } catch {
      continue
    }
  }
  return null
}

export const titleOf = (transcript: string): string | null => {
  const lines = transcript.split('\n')
  return latestTitle(lines, USER_TITLES) ?? latestTitle(lines, GENERATED_TITLES)
}

export const clampOffset = (offset: number, total: number, capacity: number): number =>
  Math.max(0, Math.min(offset, total - capacity))

export const windowLabel = (offset: number, shownCount: number, total: number): string =>
  total > shownCount ? `↕ ${offset + 1} to ${offset + shownCount} / ${total}` : ''

export const age = (ms: number): string => {
  if (ms < MINUTE) return 'now'
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`
  return `${Math.floor(ms / DAY)}d`
}

export const visible = (
  entries: SessionEntry[],
  archived: readonly string[],
  tab: 'active' | 'archived',
): SessionEntry[] =>
  entries
    .filter(entry => archived.includes(entry.id) === (tab === 'archived'))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || Number(b.isLive) - Number(a.isLive) || b.mtimeMs - a.mtimeMs)
