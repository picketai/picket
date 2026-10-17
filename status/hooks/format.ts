import type { Piece, Work } from '../types'
import { TONE } from './palette'

const MINUTE = 60_000

export const elapsed = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  if (seconds < 60) {
    return `${seconds}s`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`
  }
  return minutes(ms)
}

export const minutes = (ms: number): string => {
  const whole = Math.max(0, Math.floor(ms / MINUTE))
  const hours = Math.floor(whole / 60)
  return hours > 0 ? `${hours}h${String(whole % 60).padStart(2, '0')}m` : `${whole}m`
}

const agentVerb = (work: Work): string => {
  switch (work.action) {
    case 'implement_phase':
      return `implements phase ${work.phase}`
    case 'review_checkpoint':
      return `reviews phase ${work.phase}`
    case 'review_cumulative':
      return 'reviews all phases'
    case 'write_artifact':
      return `writes ${work.lane}.md`
    case 'close':
      return 'closes the item'
    default:
      return work.detail
  }
}

export const stepText = (work: Work, now: number): Piece[] => {
  if (work.status === 'blocked') {
    return [{ text: `blocked: ${work.blocked_reason ?? work.detail} ◀`, color: TONE.error, bold: true }]
  }
  if (work.actor === 'user') {
    const ask = work.action === 'resolve_sources' ? 'you pick source versions' : `you approve phase ${work.phase}`
    return [
      { text: `${ask} ◀`, color: TONE.warning, bold: true },
      { text: ` ${minutes(now - Date.parse(work.since))}`, color: TONE.muted },
    ]
  }
  return [{ text: `${work.actor ?? 'lead'} ${agentVerb(work)} ⋯`, color: TONE.accent }]
}
