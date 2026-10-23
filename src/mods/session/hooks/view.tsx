import type { EngineInterface, RenderInput } from 'claude-code'

import { clock, compactTokens, prettyModel, roleOf } from '../../../lib/shared/format.mts'
import { ROLE_TONES, SURFACES, TONES } from '../../shared/theme'
import type { AgentGroup, AgentRow, Session, SessionEntry, View } from '../types'
import {
  askDelete,
  cancelDelete,
  deleteSession,
  rename,
  selectTab,
  startRename,
  switchTo,
  toggleArchived,
  toggleCompact,
  toggleGroup,
} from './actions'
import {
  AGENT_GROUPS,
  contextPercent,
  groupAgents,
  isFinished,
  layout,
  limits,
  ordered,
  PADDING,
  progressOf,
  readSession,
  readSessions,
  readView,
  tally,
} from './data'
import { age, clampOffset, visible, windowLabel } from './sessions'
import { sprite, SPRITE_COLUMNS, SPRITE_ROWS } from './sprite'

const TITLE_INDENT = 2
const CARD_ROWS = 7
const LABEL_ROWS = 2

const roleTone = (type: string): string => ROLE_TONES[roleOf(type)] ?? TONES.muted

type PaneInput = RenderInput<'Pane'>

type Pane = {
  ui: ReturnType<EngineInterface['ui']['resolve']>
  s: Session
  v: View
  width: number
  contentWidth: number
  lineWidth: number
}

