import { elapsed, minutes } from '../../../lib/shared/format.mts'
import { TONES } from '../../shared/theme'
import type { AgentRow, Line, Piece, Work } from '../types'

const GAP = 2
const INDENT: Piece = { text: '  ' }
const DOT: Piece = { text: ' · ', color: TONES.rule }
const OTHER_SESSION: Piece = { text: ' · other session', color: TONES.muted }

export const widthOf = (pieces: Piece[]): number =>
  pieces.reduce((sum, piece) => sum + [...piece.text].length, 0)

export const rows = (line: Line, columns: number): Piece[][] => {
  if (line.right.length === 0) {
    return [line.left]
  }
  const left = widthOf(line.left)
  const right = widthOf(line.right)
  if (left + GAP + right <= columns) {
    return [[...line.left, { text: ' '.repeat(columns - left - right) }, ...line.right]]
  }
  return [line.left, line.right]
}

const joined = (parts: Piece[][], separator: Piece): Piece[] =>
  parts.flatMap((part, index) => (index === 0 ? part : [separator, ...part]))

const progress = (work: Work): Piece[] => {
  if (work.phase_count === 0) {
    return []
  }
  const dots = Array.from({ length: work.phase_count }, (_, index): Piece =>
    index < work.phases_approved ? { text: '●', color: TONES.accent } : { text: '○', color: TONES.rule },
  )
  return [{ text: '  ' }, ...dots, { text: ` ${work.phases_approved}/${work.phase_count}`, color: TONES.muted }]
}

const WORKING = new Set(['running', 'pending', 'waiting'])

const ENDED = new Set(['completed', 'failed', 'killed'])

export const isWorking = (status: string): boolean => WORKING.has(status)

export const isEnded = (status: string): boolean => ENDED.has(status)

export type AgentState = 'working' | 'waiting' | 'idle'

export const agentState = (row: AgentRow, all: AgentRow[], work: Work | null): AgentState => {
  if (isWorking(row.status)) {
    return 'working'
  }
  if (work?.actor !== 'user' || work.other_session === true || work.by !== row.role) {
    return 'idle'
  }
  const latestIdle = Math.max(...all.filter(other => other.role === row.role).map(other => other.idleAt ?? -Infinity))
  return row.idleAt !== null && row.idleAt === latestIdle ? 'waiting' : 'idle'
}

const agentPieces = (row: AgentRow, state: Exclude<AgentState, 'idle'>, now: number): Piece[] =>
  state === 'working'
    ? [
        { text: `${row.name} ` },
        { text: 'working', color: TONES.accent, bold: true },
        { text: ` (${elapsed(now - row.startedAt)})`, color: TONES.muted },
      ]
    : [
        { text: `${row.name} ` },
        { text: 'waiting', color: TONES.warning, bold: true },
        { text: ` (${minutes(now - (row.idleAt ?? now))})`, color: TONES.warning },
      ]

export const agentsLine = (all: AgentRow[], work: Work | null, now: number): Line | null => {
  const live = all.filter(row => !isEnded(row.status))
  const agents = live.flatMap(row => {
    const state = agentState(row, live, work)
    return state === 'idle' ? [] : [agentPieces(row, state, now)]
  })
  if (agents.length === 0) {
    return null
  }
  return { left: [INDENT, ...joined(agents, DOT)], right: [] }
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

const otherSessionStep = (work: Work): string => {
  if (work.status === 'blocked') {
    return `blocked: ${work.blocked_reason ?? work.detail}`
  }
  if (work.action === 'resolve_sources') {
    return 'waits for source picks'
  }
  if (work.action === 'resolve_rejections') {
    return 'waits for a decision after repeated rejections'
  }
  if (work.actor === 'user') {
    return `waits for approval of phase ${work.phase}`
  }
  return `${work.actor ?? 'lead'} ${agentVerb(work)}`
}

const userAsk = (work: Work): string => {
  switch (work.action) {
    case 'resolve_sources':
      return 'you pick source versions'
    case 'resolve_rejections':
      return 'you decide after repeated rejections'
    default:
      return `you approve phase ${work.phase}`
  }
}

export const stepText = (work: Work, now: number): Piece[] => {
  if (work.other_session === true) {
    return [{ text: otherSessionStep(work), color: TONES.muted }]
  }
  if (work.status === 'blocked') {
    return [{ text: `blocked: ${work.blocked_reason ?? work.detail} ◀`, color: TONES.error, bold: true }]
  }
  if (work.actor === 'user') {
    return [
      { text: `${userAsk(work)} ◀`, color: TONES.warning, bold: true },
      { text: ` ${minutes(now - Date.parse(work.since))}`, color: TONES.muted },
    ]
  }
  return [{ text: `${work.actor ?? 'lead'} ${agentVerb(work)} ⋯`, color: TONES.accent }]
}

export const workLine = (work: Work | null, now: number): Line | null => {
  if (work === null) {
    return null
  }
  const isOther = work.other_session === true
  return {
    left: [
      { text: `▶ ${work.lane}`, color: isOther ? TONES.muted : TONES.accent },
      { text: '  ' },
      isOther ? { text: work.title, color: TONES.muted } : { text: work.title, bold: true },
      ...progress(work),
      ...(isOther ? [OTHER_SESSION] : []),
    ],
    right: stepText(work, now),
  }
}
