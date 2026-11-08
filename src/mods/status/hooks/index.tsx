import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderInput } from 'claude-code'

import { roleOf } from '../../../lib/shared/format.mts'
import { resetLaunchers, runPicket } from '../../shared/kernel'
import type { AgentRow, Next, Piece, Work } from '../../types'
import { agentsLine, isEnded, isWorking, rows, workLine } from './band'
import { renderPane, paneLimit } from './pane'
import { isPaneOpen, PANE, readBandEntry, refreshBand, refreshPane, scrollPane, startBand, togglePane } from './pane-actions'

const PANE_REFRESH_MS = 15_000
const MARKDOWN_COMMAND = 'picket-markdown'

const time = atom({ plugin: 'picket', key: 'now' } as const, 0)

const work = atom({ plugin: 'picket', key: 'work' } as const, null as Work | null)

const agents = atom({ plugin: 'picket', key: 'agents' } as const, [] as AgentRow[])

async function syncRoster($: EngineInterface): Promise<number> {
  const [listed, now] = await Promise.all([$.agent.list(), $.clock.now()])
  await update($, agents, known =>
    listed
      .filter(info => !isEnded(info.status))
      .map(info => {
        const seen = known.find(row => row.id === info.id)
        return {
          id: info.id,
          name: info.name ?? info.type,
          role: roleOf(info.type),
          status: info.status,
          startedAt: seen?.startedAt ?? now,
          idleAt: seen?.idleAt ?? null,
        }
      }),
  )
  return now
}

function stamp($: EngineInterface, matches: (row: AgentRow) => boolean, clocks: Partial<AgentRow>) {
  return update($, agents, known => known.map(row => (matches(row) ? { ...row, ...clocks } : row)))
}

const runner = { isBusy: false }

async function sessionArgs($: EngineInterface): Promise<string[]> {
  try {
    const id = await $.session.id()
    return id ? ['--session', id] : []
  } catch {
    return []
  }
}

const openWork = (latest: Work | null): Work | null =>
  latest === null || latest.id === null || latest.action === 'none' ? null : latest

async function refreshWork($: EngineInterface) {
  if (runner.isBusy) {
    return
  }
  runner.isBusy = true
  try {
    const latest = openWork(await runPicket<Work>($, ['next', '--latest', ...(await sessionArgs($))]))
    await update($, work, () => latest)
  } finally {
    runner.isBusy = false
  }
}

export const WORK_PANE = PANE
const SESSION_COMMAND = 'picket-session'

export async function startStatus<E, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  const started = await next(e)
  const now = await $.clock.now()
  await update($, time, () => now)
  resetLaunchers()
  await refreshWork($)
  await startBand($, await hasMarkdownCommand($))
  $.clock.every(30_000, async () => {
    const tick = await $.clock.now()
    await update($, time, () => tick)
    await refreshWork($)
    await tickBand($)
  })
  await syncRoster($)
  $.clock.every(5_000, async () => {
    const tick = await syncRoster($)
    const known = await read($, agents)
    if (known.some(row => isWorking(row.status))) {
      await update($, time, () => tick)
    }
  })
  await $.command.register({ name: SESSION_COMMAND, description: 'Show or hide the work pane', immediate: true })
  $.clock.every(PANE_REFRESH_MS, async () => {
    if (await isPaneOpen($)) await refreshPane($)
  })
  return started
}

export async function runSessionCommand($: EngineInterface) {
  const isOpen = await togglePane($)
  return { text: isOpen ? 'Work pane opened.' : 'Work pane closed.' }
}

export async function scrollWorkPane($: EngineInterface, e: { by: number }) {
  await scrollPane($, e.by, paneLimit.maxOffset)
  return {}
}

export function renderWorkPane($: EngineInterface, e: RenderInput<'Pane'>) {
  return renderPane($, e)
}

export async function watchPicketCalls<E extends { command: string }, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  const called = await next(e)
  if (/\bpicket\b/.test(e.command)) {
    await refreshWork($)
    await tickBand($)
  }
  return called
}

export async function noteSpawn<E, R extends { agentId?: string }>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  const spawned = await next(e)
  const now = await syncRoster($)
  if (spawned.agentId !== undefined) {
    await stamp($, row => row.id === spawned.agentId, { startedAt: now })
  }
  return spawned
}

export async function noteSend<E extends { to: string }, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  const sent = await next(e)
  const now = await syncRoster($)
  await stamp($, row => row.name === e.to || row.id === e.to, { startedAt: now })
  return sent
}

export async function noteTurnEnd<E extends { agentId?: string }, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  const completed = await next(e)
  const now = await syncRoster($)
  if (e.agentId !== undefined) {
    await stamp($, row => row.id === e.agentId, { idleAt: now })
  }
  return completed
}

export async function renderBand<R>($: EngineInterface, e: RenderInput<'AbovePrompt'>, next: Next<RenderInput<'AbovePrompt'>, R>) {
  if (e.props.hasSurvey) {
    return next(e)
  }
  const [now, latest, roster, entry] = await Promise.all([read($, time), read($, work), read($, agents), readBandEntry($)])
  const lines = [workLine(latest, now), agentsLine(roster, latest, now, entry)].filter(line => line !== null)
  const ui = $.ui.resolve(e)
  const drawn = lines.flatMap(line => rows(line, e.props.bodyColumns))

  return (
    <ui.Box flexDirection="column" paddingTop={1}>
      {drawn.map((row, rowIndex) => drawRow($, ui, row, `row:${rowIndex}`))}
    </ui.Box>
  )
}

type Ui = ReturnType<EngineInterface['ui']['resolve']>

function pieceText(ui: Ui, piece: Piece, key: string) {
  return (
    <ui.Text key={key} color={piece.color} bold={piece.bold} dimColor={piece.dim}>
      {piece.text}
    </ui.Text>
  )
}

function pressPiece($: EngineInterface, ui: Ui, piece: Piece, key: string) {
  const onPress = piece.press === 'work' ? () => void togglePane($) : () => void openMarkdown($)
  return (
    <ui.Button key={`band-${piece.press}`} plain onPress={onPress}>
      {pieceText(ui, piece, key)}
    </ui.Button>
  )
}

function drawRow($: EngineInterface, ui: Ui, row: Piece[], key: string) {
  if (!row.some(piece => piece.press !== undefined)) {
    return (
      <ui.Text key={key} wrap="truncate-end">
        {row.map((piece, pieceIndex) => pieceText(ui, piece, `piece:${pieceIndex}`))}
      </ui.Text>
    )
  }
  return (
    <ui.Box key={key}>
      {row.map((piece, pieceIndex) =>
        piece.press === undefined ? pieceText(ui, piece, `piece:${pieceIndex}`) : pressPiece($, ui, piece, `piece:${pieceIndex}`),
      )}
    </ui.Box>
  )
}

async function hasMarkdownCommand($: EngineInterface): Promise<boolean> {
  try {
    return (await $.command.list()).some(command => command.name === MARKDOWN_COMMAND)
  } catch {
    return false
  }
}

async function openMarkdown($: EngineInterface) {
  try {
    await $.command.run({ command: MARKDOWN_COMMAND })
  } catch {
    $.ui.toast('Could not open the Markdown pane.')
  }
}

async function tickBand($: EngineInterface) {
  await refreshBand($, await hasMarkdownCommand($))
}
