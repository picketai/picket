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
import { age, sizeLabel } from './sessions'
import { CLEANUP_AGE_DAYS, cleanupOf, groupSessions, type GroupedPane } from './work-pane'

const CHROME_ROWS = 4
const MORE_ROWS = 1
const PEEK_ROWS = 10
const MIN_LIST_ROWS = 3
const AGE_COLUMNS = 6

const listHeight = (bodyRows: number, hasPeek: boolean): number =>
  Math.max(MIN_LIST_ROWS, bodyRows - 2 * PANE_PADDING - CHROME_ROWS - MORE_ROWS - (hasPeek ? PEEK_ROWS : 0))

export const paneLimit = { maxOffset: 0 }

type Ui = ReturnType<EngineInterface['ui']['resolve']>

type Pane = { ui: Ui; view: PaneView; now: number; lineWidth: number; selectedId: string | null }

type Drawn = { rows: number; node: JSX.Element; isCounted?: true }

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

function peekLines(pane: Pane, session: GroupedSession): JSX.Element[] {
  const { Box, Text } = pane.ui
  const line = (item: ListRowView, isGreyed: boolean) => (
    <Box key={`peek-${session.entry.id}-${item.id}`} flexDirection="column" paddingLeft={2} width={pane.lineWidth}>
      <Text dimColor={isGreyed} bold={!isGreyed} wrap="truncate-end">
        {item.title}
      </Text>
      <Text dimColor wrap="truncate-end">
        {[item.lane, ATTENTION_LABELS[item.attention], item.phases, item.branch ?? 'no branch'].join(' · ')}
      </Text>
    </Box>
  )
  const lines = [...session.items.map(item => line(item, false)), ...session.greyed.map(item => line(item, true))]
  if (lines.length > 0) return lines
  return [
    <Text key={`peek-${session.entry.id}-none`} dimColor>
      {'  No work item in this session.'}
    </Text>,
  ]
}

function peekSection(pane: Pane, session: GroupedSession | null) {
  const { Box, Text } = pane.ui
  const body =
    session === null
      ? [
          <Text key="peek-nothing" dimColor>
            Nothing selected
          </Text>,
          <Text key="peek-hint" dimColor>
            Click a title to peek at it.
          </Text>,
        ]
      : [
          <Box key="peek-title" width={pane.lineWidth}>
            <Text bold wrap="truncate-end">
              {session.entry.title}
            </Text>
          </Box>,
          ...peekLines(pane, session),
        ]
  return (
    <Box key="peek" flexDirection="column" height={PEEK_ROWS} width={pane.lineWidth} overflow="hidden">
      <Text color={TONES.rule}>{'─'.repeat(pane.lineWidth)}</Text>
      <Box justifyContent="space-between" width={pane.lineWidth}>
        <Text dimColor bold>
          PEEK
        </Text>
        <Text dimColor>read-only</Text>
      </Box>
      <Text> </Text>
      {body}
    </Box>
  )
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
      isCounted: true,
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
    isCounted: true,
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
      isCounted: true,
    }))
  }
  if (pane.view.renamingId === entry.id) {
    const renaming = renameLine($, pane, entry)
    if (renaming.length > 0) return renaming
  }
  return [sessionRows($, pane, session)]
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

function selectedOf(view: PaneView, groups: readonly ShownGroup[]): GroupedSession | null {
  const visible = groups.filter(shown => !view.folded.includes(shown.group)).flatMap(shown => shown.sessions)
  return visible.find(session => session.entry.id === view.selectedId) ?? visible[0] ?? null
}

function doneLines($: EngineInterface, pane: Pane, grouped: GroupedPane, groups: readonly ShownGroup[]): Drawn[] {
  const entries = grouped.done.map(session => session.entry)
  const head =
    pane.view.confirm === DELETE_ALL
      ? confirmLines($, pane, DELETE_ALL, `Delete all ${entries.length} done sessions for good?`, () => void deleteAll($, entries))
      : []
  return [...head, ...groupLines($, pane, groups)]
}

type Section = { key: string; label: string; tone: string; hint: string; count: number }

function sectionHeader(pane: Pane, section: Section): Drawn {
  const { Box, Text } = pane.ui
  return {
    rows: 3,
    node: (
      <Box key={`section-${section.key}`} flexDirection="column" marginTop={1} width={pane.lineWidth}>
        <Box justifyContent="space-between" width={pane.lineWidth}>
          <Text color={section.tone} bold>
            {section.label}
          </Text>
          <Text dimColor>{String(section.count)}</Text>
        </Box>
        <Text dimColor wrap="truncate-end">
          {section.hint}
        </Text>
      </Box>
    ),
  }
}

type CleanupRow = { key: string; title: string; size: string; below: string; actions: JSX.Element[] }

