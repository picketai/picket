import type { AgentRow, Line, Piece, Work } from '../types'
import { elapsed, minutes, stepText } from './format'
import { TONE } from './palette'

const GAP = 2
const INDENT: Piece = { text: '  ' }
const DOT: Piece = { text: ' · ', color: TONE.rule }
const OTHER_SESSION: Piece = { text: ' · other session', color: TONE.muted }

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
    index < work.phases_approved ? { text: '●', color: TONE.accent } : { text: '○', color: TONE.rule },
  )
  return [{ text: '  ' }, ...dots, { text: ` ${work.phases_approved}/${work.phase_count}`, color: TONE.muted }]
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
        { text: 'working', color: TONE.accent, bold: true },
        { text: ` (${elapsed(now - row.startedAt)})`, color: TONE.muted },
      ]
    : [
        { text: `${row.name} ` },
        { text: 'waiting', color: TONE.warning, bold: true },
        { text: ` (${minutes(now - (row.idleAt ?? now))})`, color: TONE.warning },
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

export const workLine = (work: Work | null, now: number): Line | null => {
  if (work === null) {
    return null
  }
  const isOther = work.other_session === true
  return {
    left: [
      { text: `▶ ${work.lane}`, color: isOther ? TONE.muted : TONE.accent },
      { text: '  ' },
      isOther ? { text: work.title, color: TONE.muted } : { text: work.title, bold: true },
      ...progress(work),
      ...(isOther ? [OTHER_SESSION] : []),
    ],
    right: stepText(work, now),
  }
}
