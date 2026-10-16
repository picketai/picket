export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export type Piece = { text: string; color?: string; bold?: boolean; dim?: boolean }

export type Line = { left: Piece[]; right: Piece[] }

export type CacheTtl = '5m' | '1h'

export type Bar = {
  model: string | null
  effort: string | null
  skill: string | null
  cacheRead: number | null
  contextTokens: number | null
  contextWindow: number | null
  contextPercent: number | null
  limits: Limit[]
  now: number
  cost: number | null
  compactAt: number | null
  lastRequestAt: number | null
  cacheTtl: CacheTtl | null
  ttlSource: 'switch' | 'agent' | null
}

declare module 'claude-code' {
  interface PluginState {
    'picket-status': { bar: Bar }
  }
}
