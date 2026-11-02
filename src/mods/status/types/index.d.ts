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
  options: string[]
  own_gate: { kind: string; reason: string } | null
  detail: string
  phases_approved: number
  phase_count: number
  blocked_reason: string | null
  since: string
  by: string | null
  session?: string | null
  other_session?: boolean
}

export type AgentRow = {
  id: string
  name: string
  role: string
  status: string
  startedAt: number
  idleAt: number | null
}

export type SessionEntry = {
  id: string
  title: string
  mtimeMs: number
  isLive: boolean
  isCurrent: boolean
}

export type Attention = 'needs-you' | 'working' | 'open' | 'closed'

export type ListRow = {
  id: string
  lane: string
  status: string
  title: string
  phases: string
  next: string
  attention: Attention
  sessions: string[]
  session: string | null
  branch: string | null
  worktrees: { repo: string; path: string; present: boolean }[]
}

export type SessionGroup = Attention | 'none'

export type GroupedSession = {
  entry: SessionEntry
  group: SessionGroup
  items: ListRow[]
  greyed: ListRow[]
}

export type PaneTab = 'active' | 'done' | 'cleanup'

export type PaneView = {
  tab: PaneTab
  selectedId: string | null
  renamingId: string | null
  confirm: string | null
  offset: number
}

declare module 'claude-code' {
  interface PluginState {
    'picket-status': {
      now: number
      work: Work | null
      agents: AgentRow[]
      rows: ListRow[]
      sessions: SessionEntry[]
      done: string[]
      paneView: PaneView
    }
  }
}
