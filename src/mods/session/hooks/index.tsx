import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import { clock, compactTokens, prettyModel, roleOf } from '../../../lib/shared/format.mts'
import type { StateView } from '../../../lib/shared/views.mts'
import { resetLaunchers, runPicket } from '../../shared/kernel'
import type { AgentGroup, AgentRow, Session, SessionEntry, Sessions, View } from '../types'
import { age, clampOffset, projectSlug, TITLE_RECORD, titleOf, visible, windowLabel } from './sessions'
import {
  AGENT_GROUPS,
  contextPercent,
  groupAgents,
  isFinished,
  ordered,
  parseWork,
  progressOf,
  roleColor,
  sprite,
  SPRITE_COLUMNS,
  SPRITE_ROWS,
  tally,
} from './format'

const PANE = 'picket-session'
const TITLE = 'Agents'
const PADDING = 1
const TITLE_INDENT = 2
const PANE_COLUMNS = 48 + 2 * PADDING
const TICK_MS = 1000
const UNMEASURED_BAR = '#3a3f47'
const FALLBACK_ROWS = 40
const SESSION_CHROME_ROWS = 6
const CARD_ROWS = 7
const LABEL_ROWS = 2

const layout = (bodyRows: number) => {
  const rows = (bodyRows > 0 ? bodyRows : FALLBACK_ROWS) - 2 * PADDING
  const topRows = Math.floor(rows / 3)
  return { rows, topRows, sessionRows: Math.max(0, topRows - SESSION_CHROME_ROWS) }
}

const limits = { sessions: 0, agents: 0 }
const TAB_BACKGROUND = '#1f2630'
const CURRENT_BACKGROUND = '#161b22'
const CONFIRM_BACKGROUND = '#2d1517'
const DELETE_TEXT = '#ffa198'
const DIVIDER = '#30363d'

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

const readView = async ($: EngineInterface): Promise<View> => ({ ...VIEW_DEFAULTS, ...(await read($, view)) })

const updateView = ($: EngineInterface, change: (current: View) => View): Promise<View> =>
  update($, view, current => change({ ...VIEW_DEFAULTS, ...current }))

const sessions = atom({ plugin: 'picket-session', key: 'sessions' } as const, {
  entries: [],
  archived: [],
} as Sessions)

const ARCHIVED_KEY = 'archived-sessions'
const SESSIONS_MS = 15_000
const MAX_TRANSCRIPT_BYTES = 4 * 1024 * 1024
const titles = new Map<string, string>()

const configDir = async ($: EngineInterface): Promise<string> => {
  const override = await $.env.get('CLAUDE_CONFIG_DIR')
  if (override) {
    return override
  }
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  return `${home}/.claude`
}

type LiveSession = { status: string | null; name: string | null }

