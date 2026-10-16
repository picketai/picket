import type { Bar, CacheTtl, Piece } from '../types'

const FAMILY = /^claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/

export const prettyModel = (id: string): string => {
  const match = FAMILY.exec(id)
  const [, family, major, minor] = match ?? []
  if (family === undefined) {
    return id
  }
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`
}

export const compactTokens = (n: number): string => {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 100_000 ? 1 : 0)}k`
  }
  return String(n)
}

export const untilReset = (resetsAt: string | undefined, now: number): string => {
  if (resetsAt === undefined) {
    return '?'
  }
  const minutes = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (days > 0) {
    return `${days}d${hours}h`
  }
  return hours > 0 ? `${hours}h${rest}m` : `${rest}m`
}

export const bar = (percent: number, width: number): string => {
  const filled = Math.min(width, Math.round((percent / 100) * width))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const levelColor =(percent: number): string =>
  percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'

export const contextColor = (tokens: number, compactAt: number): string => {
  const share = tokens / compactAt
  return share >= 0.85 ? 'error' : share >= 0.65 ? 'warning' : 'success'
}

const MINUTE = 60_000

const TTL_MS: Record<CacheTtl, number> = { '5m': 5 * MINUTE, '1h': 60 * MINUTE }

export const cacheLeft = (state: Bar, now: number): Piece | null => {
  if (state.lastRequestAt === null) {
    return null
  }
  const left = TTL_MS[state.cacheTtl ?? '5m'] - (now - state.lastRequestAt)
  if (left <= 0) {
    return { text: 'cold', color: 'error', bold: true }
  }
  const text = `◷ ${state.cacheTtl === null ? '~' : ''}${Math.ceil(left / MINUTE)}m`
  return left < 5 * MINUTE ? { text, color: 'warning' } : { text, dim: true }
}
