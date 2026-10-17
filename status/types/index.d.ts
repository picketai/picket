export type Piece = { text: string; color?: string; bold?: boolean; dim?: boolean }

export type Line = { left: Piece[]; right: Piece[] }

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
}

declare module 'claude-code' {
  interface PluginState {
    'picket-status': { now: number; work: Work | null; agents: AgentRow[] }
  }
}
