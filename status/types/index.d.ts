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

export type Work = {
  id: string
  lane: string
  title: string
  status: string
  action: string
  actor: string | null
  phase: number | null
  detail: string
  phases_approved: number
  phase_count: number
  blocked_reason: string | null
  since: string
  by: string | null
}

export type AgentRow = {
  id: string
  name: string
  role: string
  status: string
  startedAt: number
  idleAt: number | null
  lastJobMs: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'picket-status': { bar: Bar; work: Work | null; agents: AgentRow[] }
  }
}
