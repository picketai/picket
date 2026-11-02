import { elapsed, minutes } from '../../../lib/shared/format.mts'
import { ACTION_TEXT, isNextAction, type Voice } from '../../../lib/shared/work/action-text.mts'
import { TONES } from '../../shared/theme'
import type { AgentRow, BandEntry, Line, Piece, Work } from '../types'

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

export const entryPieces = ({ needYou, sessions, hasMarkdown }: BandEntry): Piece[] => {
  const parts: Piece[][] = [
    needYou > 0 ? [{ text: `◀ ${needYou} need you`, color: TONES.warning, bold: true }] : [],
    [{ text: `☰ ${sessions}`, color: TONES.control, press: 'work' }],
    hasMarkdown ? [{ text: 'M↓', color: TONES.control, press: 'markdown' }] : [],
  ]
  return joined(
    parts.filter(part => part.length > 0),
    DOT,
  )
}

export const agentsLine = (all: AgentRow[], work: Work | null, now: number, entry: BandEntry): Line => {
  const live = all.filter(row => !isEnded(row.status))
  const agents = live.flatMap(row => {
    const state = agentState(row, live, work)
    return state === 'idle' ? [] : [agentPieces(row, state, now)]
  })
  return { left: agents.length === 0 ? [] : [INDENT, ...joined(agents, DOT)], right: entryPieces(entry) }
}

const actionText = (work: Work, voice: Voice): string =>
  isNextAction(work.action) ? ACTION_TEXT[work.action](work, voice) : work.detail

const otherSessionStep = (work: Work): string => {
  if (work.status === 'blocked') {
    return `blocked: ${work.blocked_reason ?? work.detail}`
  }
  return actionText(work, 'observer')
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
      { text: `${actionText(work, 'user')} ◀`, color: TONES.warning, bold: true },
      { text: ` ${minutes(now - Date.parse(work.since))}`, color: TONES.muted },
    ]
  }
  return [{ text: `${actionText(work, 'user')} ⋯`, color: TONES.accent }]
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