const fit = (text: string, room: number) => (text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`)

function statusMark({ ui: { Text } }: Pane, agent: AgentRow) {
  if (agent.status === 'completed') return <Text color={TONES.success}>✓</Text>
  if (agent.status === 'failed') return <Text color={TONES.error}>✗</Text>
  if (agent.status === 'killed') return <Text color={TONES.muted}>■</Text>
  if (agent.status === 'idle' || agent.status === 'waiting') return <Text color={TONES.warning}>○</Text>
  return <Text color={roleTone(agent.type)}>●</Text>
}

function compactCard(pane: Pane, agent: AgentRow) {
  const { Box, Text } = pane.ui
  return (
    <Box key={agent.id} justifyContent="space-between" width={pane.width - 1}>
      <Box>
        {statusMark(pane, agent)}
        <Text> </Text>
        <Text wrap="truncate-end">
          <Text color={roleTone(agent.type)}>{agent.name ?? roleOf(agent.type)}</Text>
          <Text> </Text>
          <Text dimColor={isFinished(agent.status)}>{agent.description}</Text>
        </Text>
      </Box>
      <Box marginLeft={1} flexShrink={0}>
        <Text dimColor>{clock((agent.endedAt ?? pane.s.now) - agent.startedAt)}</Text>
      </Box>
    </Box>
  )
}

function fullCard(pane: Pane, agent: AgentRow) {
  const { Box, Text } = pane.ui
  const Raster = 'Raster' in pane.ui ? pane.ui.Raster : null
  const { contentWidth } = pane
  const done = isFinished(agent.status)
  const color = roleTone(agent.type)
  const progress = progressOf(agent)
  const filled = Math.round(progress.fraction * contentWidth)
  const tokens = agent.contextTokens
  const meters = [
    tokens === null ? null : `ctx ${contextPercent(tokens)}% · ${compactTokens(tokens)}`,
    clock((agent.endedAt ?? pane.s.now) - agent.startedAt),
  ]
    .filter(Boolean)
    .join(' ')
  const subtitle = [agent.model ? prettyModel(agent.model) : null, agent.effort].filter(Boolean).join(' · ')

  return (
    <Box key={agent.id} flexDirection="row" marginTop={1}>
      {Raster && (
        <Box marginRight={1}>
          <Raster
            key={`sprite-${agent.id}`}
            columns={SPRITE_COLUMNS}
            rows={SPRITE_ROWS}
            cells={sprite(agent.type, pane.s.frame, done)}
          />
        </Box>
      )}
      <Box flexDirection="column" width={contentWidth} justifyContent="center">
        <Box justifyContent="space-between" width={contentWidth}>
          <Text bold={!done} dimColor={done} wrap="truncate-end">
            {agent.description}
          </Text>
          <Box marginLeft={1}>{statusMark(pane, agent)}</Box>
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
          <Text color={progress.isMeasured || !done ? color : TONES.muted} dimColor={done}>
            {'━'.repeat(filled)}
          </Text>
          <Text color={TONES.muted}>{'━'.repeat(Math.max(0, contentWidth - filled))}</Text>
        </Text>
      </Box>
    </Box>
  )
}

function agentItems($: EngineInterface, pane: Pane, grouped: Record<AgentGroup, AgentRow[]>) {
  const { Box, Button, Text } = pane.ui
  const cardRows = pane.v.isCompact ? 1 : CARD_ROWS
  return AGENT_GROUPS.flatMap(({ group, label }) => {
    const members = grouped[group]
    if (members.length === 0) {
      return []
    }
    const isOpen = !pane.v.closedGroups.includes(group)
    const header = (
      <Box key={`${group}-label`} marginTop={1}>
        <Button key={`group-${group}`} plain onPress={() => toggleGroup($, group)}>
          <Text dimColor>
            {isOpen ? '▾' : '▸'} {label} · {String(members.length)}
          </Text>
        </Button>
      </Box>
    )
    const card = (agent: AgentRow) => (pane.v.isCompact ? compactCard(pane, agent) : fullCard(pane, agent))
    const cards = isOpen ? members.map(agent => ({ rows: cardRows, node: card(agent) })) : []
    return [{ rows: LABEL_ROWS, node: header }, ...cards]
  })
}

function tabButton($: EngineInterface, pane: Pane, key: View['tab'], label: string) {
  const { Button, Text } = pane.ui
  const isSelected = pane.v.tab === key
  return (
    <Button key={`tab-${key}`} plain onPress={() => selectTab($, key)}>
      <Text backgroundColor={isSelected ? SURFACES.row : undefined} bold={isSelected} dimColor={!isSelected}>
        {` ${label} `}
      </Text>
    </Button>
  )
}

function rowActions($: EngineInterface, pane: Pane, entry: SessionEntry) {
  const { Box, Button, Text } = pane.ui
  if (pane.v.tab === 'archived') {
    return (
      <Box>
        <Button key={`restore-${entry.id}`} plain label="↺" onPress={() => toggleArchived($, entry.id)} />
        <Text> </Text>
        <Button key={`ask-delete-${entry.id}`} plain onPress={() => askDelete($, entry.id)}>
          <Text color={TONES.error}>⊘</Text>
        </Button>
      </Box>
    )
  }
  return (
    <Box>
      <Button key={`rename-button-${entry.id}`} plain label="✎" onPress={() => startRename($, entry.id)} />
      <Text> </Text>
      {entry.isCurrent ? (
        <Text> </Text>
      ) : (
        <Button key={`archive-${entry.id}`} plain label="×" onPress={() => toggleArchived($, entry.id)} />
      )}
    </Box>
  )
}

function confirmRow($: EngineInterface, pane: Pane, entry: SessionEntry) {
  const { Box, Button, Text } = pane.ui
  return (
    <Box key={`confirm-${entry.id}`} justifyContent="space-between" width={pane.lineWidth}>
      <Text color={TONES.error} wrap="truncate-end">
        Delete "{fit(entry.title, 18)}" for good?
      </Text>
      <Box>
        <Button key={`delete-${entry.id}`} plain onPress={() => void deleteSession($, entry)}>
          <Text color={TONES.error} bold>
            Delete
          </Text>
        </Button>
        <Text> </Text>
        <Button key={`cancel-${entry.id}`} plain onPress={() => cancelDelete($)}>
          <Text dimColor>Cancel</Text>
        </Button>
      </Box>
    </Box>
  )
}

function sessionRow($: EngineInterface, pane: Pane, entry: SessionEntry) {
  const { lineWidth } = pane
  const { Box, Button, Text } = pane.ui
  const Input = 'Input' in pane.ui ? pane.ui.Input : null
  if (pane.v.confirmId === entry.id) {
    return confirmRow($, pane, entry)
  }
  if (Input && pane.v.renamingId === entry.id) {
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
      backgroundColor={entry.isCurrent ? SURFACES.row : undefined}
    >
      <Button key={`open-${entry.id}`} plain onPress={() => switchTo($, entry)}>
        <Text color={entry.isCurrent ? TONES.success : TONES.warning}>{entry.isLive || entry.isCurrent ? '●' : ' '}</Text>
        <Text> </Text>
        <Text bold={entry.isCurrent}>{fit(entry.title, lineWidth - 12)}</Text>
      </Button>
      <Box>
        <Text dimColor>{entry.isCurrent ? 'now' : age(pane.s.now - entry.mtimeMs)} </Text>
        {rowActions($, pane, entry)}
      </Box>
    </Box>
  )
}

export async function renderPane($: EngineInterface, e: PaneInput) {
  const ui = $.ui.resolve(e)
  const { Box, Button, Text } = ui
  const s = await readSession($)
  const v = await readView($)
  const all = ordered(s.agents)
  const grouped = groupAgents(all)
  const width = Math.max(20, e.props.bodyColumns - 2 * PADDING)
  const contentWidth = Math.max(12, width - ('Raster' in ui ? SPRITE_COLUMNS + 1 : 0) - 1)
  const lineWidth = width - 1
  const pane: Pane = { ui, s, v, width, contentWidth, lineWidth }

  const { rows, topRows, sessionRows } = layout(e.props.scroll.bodyRows)
  const known = await readSessions($)
  const shown = visible(known.entries, known.archived, v.tab)
  limits.sessions = Math.max(0, shown.length - sessionRows)
  const sessionsOffset = clampOffset(v.sessionsOffset, shown.length, sessionRows)
  const sessionWindow = shown.slice(sessionsOffset, sessionsOffset + sessionRows)
  const items = agentItems($, pane, grouped)
  limits.agents = Math.max(0, items.length - 1)
  const agentsOffset = Math.min(v.agentsOffset, limits.agents)
  const agentsOverflow = items.slice(agentsOffset).reduce((sum, item) => sum + item.rows, 0) > rows - topRows - 1
  const archivedCount = known.entries.filter(entry => known.archived.includes(entry.id)).length
  const activeCount = known.entries.length - archivedCount

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
            {tabButton($, pane, 'active', `Active · ${activeCount}`)}
            <Text> </Text>
            {tabButton($, pane, 'archived', `Archived · ${archivedCount}`)}
          </Box>
          <Text dimColor>{windowLabel(sessionsOffset, sessionWindow.length, shown.length)}</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {shown.length === 0 && <Text dimColor>No sessions here.</Text>}
          {sessionWindow.map(entry => sessionRow($, pane, entry))}
        </Box>
        <Box flexGrow={1} />
        <Text color={TONES.rule}>{'─'.repeat(lineWidth)}</Text>
      </Box>
      <Box key="agents" flexDirection="column" height={rows - topRows} overflow="hidden">
        <Box justifyContent="space-between" width={lineWidth}>
          <Text dimColor bold>
            ▾ AGENTS
          </Text>
          <Box>
            <Text dimColor>{`${agentsOffset > 0 || agentsOverflow ? '↕ ' : ''}${tally(grouped)}  `}</Text>
            <Button key="collapse" plain onPress={() => toggleCompact($)}>
              <Text dimColor>{v.isCompact ? 'Expand' : 'Collapse'}</Text>
            </Button>
          </Box>
        </Box>
        {all.length === 0 && <Text dimColor>No agents yet.</Text>}
        {items.slice(agentsOffset).map(item => item.node)}
      </Box>
    </Box>
  )
}
