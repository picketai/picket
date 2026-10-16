import type { AgentRow, Bar, Limit, Line, Piece, Work } from '../types'
import {
  bar,
  cacheLeft,
  compactTokens,
  contextColor,
  elapsed,
  levelColor,
  minutes,
  prettyModel,
  stepText,
  untilReset,
} from './format'

const GAP = 2
const PART_GAP: Piece = { text: '   ' }
const DOT: Piece = { text: ' · ', dim: true }
const CONTEXT_BAR_WIDTH = 10

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

const limitPart = (label: string, limit: Limit | undefined, now: number): Piece[] => {
  const head: Piece = { text: `${label} `, color: 'inactive' }
  if (limit === undefined) {
    return [head, { text: 'n/a', color: 'inactive' }]
  }
  return [
    head,
    { text: `${Math.round(limit.percentUsed)}%`, color: levelColor(limit.percentUsed) },
    { text: ` (${untilReset(limit.resetsAt, now)})`, dim: true },
  ]
}

const contextPart = (state: Bar): Piece[] => {
  const tokens = state.contextTokens ?? 0
  const percent = state.contextPercent ?? 0
  const color = state.compactAt === null ? levelColor(percent) : contextColor(tokens, state.compactAt)
  const window = state.contextWindow === null ? '?' : compactTokens(state.contextWindow)
  return [
    { text: 'ctx ', color: 'inactive' },
    { text: `[${bar(percent, CONTEXT_BAR_WIDTH)}]`, color },
    { text: ` ${compactTokens(tokens)}/${window} (${percent}%)` },
  ]
}

const cachePart = (state: Bar): Piece[] => {
  const left = cacheLeft(state, state.now)
  return [
    { text: 'cache ', color: 'inactive' },
    { text: state.cacheRead === null ? 'n/a' : compactTokens(state.cacheRead) },
    ...(left === null ? [] : [{ text: ' ' }, left]),
  ]
}

const costPart = (state: Bar): Piece[] =>
  state.cost === null ? [] : [{ text: `$${state.cost.toFixed(2)}` }]

export const sessionLine = (state: Bar): Line => {
  const limit = (kind: string) => state.limits.find(candidate => candidate.kind === kind)
  const parts = [
    limitPart('5h', limit('five_hour'), state.now),
    limitPart('7d', limit('seven_day'), state.now),
    contextPart(state),
    cachePart(state),
    costPart(state),
  ]
  return {
    left: [
      { text: '◆ ', color: 'claude' },
      { text: state.model === null ? '...' : prettyModel(state.model), color: 'claude', bold: true },
      DOT,
      { text: state.effort ?? 'default', color: 'permission' },
      DOT,
      { text: state.skill ?? 'none', color: 'ide' },
    ],
    right: joined(parts.filter(part => part.length > 0), PART_GAP),
  }
}

const progress = (work: Work): Piece[] => {
  if (work.phase_count === 0) {
    return []
  }
  const dots = Array.from({ length: work.phase_count }, (_, index): Piece =>
    index < work.phases_approved ? { text: '●', color: 'ide' } : { text: '○', color: 'subtle' },
  )
  return [{ text: '  ' }, ...dots, { text: ` ${work.phases_approved}/${work.phase_count}`, color: 'inactive' }]
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
  if (work?.actor !== 'user' || work.by !== row.role) {
    return 'idle'
  }
  const latestIdle = Math.max(...all.filter(other => other.role === row.role).map(other => other.idleAt ?? -Infinity))
  return row.idleAt !== null && row.idleAt === latestIdle ? 'waiting' : 'idle'
}

const agentPieces = (row: AgentRow, state: Exclude<AgentState, 'idle'>, now: number): Piece[] =>
  state === 'working'
    ? [
        { text: `${row.name} ` },
        { text: 'working', color: 'ide', bold: true },
        { text: ` (${elapsed(now - row.startedAt)})`, color: 'ide' },
      ]
    : [
        { text: `${row.name} ` },
        { text: 'waiting', color: 'warning', bold: true },
        { text: ` (${minutes(now - (row.idleAt ?? now))})`, color: 'warning' },
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
  return { left: [{ text: '⚇ ', color: 'permission' }, ...joined(agents, DOT)], right: [] }
}

export const workLine = (work: Work | null, now: number): Line | null => {
  if (work === null) {
    return null
  }
  return {
    left: [
      { text: `▶ ${work.lane}`, color: 'permission' },
      { text: '  ' },
      { text: work.title, bold: true },
      ...progress(work),
    ],
    right: stepText(work, now),
  }
}