const liveSessions = async ($: EngineInterface, dir: string, root: string) => {
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

const readTitleRecords = async ($: EngineInterface, path: string, size: number): Promise<string> => {
  if (size <= MAX_TRANSCRIPT_BYTES) {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : ''
  }
  const scan = await $.process.run(['node', '-e', TITLE_SCAN, path])
  return scan.exitCode === 0 ? scan.stdout : ''
}

const transcriptTitle = async ($: EngineInterface, path: string, id: string, mtimeMs: number, size: number) => {
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

const refreshSessions = async ($: EngineInterface) => {
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

const toggleArchived = async ($: EngineInterface, id: string) => {
  const current = await read($, sessions)
  const archived = current.archived.includes(id)
    ? current.archived.filter(one => one !== id)
    : [...current.archived, id]
  await $.store.set(ARCHIVED_KEY, archived)
  await update($, sessions, s => ({ ...s, archived }))
}

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const deleteSession = async ($: EngineInterface, entry: SessionEntry) => {
  await updateView($, current => ({ ...current, confirmId: null }))
  if (entry.isCurrent || entry.isLive || !SESSION_ID.test(entry.id)) {
    $.ui.toast('Only a closed session can be deleted.')
    return
  }
  const [dir, root] = await Promise.all([configDir($), $.session.root()])
  const path = `${dir}/projects/${projectSlug(root)}/${entry.id}.jsonl`
  const removed = await $.process
    .run(['node', '-e', 'require("fs").unlinkSync(process.argv[1])', path])
    .catch(() => ({ exitCode: 1 }))
  if (removed.exitCode !== 0) {
    $.ui.toast(`Could not delete "${entry.title}".`)
    return
  }
  const archived = (await read($, sessions)).archived.filter(id => id !== entry.id)
  await $.store.set(ARCHIVED_KEY, archived)
  await update($, sessions, current => ({
    entries: current.entries.filter(one => one.id !== entry.id),
    archived,
  }))
}

const switchTo = async ($: EngineInterface, entry: SessionEntry) => {
  if (entry.isCurrent) {
    $.ui.toast('This is the current session.')
    return
  }
  try {
    await $.command.run({ command: 'resume', args: entry.id })
  } catch {
    await $.prompt.fill({ text: `/resume ${entry.id}` })
    $.ui.toast(`Could not switch directly; press Enter to switch to "${entry.title}".`)
  }
}

const appendName = async ($: EngineInterface, path: string, id: string, name: string) => {
  const text = await $.fs.read(path)
  if (typeof text !== 'string') {
    throw new Error('unreadable transcript')
  }
  const record = JSON.stringify({ type: 'agent-name', agentName: name, sessionId: id })
  await $.fs.write(path, `${text}${text.endsWith('\n') ? '' : '\n'}${record}\n`)
}

const rename = async ($: EngineInterface, entry: SessionEntry, value: string) => {
  const name = value.trim()
  await updateView($, current => ({ ...current, renamingId: null }))
  if (name === '' || name === entry.title) {
    return
  }
  try {
    if (entry.isCurrent) {
      await $.command.run({ command: 'rename', args: name })
    } else if (entry.isLive) {
      $.ui.toast('That session is open in another window; rename it there.')
      return
    } else {
      const [dir, root] = await Promise.all([configDir($), $.session.root()])
      await appendName($, `${dir}/projects/${projectSlug(root)}/${entry.id}.jsonl`, entry.id, name)
    }
    await update($, sessions, s => ({
      ...s,
      entries: s.entries.map(one => (one.id === entry.id ? { ...one, title: name } : one)),
    }))
  } catch {
    $.ui.toast(`Could not rename "${entry.title}".`)
  }
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

const merge = (agents: AgentRow[], infos: AgentInfo[], now: number): AgentRow[] => {
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

const phasesOf = async ($: EngineInterface, workId: string): Promise<number | null> => {
  const state = await runPicket<StateView>($, ['state', workId])
  return state === null || state.phase_count === 0 ? null : state.phase_count
}

const workChange = async ($: EngineInterface, text: string): Promise<Partial<AgentRow>> => {
  const { workId, phase } = parseWork(text)
  if (workId === null) {
    return {}
  }
  return { workId, phase, phases: await phasesOf($, workId) }
}

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    resetLaunchers()
    await $.command.register({ name: 'picket-session', description: 'Show or hide the agents sidebar' })
    void openPane($)
    $.clock.every(TICK_MS, async () => {
      const [infos, now] = await Promise.all([$.agent.list(), $.clock.now()])
      await update($, session, s => ({ agents: merge(s.agents, infos, now), now, frame: s.frame + 1 }))
    })
    void refreshSessions($)
    $.clock.every(SESSIONS_MS, () => void refreshSessions($))
    return started
  })

  on('command.run', { command: 'picket-session' }, async $ => {
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Agents sidebar closed.' }
    }
    await openPane($)
    return { text: 'Agents sidebar opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    const id = result.agentId
    if (id !== undefined) {
      const now = await $.clock.now()
      const row: AgentRow = {
        ...blankRow(id, e.subagentType, e.description, now),
        model: result.model ?? null,
        ...(await workChange($, e.prompt)),
      }
      await update($, session, s => ({ ...s, now, agents: [...s.agents.filter(a => a.id !== id), row] }))
    }
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    const text = typeof e.message === 'string' ? e.message : ''
    if (e.agentId === undefined && text !== '') {
      const change = await workChange($, text)
      await update($, session, s => ({
        ...s,
        agents: patch(s.agents, agent => agent.name === e.to && !isFinished(agent.status), change),
      }))
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const id = e.agentId
    const usage = result.usage
    if (id !== undefined) {
      await update($, session, s => ({
        ...s,
        agents: s.agents.map(agent =>
          agent.id !== id
            ? agent
            : {
                ...agent,
                status: isFinished(agent.status) ? agent.status : 'running',
                model: e.model,
                effort: e.effort === undefined ? agent.effort : String(e.effort),
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
    return result
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id === undefined) {
      return next(e)
    }
    await update($, session, s => ({ ...s, agents: patch(s.agents, a => a.id === id, { tool: e.tool }) }))
    const ran = await next(e)
    await update($, session, s => ({
      ...s,
      agents: patch(s.agents, a => a.id === id, { tool: null, lastTool: e.tool }),
    }))
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { topRows } = layout(e.bodyRows)
    const row = e.pointer?.row
    const isOverSessions = row !== undefined && row < PADDING + topRows
    await updateView($, current =>
      isOverSessions
        ? { ...current, sessionsOffset: Math.max(0, Math.min(current.sessionsOffset + e.by, limits.sessions)) }
        : { ...current, agentsOffset: Math.max(0, Math.min(current.agentsOffset + e.by, limits.agents)) },
    )
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    const Input = 'Input' in elements ? elements.Input : null
    const Raster = 'Raster' in elements ? elements.Raster : null
    const s = await read($, session)
    const v = await readView($)
    const all = ordered(s.agents)
    const grouped = groupAgents(all)
    const width = Math.max(20, e.props.bodyColumns - 2 * PADDING)
    const contentWidth = Math.max(12, width - (Raster ? SPRITE_COLUMNS + 1 : 0) - 1)

    const statusMark = (agent: AgentRow) => {
      if (agent.status === 'completed') return <Text color="success">✓</Text>
      if (agent.status === 'failed') return <Text color="error">✗</Text>
      if (agent.status === 'killed') return <Text color="inactive">■</Text>
      if (agent.status === 'idle' || agent.status === 'waiting') return <Text color="warning">○</Text>
      return <Text color={roleColor(agent.type)}>●</Text>
    }

    const card = (agent: AgentRow) => {
      const done = isFinished(agent.status)
      const color = roleColor(agent.type)
      const progress = progressOf(agent)
      const filled = Math.round(progress.fraction * contentWidth)
      const tokens = agent.contextTokens
      const meters = [
        tokens === null ? null : `ctx ${contextPercent(tokens)}% · ${compactTokens(tokens)}`,
        clock((agent.endedAt ?? s.now) - agent.startedAt),
      ]
        .filter(Boolean)
        .join(' ')
      const subtitle = [agent.model ? prettyModel(agent.model) : null, agent.effort]
        .filter(Boolean)
        .join(' · ')

      if (v.isCompact) {
        return (
          <Box key={agent.id} justifyContent="space-between" width={width - 1}>
            <Box>
              {statusMark(agent)}
              <Text> </Text>
              <Text wrap="truncate-end">
                <Text color={color}>{agent.name ?? roleOf(agent.type)}</Text>
                <Text> </Text>
                <Text dimColor={done}>{agent.description}</Text>
              </Text>
            </Box>
            <Box marginLeft={1} flexShrink={0}>
              <Text dimColor>{clock((agent.endedAt ?? s.now) - agent.startedAt)}</Text>
            </Box>
          </Box>
        )
      }

      return (
        <Box key={agent.id} flexDirection="row" marginTop={1}>
          {Raster && (
            <Box marginRight={1}>
              <Raster
                key={`sprite-${agent.id}`}
                columns={SPRITE_COLUMNS}
                rows={SPRITE_ROWS}
                cells={sprite(agent.type, s.frame, done)}
              />
            </Box>
          )}
          <Box flexDirection="column" width={contentWidth} justifyContent="center">
            <Box justifyContent="space-between" width={contentWidth}>
              <Text bold={!done} dimColor={done} wrap="truncate-end">
                {agent.description}
              </Text>
              <Box marginLeft={1}>{statusMark(agent)}</Box>
            </Box>
            <Text wrap="truncate-end">
              <Text color={color}>{agent.name ?? roleOf(agent.type)}</Text>
              {subtitle !== '' && <Text dimColor> {subtitle}</Text>}
            </Text>
            <Box justifyContent="space-between" width={contentWidth}>
              <Text dimColor={done} wrap="truncate-end">
                {progress.label}
              </Text>
              <Box marginLeft={1}>
                <Text dimColor>{meters}</Text>
              </Box>
            </Box>
            <Text>
              <Text color={progress.isMeasured || !done ? color : UNMEASURED_BAR} dimColor={done}>
                {'━'.repeat(filled)}
              </Text>
              <Text color={UNMEASURED_BAR}>{'━'.repeat(Math.max(0, contentWidth - filled))}</Text>
            </Text>
          </Box>
        </Box>
      )
    }

    const { rows, topRows, sessionRows } = layout(e.props.scroll.bodyRows)
    const known = await read($, sessions)
    const shown = visible(known.entries, known.archived, v.tab)
    limits.sessions = Math.max(0, shown.length - sessionRows)
    const sessionsOffset = clampOffset(v.sessionsOffset, shown.length, sessionRows)
    const sessionWindow = shown.slice(sessionsOffset, sessionsOffset + sessionRows)
    const cardRows = v.isCompact ? 1 : CARD_ROWS
    const toggleGroup = (group: AgentGroup) =>
      updateView($, current => ({
        ...current,
        closedGroups: current.closedGroups.includes(group)
          ? current.closedGroups.filter(one => one !== group)
          : [...current.closedGroups, group],
      }))
    const agentItems = AGENT_GROUPS.flatMap(({ group, label }) => {
      const members = grouped[group]
      if (members.length === 0) {
        return []
      }
      const isOpen = !v.closedGroups.includes(group)
      const header = (
        <Box key={`${group}-label`} marginTop={1}>
          <Button key={`group-${group}`} plain onPress={() => toggleGroup(group)}>
            <Text dimColor>
              {isOpen ? '▾' : '▸'} {label} · {String(members.length)}
            </Text>
          </Button>
        </Box>
      )
      const cards = isOpen ? members.map(agent => ({ rows: cardRows, node: card(agent) })) : []
      return [{ rows: LABEL_ROWS, node: header }, ...cards]
    })
    limits.agents = Math.max(0, agentItems.length - 1)
    const agentsOffset = Math.min(v.agentsOffset, limits.agents)
    const agentsOverflow =
      agentItems.slice(agentsOffset).reduce((sum, item) => sum + item.rows, 0) > rows - topRows - 1
    const archivedCount = known.entries.filter(entry => known.archived.includes(entry.id)).length
    const activeCount = known.entries.length - archivedCount
    const lineWidth = width - 1
    const fit = (text: string, room: number) =>
      text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`

    const tab = (key: 'active' | 'archived', label: string) => (
      <Button
        key={`tab-${key}`}
        plain
        onPress={() => updateView($, current => ({ ...current, tab: key, confirmId: null }))}
      >
        <Text backgroundColor={v.tab === key ? TAB_BACKGROUND : undefined} bold={v.tab === key} dimColor={v.tab !== key}>
          {` ${label} `}
        </Text>
      </Button>
    )

    const rowActions = (entry: SessionEntry) =>
      v.tab === 'archived' ? (
        <Box>
          <Button key={`restore-${entry.id}`} plain label="↺" onPress={() => toggleArchived($, entry.id)} />
          <Text> </Text>
          <Button
            key={`ask-delete-${entry.id}`}
            plain
            onPress={() => updateView($, current => ({ ...current, confirmId: entry.id }))}
          >
            <Text color="error">⊘</Text>
          </Button>
        </Box>
      ) : (
        <Box>
          <Button
            key={`rename-button-${entry.id}`}
            plain
            label="✎"
            onPress={() => updateView($, current => ({ ...current, renamingId: entry.id }))}
          />
          <Text> </Text>
          {entry.isCurrent ? (
            <Text> </Text>
          ) : (
            <Button key={`archive-${entry.id}`} plain label="×" onPress={() => toggleArchived($, entry.id)} />
          )}
        </Box>
      )

    const sessionRow = (entry: SessionEntry) => {
      if (v.confirmId === entry.id) {
        return (
          <Box
            key={`confirm-${entry.id}`}
            justifyContent="space-between"
            width={lineWidth}
            backgroundColor={CONFIRM_BACKGROUND}
          >
            <Text color={DELETE_TEXT} wrap="truncate-end">
              Delete "{fit(entry.title, 18)}" for good?
            </Text>
            <Box>
              <Button key={`delete-${entry.id}`} plain onPress={() => void deleteSession($, entry)}>
                <Text color="error" bold>
                  Delete
                </Text>
              </Button>
              <Text> </Text>
              <Button
                key={`cancel-${entry.id}`}
                plain
                onPress={() => updateView($, current => ({ ...current, confirmId: null }))}
              >
                <Text dimColor>Cancel</Text>
              </Button>
            </Box>
          </Box>
        )
      }
      if (Input && v.renamingId === entry.id) {
        return (
          <Box key={`rename-row-${entry.id}`} width={lineWidth} paddingLeft={TITLE_INDENT}>
            <Input
              key={`rename-${entry.id}`}
              value={entry.title}
              placeholder="New name, empty to cancel"
              submitLabel="Rename"
              autoFocus
              onSubmit={(value: string) => void rename($, entry, value)}
            />
          </Box>
        )
      }
      return (
        <Box
          key={`row-${entry.id}`}
          justifyContent="space-between"
          width={lineWidth}
          backgroundColor={entry.isCurrent ? CURRENT_BACKGROUND : undefined}
        >
          <Button key={`open-${entry.id}`} plain onPress={() => switchTo($, entry)}>
            <Text color={entry.isCurrent ? 'success' : 'warning'}>
              {entry.isLive || entry.isCurrent ? '●' : ' '}
            </Text>
            <Text> </Text>
            <Text bold={entry.isCurrent}>{fit(entry.title, lineWidth - 12)}</Text>
          </Button>
          <Box>
            <Text dimColor>{entry.isCurrent ? 'now' : age(s.now - entry.mtimeMs)} </Text>
            {rowActions(entry)}
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" paddingX={PADDING} paddingY={PADDING}>
        <Box key="top" flexDirection="column" height={topRows} overflow="hidden">
          <Box justifyContent="space-between" width={lineWidth}>
            <Text dimColor bold>
              ▾ SESSIONS
            </Text>
            <Button key="new-session" plain onPress={() => void $.prompt.fill({ text: '/clear' })}>
              <Text dimColor>+ New</Text>
            </Button>
          </Box>
          <Box marginTop={1} justifyContent="space-between" width={lineWidth}>
            <Box>
              {tab('active', `Active · ${activeCount}`)}
              <Text> </Text>
              {tab('archived', `Archived · ${archivedCount}`)}
            </Box>
            <Text dimColor>{windowLabel(sessionsOffset, sessionWindow.length, shown.length)}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            {shown.length === 0 && <Text dimColor>No sessions here.</Text>}
            {sessionWindow.map(sessionRow)}
          </Box>
          <Box flexGrow={1} />
          <Text color={DIVIDER}>{'─'.repeat(lineWidth)}</Text>
        </Box>
        <Box key="agents" flexDirection="column" height={rows - topRows} overflow="hidden">
          <Box justifyContent="space-between" width={lineWidth}>
            <Text dimColor bold>
              ▾ AGENTS
            </Text>
            <Box>
              <Text dimColor>{`${agentsOffset > 0 || agentsOverflow ? '↕ ' : ''}${tally(grouped)}  `}</Text>
              <Button
                key="collapse"
                plain
                onPress={() => updateView($, current => ({ ...current, isCompact: !current.isCompact }))}
              >
                <Text dimColor>{v.isCompact ? 'Expand' : 'Collapse'}</Text>
              </Button>
            </Box>
          </Box>
          {all.length === 0 && <Text dimColor>No agents yet.</Text>}
          {agentItems.slice(agentsOffset).map(item => item.node)}
        </Box>
      </Box>
    )
  })
}
