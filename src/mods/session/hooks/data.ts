import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface } from 'claude-code'

import type { StateView } from '../../../lib/shared/views.mts'
import { runPicket } from '../../shared/kernel'
import type { AgentGroup, AgentRow, Session, SessionEntry, Sessions, View } from '../types'
import { projectSlug, TITLE_RECORD, titleOf } from './sessions'

const FINISHED = new Set(['completed', 'failed', 'killed'])
const IDLE = new Set(['idle', 'waiting'])
const CONTEXT_WINDOW = 1_000_000
const FALLBACK_ROWS = 40
const SESSION_CHROME_ROWS = 6
const MAX_TRANSCRIPT_BYTES = 4 * 1024 * 1024

export const PADDING = 1
export const ARCHIVED_KEY = 'archived-sessions'
export const SESSIONS_MS = 15_000

export const limits = { sessions: 0, agents: 0 }

const titles = new Map<string, string>()

export const layout = (bodyRows: number) => {
  const rows = (bodyRows > 0 ? bodyRows : FALLBACK_ROWS) - 2 * PADDING
  const topRows = Math.floor(rows / 3)
  return { rows, topRows, sessionRows: Math.max(0, topRows - SESSION_CHROME_ROWS) }
}

const session = atom({ plugin: 'picket-session', key: 'session' } as const, {
  agents: [],
  now: 0,
  frame: 0,
} as Session)

const VIEW_DEFAULTS: View = {
  isCompact: false,
  closedGroups: [],
  tab: 'active',
  renamingId: null,
  confirmId: null,
  sessionsOffset: 0,
  agentsOffset: 0,
}

const view = atom({ plugin: 'picket-session', key: 'view' } as const, VIEW_DEFAULTS)

const sessions = atom({ plugin: 'picket-session', key: 'sessions' } as const, {
  entries: [],
  archived: [],
} as Sessions)

export function readSession($: EngineInterface): Promise<Session> {
  return read($, session)
}

export function readSessions($: EngineInterface): Promise<Sessions> {
  return read($, sessions)
}

export function updateSessions($: EngineInterface, change: (current: Sessions) => Sessions): Promise<Sessions> {
  return update($, sessions, change)
}

export async function readView($: EngineInterface): Promise<View> {
  return { ...VIEW_DEFAULTS, ...(await read($, view)) }
}

export function updateView($: EngineInterface, change: (current: View) => View): Promise<View> {
  return update($, view, current => change({ ...VIEW_DEFAULTS, ...current }))
}

export const isFinished = (status: string): boolean => FINISHED.has(status)

export const isIdle = (status: string): boolean => IDLE.has(status)

export const AGENT_GROUPS: { group: AgentGroup; label: string }[] = [
  { group: 'running', label: 'RUNNING' },
  { group: 'idle', label: 'IDLE' },
  { group: 'finished', label: 'FINISHED' },
]

export const groupAgents = (agents: AgentRow[]): Record<AgentGroup, AgentRow[]> => ({
  running: agents.filter(agent => !isFinished(agent.status) && !isIdle(agent.status)),
  idle: agents.filter(agent => isIdle(agent.status)),
  finished: agents.filter(agent => isFinished(agent.status)),
})

export const tally = (grouped: Record<AgentGroup, AgentRow[]>): string =>
  [
    `${grouped.running.length} running`,
    grouped.idle.length > 0 ? `${grouped.idle.length} idle` : null,
    `${grouped.finished.length} done`,
  ]
    .filter(Boolean)
    .join(' · ')

export const contextPercent = (tokens: number): number =>
  Math.round((tokens / CONTEXT_WINDOW) * 100)

export const parseWork = (prompt: string): { workId: string | null; phase: number | null } => {
  const workId = /^work: (\S+)/m.exec(prompt)?.[1] ?? null
  const phase = /^phase: (\d+)/m.exec(prompt)?.[1]
  return { workId, phase: phase === undefined ? null : Number(phase) }
}

