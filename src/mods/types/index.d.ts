export type Next<E, R> = (event: E) => Promise<R>

export type Piece = { text: string; color?: string; bold?: boolean; dim?: boolean; press?: 'work' | 'markdown' }

export type Line = { left: Piece[]; right: Piece[] }

export type BandEntry = { needYou: number; sessions: number | null; hasMarkdown: boolean }

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
  size: number
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
  phase: number | null
  actor: string | null
  detail: string
  phases_approved: number
  phase_count: number
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

export type CleanupWorktree = { item: ListRow; repo: string; path: string; command: string }

export type Cleanup = { worktrees: CleanupWorktree[]; sessions: SessionEntry[] }

export type PaneTab = 'active' | 'done' | 'cleanup'

export type PaneView = {
  tab: PaneTab
  selectedId: string | null
  renamingId: string | null
  confirm: string | null
  offset: number
  folded: FoldableGroup[]
}

export type FoldableGroup = SessionGroup | 'done'

export type DocWork = { id: string; lane: string; status: string; approved: number; done: number; total: number }

export type ViewedDoc = { path: string; text: string; mtimeMs?: number; error?: string; before?: string; work?: DocWork }

export type BrowseMode = 'files' | 'outline'

export type DocPaneView = { path: string; treeTop: number; maxOffset: number; maxTreeOffset: number; listRows: number }

declare module 'claude-code' {
  interface PluginState {
    'picket': {
      now: number
      work: Work | null
      agents: AgentRow[]
      rows: ListRow[]
      sessions: SessionEntry[]
      done: string[]
      paneView: PaneView
      transcriptIds: string[]
      hasMarkdown: boolean
      currentId: string | null
      doc: ViewedDoc | null
      files: string[]
      expanded: Record<string, boolean>
      offsets: Record<string, number>
      treeOffset: number
      mode: BrowseMode
      changed: Record<string, boolean>
      history: string[]
      hscroll: Record<string, number>
    }
  }
}