function cleanupRow(pane: Pane, row: CleanupRow): Drawn {
  const { Box, Text } = pane.ui
  return {
    rows: 3,
    isCounted: true,
    node: (
      <Box key={`cleanup-${row.key}`} flexDirection="column" width={pane.lineWidth}>
        <Box justifyContent="flex-end" width={pane.lineWidth}>
          {row.actions.flatMap((button, at) => (at === 0 ? [button] : [<Text key={`gap-${at}`}> </Text>, button]))}
        </Box>
        <Box justifyContent="space-between" width={pane.lineWidth}>
          <Text wrap="truncate-end">{fit(row.title, pane.lineWidth - AGE_COLUMNS - 2)}</Text>
          <Text dimColor>{row.size}</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text dimColor wrap="truncate-end">
            {row.below}
          </Text>
        </Box>
      </Box>
    ),
  }
}

function worktreeLines($: EngineInterface, pane: Pane, tree: CleanupWorktree): Drawn {
  const key = `${tree.item.id}-${tree.repo.replace(/[^A-Za-z0-9_-]/g, '-')}`
  const owner = tree.item.session
  const done = owner === null ? [] : [actionButton(pane, `done-tree-${key}`, '✓', TONES.success, () => markDone($, owner))]
  return cleanupRow(pane, {
    key: `tree-${key}`,
    title: tree.item.title,
    size: '',
    below: tree.path,
    actions: [actionButton(pane, `copy-command-${key}`, '⧉', TONES.control, copyRemoveCommand($, tree.command)), ...done],
  })
}

function oldSessionLines($: EngineInterface, pane: Pane, entry: SessionEntry): Drawn {
  return cleanupRow(pane, {
    key: `old-${entry.id}`,
    title: entry.title,
    size: sizeLabel(entry.size),
    below: `${age(pane.now - entry.mtimeMs)} old`,
    actions: [
      actionButton(pane, `copy-${entry.id}`, '⧉', TONES.control, copyResume($, entry.id)),
      actionButton(pane, `done-old-${entry.id}`, '✓', TONES.success, () => markDone($, entry.id)),
    ],
  })
}

const WORKTREES_SECTION = { key: 'worktrees', label: 'WORKTREES ON DISK', tone: TONES.warning, hint: 'Closed items whose worktree is still there.' }

const OLD_SECTION = { key: 'old', label: 'OLD SESSIONS', tone: TONES.muted, hint: `Over ${CLEANUP_AGE_DAYS} days old, no work item.` }

function cleanupLines($: EngineInterface, pane: Pane, cleanup: Cleanup): Drawn[] {
  const { Box, Text } = pane.ui
  if (cleanup.worktrees.length === 0 && cleanup.sessions.length === 0) {
    return [{ rows: 1, node: <Text key="cleanup-none" dimColor>Nothing to clean up.</Text> }]
  }
  const trees = cleanup.worktrees.length === 0 ? [] : [sectionHeader(pane, { ...WORKTREES_SECTION, count: cleanup.worktrees.length }), ...cleanup.worktrees.map(tree => worktreeLines($, pane, tree))]
  const old = cleanup.sessions.length === 0 ? [] : [sectionHeader(pane, { ...OLD_SECTION, count: cleanup.sessions.length }), ...cleanup.sessions.map(entry => oldSessionLines($, pane, entry))]
  const footer: Drawn = {
    rows: 2,
    node: (
      <Box key="cleanup-footer" marginTop={1}>
        <Text dimColor>⧉ copies a command; the pane never runs it.</Text>
      </Box>
    ),
  }
  return [...trees, ...old, footer]
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
  const canDeleteAll = pane.view.tab === 'done' && grouped.done.length > 0 && pane.view.confirm !== DELETE_ALL
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
  const selected = selectedOf(view, groups)
  const pane: Pane = { ui, view, now, lineWidth: Math.max(20, e.props.bodyColumns - 2 * PANE_PADDING), selectedId: selected?.entry.id ?? null }
  const lines = tabLines($, pane, grouped, groups, cleanup)
  const hasPeek = view.tab !== 'cleanup'
  const room = listHeight(e.props.scroll.bodyRows, hasPeek)
  paneLimit.maxOffset = lastStart(lines, room)
  const offset = Math.min(view.offset, paneLimit.maxOffset)
  const shown = fitting(lines.slice(offset), room)
  const below = lines.slice(offset + shown.length).filter(line => line.isCounted).length

  return (
    <Box key="pane" flexDirection="column" paddingX={PANE_PADDING} paddingY={PANE_PADDING}>
      {header(pane, grouped)}
      {tabRow($, pane, grouped, cleanup)}
      <Box key="list" flexDirection="column" height={room} overflow="hidden">
        {lines.length === 0 && <Text dimColor>No sessions here.</Text>}
        {shown.map(line => line.node)}
      </Box>
      <Text dimColor>{below > 0 ? `↓ ${below} more` : ' '}</Text>
      {hasPeek ? peekSection(pane, selected) : null}
    </Box>
  )
}