export const progressOf = (agent: AgentRow): { label: string; fraction: number; isMeasured: boolean } => {
  const done = isFinished(agent.status)
  const step = agent.tool ?? agent.lastTool
  if (agent.phase !== null && agent.phases !== null) {
    const reached = done ? agent.phase : agent.phase - 0.5
    const label = `${agent.phase}/${agent.phases}${step && !done ? ` · ${step}` : ''}`
    return { label, fraction: reached / agent.phases, isMeasured: true }
  }
  const fill = agent.contextTokens === null ? 0 : agent.contextTokens / CONTEXT_WINDOW
  return {
    label: done ? agent.status : (step ?? 'starting'),
    fraction: done ? 1 : Math.min(1, fill * 10),
    isMeasured: done,
  }
}

export const ordered = (agents: AgentRow[]): AgentRow[] =>
  [...agents].sort((a, b) => b.startedAt - a.startedAt)

export async function configDir($: EngineInterface): Promise<string> {
  const override = await $.env.get('CLAUDE_CONFIG_DIR')
  if (override) {
    return override
  }
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  return `${home}/.claude`
}

type LiveSession = { status: string | null; name: string | null }

async function liveSessions($: EngineInterface, dir: string, root: string) {
  const live = new Map<string, LiveSession>()
  const files = await $.fs.list(`${dir}/sessions`).catch(() => [])
  for (const file of files.filter(entry => entry.name.endsWith('.json'))) {
    try {
      const text = await $.fs.read(`${dir}/sessions/${file.name}`)
      const info = JSON.parse(typeof text === 'string' ? text : '{}') as Record<string, unknown>
      if (typeof info.sessionId === 'string' && info.cwd === root) {
        live.set(info.sessionId, {
          status: typeof info.status === 'string' ? info.status : null,
          name: info.nameSource === 'user' && typeof info.name === 'string' ? info.name : null,
        })
      }
    } catch {
      continue
    }
  }
  return live
}

const TITLE_SCAN = [
  'const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\\n")',
  `const re = ${TITLE_RECORD.toString()}`,
  'console.log(lines.filter(l => re.test(l)).slice(-50).join("\\n"))',
].join(';')

async function readTitleRecords($: EngineInterface, path: string, size: number): Promise<string> {
  if (size <= MAX_TRANSCRIPT_BYTES) {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : ''
  }
  const scan = await $.process.run(['node', '-e', TITLE_SCAN, path])
  return scan.exitCode === 0 ? scan.stdout : ''
}

async function transcriptTitle($: EngineInterface, path: string, id: string, mtimeMs: number, size: number) {
  const cacheKey = `${id}:${mtimeMs}`
  const cached = titles.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  const fallback = `Session ${id.slice(0, 8)}`
  const title = await readTitleRecords($, path, size)
    .then(text => titleOf(text) ?? fallback)
    .catch(() => fallback)
  titles.set(cacheKey, title)
  return title
}

export async function transcriptPath($: EngineInterface, id: string): Promise<string> {
  const [dir, root] = await Promise.all([configDir($), $.session.root()])
  return `${dir}/projects/${projectSlug(root)}/${id}.jsonl`
}

export async function refreshSessions($: EngineInterface) {
  const [dir, root, currentId] = await Promise.all([configDir($), $.session.root(), $.session.id()])
  const folder = `${dir}/projects/${projectSlug(root)}`
  const [files, live, stored] = await Promise.all([
    $.fs.list(folder).catch(() => []),
    liveSessions($, dir, root),
    $.store.get(ARCHIVED_KEY),
  ])
  const entries: SessionEntry[] = []
  for (const file of files.filter(entry => entry.kind === 'file' && entry.name.endsWith('.jsonl'))) {
    const id = file.name.slice(0, -'.jsonl'.length)
    const running = live.get(id)
    entries.push({
      id,
      title: running?.name ?? (await transcriptTitle($, `${folder}/${file.name}`, id, file.mtimeMs, file.size)),
      mtimeMs: file.mtimeMs,
      isLive: running !== undefined,
      status: running?.status ?? null,
      isCurrent: id === currentId,
    })
  }
  const archived = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  await update($, sessions, () => ({ entries, archived }))
}

