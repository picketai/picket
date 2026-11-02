import type { EngineInterface, RenderInput, UiPressArgument } from 'claude-code'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { PANE_PADDING, SURFACES, TONES } from '../../shared/theme'
import type { Cleanup, CleanupWorktree, FoldableGroup, GroupedSession, PaneTab, PaneView, Piece, SessionEntry } from '../types'
import { detailPieces } from './detail'
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
  toggleGroup,
} from './pane-actions'
import { age } from './sessions'
import { cleanupOf, groupSessions, type GroupedPane } from './work-pane'

const CHROME_ROWS = 4
const MORE_ROWS = 1
const ACTION_COLUMNS = 14
const AGE_COLUMNS = 6

export const paneLimit = { maxOffset: 0 }

type Ui = ReturnType<EngineInterface['ui']['resolve']>

type Pane = { ui: Ui; view: PaneView; now: number; lineWidth: number; selectedId: string | null }

type Drawn = { rows: number; node: JSX.Element; isSession?: true }

type ShownGroup = { group: FoldableGroup; label: string; sessions: GroupedSession[] }

const fit = (text: string, room: number) => (text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`)

const GROUP_TONES: Record<FoldableGroup, string> = {
  'needs-you': TONES.warning,
  working: TONES.accent,
  open: TONES.muted,
  closed: TONES.success,
  none: TONES.muted,
  done: TONES.muted,
}

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

function piecesText(pane: Pane, pieces: readonly Piece[]) {
  const { Text } = pane.ui
  return (
    <Text wrap="truncate-end">
      {pieces.map((piece, at) => (
        <Text key={`piece-${at}`} color={piece.color} bold={piece.bold}>
          {piece.text}
        </Text>
      ))}
    </Text>
  )
}

function actionButton(pane: Pane, key: string, glyph: string, color: string, onPress: (press: UiPressArgument) => unknown) {
  const { Button, Text } = pane.ui
  return (
    <Button key={key} plain onPress={onPress}>
      <Text color={color}>{glyph}</Text>
    </Button>
  )
}

function rowActions($: EngineInterface, pane: Pane, session: GroupedSession) {
  const { Box, Text } = pane.ui
  const { id } = session.entry
  const ends =
    pane.view.tab === 'done'
      ? [actionButton(pane, `back-${id}`, '↺', TONES.control, () => back($, id)), actionButton(pane, `ask-delete-${id}`, '⊘', TONES.error, () => askDelete($, id))]
      : [actionButton(pane, `done-${id}`, '✓', session.group === 'closed' ? TONES.success : TONES.control, () => markDone($, id))]
  const buttons = [
    actionButton(pane, `copy-${id}`, '⧉', TONES.control, copyResume($, id)),
    actionButton(pane, `rename-${id}`, '✎', TONES.control, () => startRename($, id)),
    ...ends,
  ]
  return (
    <Box justifyContent="flex-end" width={pane.lineWidth}>
      {buttons.flatMap((button, at) => (at === 0 ? [button] : [<Text key={`gap-${at}`}> </Text>, button]))}
    </Box>
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

function renameLine($: EngineInterface, pane: Pane, entry: SessionEntry): Drawn[] {
  const { Box } = pane.ui
  const Input = 'Input' in pane.ui ? pane.ui.Input : null
  if (!Input) return []
  return [
    {
      rows: 1,
      isSession: true,
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

function sessionRows($: EngineInterface, pane: Pane, session: GroupedSession): Drawn {
  const { Box, Button, Text } = pane.ui
  const { entry } = session
  const pieces = detailPieces(session)
  return {
    rows: pieces.length > 0 ? 3 : 2,
    isSession: true,
    node: (
      <Box
        key={`session-${entry.id}`}
        flexDirection="column"
        width={pane.lineWidth}
        backgroundColor={pane.selectedId === entry.id ? SURFACES.row : undefined}
      >
        {rowActions($, pane, session)}
        <Box justifyContent="space-between" width={pane.lineWidth}>
          <Button key={`peek-${entry.id}`} plain onPress={() => select($, entry.id)}>
            <Text color={entry.isCurrent ? TONES.success : TONES.warning}>{entry.isLive || entry.isCurrent ? '●' : ' '}</Text>
            <Text> </Text>
            <Text bold={entry.isCurrent}>{fit(entry.title, pane.lineWidth - AGE_COLUMNS - 2)}</Text>
          </Button>
          <Text dimColor>{entry.isCurrent ? 'now' : age(pane.now - entry.mtimeMs)}</Text>
        </Box>
        {pieces.length > 0 ? <Box paddingLeft={2}>{piecesText(pane, pieces)}</Box> : null}
      </Box>
    ),
  }
}

function sessionLines($: EngineInterface, pane: Pane, session: GroupedSession): Drawn[] {
  const { entry } = session
  if (pane.view.confirm === entry.id) {
    return confirmLines($, pane, entry.id, `Delete "${fit(entry.title, 24)}" (${entry.id}) for good?`, () => void confirmDelete($, entry)).map(line => ({
      ...line,
      isSession: true,
    }))
  }
  if (pane.view.renamingId === entry.id) {
    const renaming = renameLine($, pane, entry)
    if (renaming.length > 0) return renaming
  }
  const rows = sessionRows($, pane, session)
  return pane.selectedId === entry.id ? [rows, ...peekLines(pane, session)] : [rows]
}

const isFolded = (pane: Pane, group: FoldableGroup) => pane.view.folded.includes(group)

function groupHeader($: EngineInterface, pane: Pane, shown: ShownGroup): Drawn {
  const { Box, Button, Text } = pane.ui
  return {
    rows: 2,
    node: (
      <Box key={`header-${shown.group}`} marginTop={1} justifyContent="space-between" width={pane.lineWidth}>
        <Button key={`group-${shown.group}`} plain onPress={() => toggleGroup($, shown.group)}>
          <Text color={GROUP_TONES[shown.group]} bold>{`${isFolded(pane, shown.group) ? '▸' : '▾'} ${shown.label}`}</Text>
        </Button>
        <Text dimColor>{String(shown.sessions.length)}</Text>
      </Box>
    ),
  }
}

function groupLines($: EngineInterface, pane: Pane, groups: readonly ShownGroup[]): Drawn[] {
  return groups.flatMap(shown => [
    groupHeader($, pane, shown),
    ...(isFolded(pane, shown.group) ? [] : shown.sessions.flatMap(session => sessionLines($, pane, session))),
  ])
}

function shownGroups(tab: PaneTab, grouped: GroupedPane): ShownGroup[] {
  if (tab === 'cleanup') return []
  if (tab === 'done') return grouped.done.length === 0 ? [] : [{ group: 'done', label: 'DONE', sessions: grouped.done }]
  return grouped.active
}

function selectedOf(view: PaneView, groups: readonly ShownGroup[]): string | null {
  const visible = groups.filter(shown => !view.folded.includes(shown.group)).flatMap(shown => shown.sessions.map(session => session.entry.id))
  return view.selectedId !== null && visible.includes(view.selectedId) ? view.selectedId : (visible[0] ?? null)
}

function doneLines($: EngineInterface, pane: Pane, grouped: GroupedPane, groups: readonly ShownGroup[]): Drawn[] {
  const entries = grouped.done.map(session => session.entry)
  const head =
    pane.view.confirm === DELETE_ALL
      ? confirmLines($, pane, DELETE_ALL, `Delete all ${entries.length} done sessions for good?`, () => void deleteAll($, entries))
      : []
  return [...head, ...groupLines($, pane, groups)]
}

function sectionHeader(pane: Pane, label: string, count: number): Drawn {
  const { Box, Text } = pane.ui
  return {
    rows: 2,
    node: (
      <Box key={`section-${label}`} marginTop={1}>
        <Text dimColor bold>{`${label} · ${count}`}</Text>
      </Box>
    ),
  }
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
            {actionButton(pane, `ask-delete-${entry.id}`, '⊘', TONES.error, () => askDelete($, entry.id))}
          </Box>
        </Box>
      ),
    },
  ]
}

function cleanupLines($: EngineInterface, pane: Pane, cleanup: Cleanup): Drawn[] {
  return [
    sectionHeader(pane, 'WORKTREES OF CLOSED ITEMS', cleanup.worktrees.length),
    ...cleanup.worktrees.map(tree => worktreeLines($, pane, tree)),
    sectionHeader(pane, 'OLD SESSIONS WITH NO ITEM', cleanup.sessions.length),
    ...cleanup.sessions.flatMap(entry => oldSessionLines($, pane, entry)),
  ]
}

function tabLines($: EngineInterface, pane: Pane, grouped: GroupedPane, groups: readonly ShownGroup[], cleanup: Cleanup): Drawn[] {
  if (pane.view.tab === 'done') return doneLines($, pane, grouped, groups)
  if (pane.view.tab === 'cleanup') return cleanupLines($, pane, cleanup)
  return groupLines($, pane, groups)
}

function tabButton($: EngineInterface, pane: Pane, tab: PaneTab, label: string) {
  const { Button, Text } = pane.ui
  const isSelected = pane.view.tab === tab
  return (
    <Button key={`tab-${tab}`} plain onPress={() => selectTab($, tab)}>
      <Text bold={isSelected} underline={isSelected} dimColor={!isSelected}>
        {label}
      </Text>
    </Button>
  )
}

function tabRow($: EngineInterface, pane: Pane, grouped: GroupedPane, cleanup: Cleanup) {
  const { Box, Text } = pane.ui
  const activeCount = grouped.active.reduce((sum, list) => sum + list.sessions.length, 0)
  const canDeleteAll = pane.view.tab === 'done' && grouped.done.length > 0
  return (
    <Box marginTop={1} justifyContent="space-between" width={pane.lineWidth}>
      <Box>
        {tabButton($, pane, 'active', `Active ${activeCount}`)}
        <Text>{'  '}</Text>
        {tabButton($, pane, 'done', `Done ${grouped.done.length}`)}
        <Text>{'  '}</Text>
        {tabButton($, pane, 'cleanup', `Cleanup ${cleanup.worktrees.length + cleanup.sessions.length}`)}
      </Box>
      {canDeleteAll ? actionButton(pane, `ask-delete-${DELETE_ALL}`, '⊘', TONES.error, () => askDelete($, DELETE_ALL)) : null}
    </Box>
  )
}

function header(pane: Pane, grouped: GroupedPane) {
  const { Box, Text } = pane.ui
  const needYou = grouped.active.find(list => list.group === 'needs-you')?.sessions.length ?? 0
  return (
    <Box justifyContent="space-between" width={pane.lineWidth}>
      <Text dimColor bold>
        WORK
      </Text>
      {needYou > 0 ? (
        <Text color={TONES.warning} bold>{`◀ ${needYou} need you`}</Text>
      ) : (
        <Text dimColor>nothing waits</Text>
      )}
    </Box>
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
  const grouped = groupSessions(entries, rows, done)
  const groups = shownGroups(view.tab, grouped)
  const cleanup = cleanupOf(rows, entries, now)
  const pane: Pane = { ui, view, now, lineWidth: Math.max(20, e.props.bodyColumns - 2 * PANE_PADDING), selectedId: selectedOf(view, groups) }
  const lines = tabLines($, pane, grouped, groups, cleanup)
  const room = Math.max(1, e.props.scroll.bodyRows - CHROME_ROWS - 2 * PANE_PADDING - MORE_ROWS)
  paneLimit.maxOffset = lastStart(lines, room)
  const offset = Math.min(view.offset, paneLimit.maxOffset)
  const shown = fitting(lines.slice(offset), room)
  const below = lines.slice(offset + shown.length).filter(line => line.isSession).length

  return (
    <Box key="pane" flexDirection="column" paddingX={PANE_PADDING} paddingY={PANE_PADDING}>
      {header(pane, grouped)}
      {tabRow($, pane, grouped, cleanup)}
      <Box flexDirection="column">
        {lines.length === 0 && <Text dimColor>No sessions here.</Text>}
        {shown.map(line => line.node)}
      </Box>
      {below > 0 ? <Text dimColor>{`↓ ${below} more`}</Text> : null}
    </Box>
  )
}
