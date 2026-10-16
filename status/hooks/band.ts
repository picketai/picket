import type { Bar, Limit, Line, Piece, Work } from '../types'
import { bar, cacheLeft, compactTokens, contextColor, levelColor, prettyModel, stepText, untilReset } from './format'

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

const joinParts = (parts: Piece[][]): Piece[] =>
  parts.flatMap((part, index) => (index === 0 ? part : [PART_GAP, ...part]))

const limitPart = (label: string, limit: Limit | undefined, now: number): Piece[] => {
  const head: Piece = { text: `${label} `, color: 'inactive' }
  if (limit === undefined) {
    return [head, { text: 'n/a', color: 'inactive' }]
  }
  return [
    head,
    { text: `${Math.round(limit.percentUsed)}%`, color: levelColor(limit.percentUsed) },
    { text: ` ↻${untilReset(limit.resetsAt, now)}`, dim: true },
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
    right: joinParts(parts.filter(part => part.length > 0)),
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