const patch = (agents: AgentRow[], match: (agent: AgentRow) => boolean, change: Partial<AgentRow>) =>
  agents.map(agent => (match(agent) ? { ...agent, ...change } : agent))

const blankRow = (id: string, type: string, description: string, now: number): AgentRow => ({
  id,
  name: null,
  type,
  description,
  status: 'pending',
  model: null,
  effort: null,
  contextTokens: null,
  tool: null,
  lastTool: null,
  workId: null,
  phase: null,
  phases: null,
  startedAt: now,
  endedAt: null,
})

export const merge = (agents: AgentRow[], infos: AgentInfo[], now: number): AgentRow[] => {
  const known = new Map(agents.map(agent => [agent.id, agent]))
  for (const info of infos) {
    const row = known.get(info.id) ?? blankRow(info.id, info.type, info.description, now)
    const hasEnded = row.endedAt === null && isFinished(info.status)
    const hasRestarted = row.endedAt !== null && !isFinished(info.status)
    known.set(info.id, {
      ...row,
      name: info.name ?? row.name,
      status: info.status,
      tool: isFinished(info.status) ? null : row.tool,
      endedAt: hasEnded ? now : hasRestarted ? null : row.endedAt,
    })
  }
  return [...known.values()]
}

async function phasesOf($: EngineInterface, workId: string): Promise<number | null> {
  const state = await runPicket<StateView>($, ['state', workId])
  return state === null || state.phase_count === 0 ? null : state.phase_count
}

async function workChange($: EngineInterface, text: string): Promise<Partial<AgentRow>> {
  const { workId, phase } = parseWork(text)
  if (workId === null) {
    return {}
  }
  return { workId, phase, phases: await phasesOf($, workId) }
}

export async function tickAgents($: EngineInterface) {
  const [infos, now] = await Promise.all([$.agent.list(), $.clock.now()])
  await update($, session, s => ({ agents: merge(s.agents, infos, now), now, frame: s.frame + 1 }))
}

export async function addSpawned(
  $: EngineInterface,
  spawned: { id: string; type: string; description: string; model: string | null; prompt: string },
) {
  const now = await $.clock.now()
  const row: AgentRow = {
    ...blankRow(spawned.id, spawned.type, spawned.description, now),
    model: spawned.model,
    ...(await workChange($, spawned.prompt)),
  }
  await update($, session, s => ({ ...s, now, agents: [...s.agents.filter(a => a.id !== spawned.id), row] }))
}

export async function applyLeadMessage($: EngineInterface, to: string, text: string) {
  const change = await workChange($, text)
  await update($, session, s => ({
    ...s,
    agents: patch(s.agents, agent => agent.name === to && !isFinished(agent.status), change),
  }))
}

type StepUsage = {
  input_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
  output_tokens: number
}

export async function recordStep(
  $: EngineInterface,
  step: { id: string; model: string; effort: unknown; usage: StepUsage | null },
) {
  const { usage } = step
  await update($, session, s => ({
    ...s,
    agents: s.agents.map(agent =>
      agent.id !== step.id
        ? agent
        : {
            ...agent,
            status: isFinished(agent.status) ? agent.status : 'running',
            model: step.model,
            effort: step.effort === undefined ? agent.effort : String(step.effort),
            contextTokens:
              usage === null
                ? agent.contextTokens
                : usage.input_tokens +
                  usage.cache_read_input_tokens +
                  usage.cache_creation_input_tokens +
                  usage.output_tokens,
          },
    ),
  }))
}

export async function recordTool($: EngineInterface, id: string, change: Partial<AgentRow>) {
  await update($, session, s => ({ ...s, agents: patch(s.agents, a => a.id === id, change) }))
}
