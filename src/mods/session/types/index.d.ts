export type AgentRow = {
  id: string
  name: string | null
  type: string
  description: string
  status: string
  model: string | null
  effort: string | null
  contextTokens: number | null
  tool: string | null
  lastTool: string | null
  workId: string | null
  phase: number | null
  phases: number | null
  startedAt: number
  endedAt: number | null
}

export type Session = {
  agents: AgentRow[]
  now: number
  frame: number
}

export type AgentGroup = 'running' | 'idle' | 'finished'

export type View = {
  isCompact: boolean
  closedGroups: AgentGroup[]
  tab: 'active' | 'archived'
  renamingId: string | null
  confirmId: string | null
  sessionsOffset: number
  agentsOffset: number
}

export type SessionEntry = {
  id: string
  title: string
  mtimeMs: number
  isLive: boolean
  status: string | null
  isCurrent: boolean
}

export type Sessions = {
  entries: SessionEntry[]
  archived: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'picket-session': { session: Session; view: View; sessions: Sessions }
  }
}
