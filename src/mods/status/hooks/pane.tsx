import type { EngineInterface, RenderInput } from 'claude-code'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { PANE_PADDING, SURFACES, TONES } from '../../shared/theme'
import type { CleanupWorktree, GroupedSession, PaneTab, PaneView, SessionEntry } from '../types'
import {
  askDelete,
  back,
  cancelDelete,
  confirmDelete,
  copyRemoveCommand,
  copyResume,
  DELETE_ALL,
  deleteAll,
  markDone,
  readDone,
  readPaneView,
  readRows,
  readSessions,
  select,
  selectTab,
  startRename,
  submitRename,
} from './pane-actions'
import { age, windowLabel } from './sessions'
import { cleanupOf, groupSessions, type GroupedPane } from './work-pane'

const CHROME_ROWS = 4
const ACTION_COLUMNS = 14

export const paneLimit = { maxOffset: 0 }

type Ui = ReturnType<EngineInterface['ui']['resolve']>

type Pane = { ui: Ui; view: PaneView; now: number; lineWidth: number }

type Drawn = { rows: number; node: JSX.Element }

const fit = (text: string, room: number) => (text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`)

const ATTENTION_LABELS: Record<ListRowView['attention'], string> = {
  'needs-you': 'needs you',
  working: 'working',
  open: 'open',
  closed: 'closed',
}

function peekLines(pane: Pane, session: GroupedSession): Drawn[] {
  const { Box, Text } = pane.ui
  const line = (item: ListRowView, isGreyed: boolean): Drawn => ({
    rows: 2,
    node: (
      <Box key={`peek-${session.entry.id}-${item.id}`} flexDirection="column" paddingLeft={2} width={pane.lineWidth}>
        <Text dimColor={isGreyed} bold={!isGreyed} wrap="truncate-end">
          {item.title}
        </Text>
        <Text dimColor wrap="truncate-end">
          {[item.lane, ATTENTION_LABELS[item.attention], item.phases, item.branch ?? 'no branch'].join(' · ')}
        </Text>
      </Box>
    ),
  })
  const lines = [...session.items.map(item => line(item, false)), ...session.greyed.map(item => line(item, true))]
  if (lines.length > 0) return lines
  return [{ rows: 1, node: <Text key={`peek-${session.entry.id}-none`} dimColor>{'  No work item in this session.'}</Text> }]
}

function rowActions($: EngineInterface, pane: Pane, session: GroupedSession) {
  const { Box, Button, Text } = pane.ui
  const { id } = session.entry
  return (
    <Box>
      <Button key={`rename-${id}`} plain label="✎" onPress={() => startRename($, id)} />
      <Text> </Text>
      <Button key={`copy-${id}`} plain label="⧉" onPress={copyResume($, id)} />
      <Text> </Text>
      {pane.view.tab === 'done' ? (
        <Box>
          <Button key={`back-${id}`} plain label="↺" onPress={() => back($, id)} />
          <Text> </Text>
          {deleteButton($, pane, id)}
        </Box>
      ) : (
        <Button key={`done-${id}`} plain label="✓" onPress={() => markDone($, id)} />
      )}
    </Box>
  )
}

function deleteButton($: EngineInterface, pane: Pane, id: string) {
  const { Button, Text } = pane.ui
  return (
    <Button key={`ask-delete-${id}`} plain onPress={() => askDelete($, id)}>
      <Text color={TONES.error}>⊘</Text>
    </Button>
  )
}

function confirmLines($: EngineInterface, pane: Pane, key: string, question: string, onDelete: () => void): Drawn[] {
  const { Box, Button, Text } = pane.ui
  return [
    {
      rows: 2,
      node: (
        <Box key={`confirm-${key}`} flexDirection="column" width={pane.lineWidth}>
          <Text color={TONES.error} wrap="truncate-end">
            {question}
          </Text>
          <Box>
            <Button key={`delete-${key}`} plain onPress={onDelete}>
              <Text color={TONES.error} bold>
                Delete
              </Text>
            </Button>
            <Text> </Text>
            <Button key={`cancel-${key}`} plain onPress={() => cancelDelete($)}>
              <Text dimColor>Cancel</Text>
            </Button>
          </Box>
        </Box>
      ),
    },
  ]
}

function sessionLines($: EngineInterface, pane: Pane, session: GroupedSession): Drawn[] {
  const { Box, Button, Text } = pane.ui
  const Input = 'Input' in pane.ui ? pane.ui.Input : null
  const { entry } = session
  if (pane.view.confirm === entry.id) {
    return confirmLines($, pane, entry.id, `Delete "${fit(entry.title, 24)}" (${entry.id}) for good?`, () => void confirmDelete($, entry))
  }
  if (Input && pane.view.renamingId === entry.id) {
    return [
      {
        rows: 1,
        node: (
          <Box key={`rename-row-${entry.id}`} width={pane.lineWidth} paddingLeft={2}>
            <Input
              key={`rename-input-${entry.id}`}
              value={entry.title}
              placeholder="New name, empty to cancel"
              submitLabel="Rename"
              autoFocus
              onSubmit={(value: string) => void submitRename($, entry, value)}
            />
          </Box>
        ),
      },
    ]
  }
  const row: Drawn = {
    rows: 1,
    node: (
      <Box key={`row-${entry.id}`} justifyContent="space-between" width={pane.lineWidth} backgroundColor={entry.isCurrent ? SURFACES.row : undefined}>
        <Button key={`peek-${entry.id}`} plain onPress={() => select($, entry.id)}>
          <Text color={entry.isCurrent ? TONES.success : TONES.warning}>{entry.isLive || entry.isCurrent ? '●' : ' '}</Text>
          <Text> </Text>
          <Text bold={entry.isCurrent}>{fit(entry.title, pane.lineWidth - ACTION_COLUMNS)}</Text>
        </Button>
        <Box>
          <Text dimColor>{entry.isCurrent ? 'now' : age(pane.now - entry.mtimeMs)} </Text>
          {rowActions($, pane, session)}
        </Box>
      </Box>
    ),
  }
  return pane.view.selectedId === entry.id ? [row, ...peekLines(pane, session)] : [row]
}

function groupHeader(pane: Pane, label: string, count: number): Drawn {
  const { Box, Text } = pane.ui
  return {
    rows: 2,
    node: (
      <Box key={`group-${label}`} marginTop={1}>
        <Text dimColor bold>{`${label} · ${count}`}</Text>
      </Box>
    ),
  }
}

function activeLines($: EngineInterface, pane: Pane, grouped: GroupedPane): Drawn[] {
  return grouped.active.flatMap(list => [groupHeader(pane, list.label, list.sessions.length), ...list.sessions.flatMap(session => sessionLines($, pane, session))])
}

function doneLines($: EngineInterface, pane: Pane, grouped: GroupedPane): Drawn[] {
  const { Box, Button, Text } = pane.ui
  if (grouped.done.length === 0) return []
  const entries = grouped.done.map(session => session.entry)
  const head =
    pane.view.confirm === DELETE_ALL
      ? confirmLines($, pane, DELETE_ALL, `Delete all ${entries.length} done sessions for good?`, () => void deleteAll($, entries))
      : [
          {
            rows: 1,
            node: (
              <Box key="delete-all-row" justifyContent="flex-end" width={pane.lineWidth}>
                <Button key={`ask-delete-${DELETE_ALL}`} plain onPress={() => askDelete($, DELETE_ALL)}>
                  <Text color={TONES.error}>Delete all</Text>
                </Button>
              </Box>
            ),
          },
        ]
  return [...head, ...grouped.done.flatMap(session => sessionLines($, pane, session))]
}

function worktreeLines($: EngineInterface, pane: Pane, tree: CleanupWorktree): Drawn {
  const { Box, Button, Text } = pane.ui
  const key = `${tree.item.id}-${tree.repo.replace(/[^A-Za-z0-9_-]/g, '-')}`
  return {
    rows: 2,
    node: (
      <Box key={`tree-${key}`} flexDirection="column" width={pane.lineWidth}>
        <Text wrap="truncate-end">{tree.item.title}</Text>
        <Box justifyContent="space-between" width={pane.lineWidth}>
          <Text dimColor wrap="truncate-end">
            {fit(tree.command, pane.lineWidth - 3)}
          </Text>
          <Button key={`copy-command-${key}`} plain label="⧉" onPress={copyRemoveCommand($, tree.command)} />
        </Box>
      </Box>
    ),
  }
}

function oldSessionLines($: EngineInterface, pane: Pane, entry: SessionEntry): Drawn[] {
  const { Box, Text } = pane.ui
  if (pane.view.confirm === entry.id) {
    return confirmLines($, pane, entry.id, `Delete "${fit(entry.title, 24)}" (${entry.id}) for good?`, () => void confirmDelete($, entry))
  }
  return [
    {
      rows: 1,
      node: (
        <Box key={`old-${entry.id}`} justifyContent="space-between" width={pane.lineWidth}>
          <Text wrap="truncate-end">{fit(entry.title, pane.lineWidth - ACTION_COLUMNS)}</Text>
          <Box>
            <Text dimColor>{age(pane.now - entry.mtimeMs)} </Text>
            {deleteButton($, pane, entry.id)}
          </Box>
        </Box>
      ),
    },
  ]
}

function cleanupLines($: EngineInterface, pane: Pane, rows: readonly ListRowView[], entries: readonly SessionEntry[]): Drawn[] {
  const cleanup = cleanupOf(rows, entries, pane.now)
  return [
    groupHeader(pane, 'WORKTREES OF CLOSED ITEMS', cleanup.worktrees.length),
    ...cleanup.worktrees.map(tree => worktreeLines($, pane, tree)),
    groupHeader(pane, 'OLD SESSIONS WITH NO ITEM', cleanup.sessions.length),
    ...cleanup.sessions.flatMap(entry => oldSessionLines($, pane, entry)),
  ]
}

function tabLines($: EngineInterface, pane: Pane, grouped: GroupedPane, rows: readonly ListRowView[], entries: readonly SessionEntry[]): Drawn[] {
  if (pane.view.tab === 'done') return doneLines($, pane, grouped)
  if (pane.view.tab === 'cleanup') return cleanupLines($, pane, rows, entries)
  return activeLines($, pane, grouped)
}

function tabButton($: EngineInterface, pane: Pane, tab: PaneTab, label: string) {
  const { Button, Text } = pane.ui
  const isSelected = pane.view.tab === tab
  return (
    <Button key={`tab-${tab}`} plain onPress={() => selectTab($, tab)}>
      <Text backgroundColor={isSelected ? SURFACES.row : undefined} bold={isSelected} dimColor={!isSelected}>
        {` ${label} `}
      </Text>
    </Button>
  )
}

const fitting = (lines: readonly Drawn[], room: number): Drawn[] => {
  let used = 0
  return lines.filter(line => {
    used += line.rows
    return used <= room || line === lines[0]
  })
}

const lastStart = (lines: readonly Drawn[], room: number): number => {
  let used = 0
  for (let at = lines.length - 1; at >= 0; at -= 1) {
    used += lines[at]?.rows ?? 0
    if (used > room) return Math.min(lines.length - 1, at + 1)
  }
  return 0
}

export async function renderPane($: EngineInterface, e: RenderInput<'Pane'>) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  const [entries, rows, done, view, now] = await Promise.all([readSessions($), readRows($), readDone($), readPaneView($), $.clock.now()])
  const pane: Pane = { ui, view, now, lineWidth: Math.max(20, e.props.bodyColumns - 2 * PANE_PADDING) }
  const grouped = groupSessions(entries, rows, done)
  const lines = tabLines($, pane, grouped, rows, entries)
  const room = Math.max(1, e.props.scroll.bodyRows - CHROME_ROWS - 2 * PANE_PADDING)
  paneLimit.maxOffset = lastStart(lines, room)
  const offset = Math.min(view.offset, paneLimit.maxOffset)
  const shown = fitting(lines.slice(offset), room)
  const activeCount = grouped.active.reduce((sum, list) => sum + list.sessions.length, 0)

  return (
    <Box key="pane" flexDirection="column" paddingX={PANE_PADDING} paddingY={PANE_PADDING}>
      <Box justifyContent="space-between" width={pane.lineWidth}>
        <Text dimColor bold>
          WORK
        </Text>
        <Text dimColor>{windowLabel(offset, shown.length, lines.length)}</Text>
      </Box>
      <Box marginTop={1}>
        {tabButton($, pane, 'active', `Active · ${activeCount}`)}
        <Text> </Text>
        {tabButton($, pane, 'done', `Done · ${grouped.done.length}`)}
        <Text> </Text>
        {tabButton($, pane, 'cleanup', 'Cleanup')}
      </Box>
      <Box flexDirection="column">
        {lines.length === 0 && <Text dimColor>No sessions here.</Text>}
        {shown.map(line => line.node)}
      </Box>
    </Box>
  )
}
