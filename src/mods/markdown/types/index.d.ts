export type DocWork = { id: string; lane: string; status: string; approved: number; done: number; total: number }

export type ViewedDoc = { path: string; text: string; mtimeMs?: number; error?: string; before?: string; work?: DocWork }

export type BrowseMode = 'files' | 'outline'

export type PaneView = { path: string; treeTop: number; maxOffset: number; maxTreeOffset: number; listRows: number }

declare module 'claude-code' {
  interface PluginState {
    'picket-markdown': {
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
