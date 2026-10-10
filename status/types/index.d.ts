export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

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
}

declare module 'claude-code' {
  interface PluginState {
    'picket-status': { bar: Bar }
  }
}
