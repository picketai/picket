import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { roleOf } from '../../../lib/shared/format.mts'
import { resetLaunchers, runPicket } from '../../shared/kernel'
import type { AgentRow, Piece, Work } from '../types'
import { agentsLine, isEnded, isWorking, rows, workLine } from './band'
import { renderPane, paneLimit } from './pane'
import { isPaneOpen, PANE, readBandEntry, refreshBand, refreshPane, scrollPane, startBand, togglePane } from './pane-actions'

const PANE_REFRESH_MS = 15_000
const MARKDOWN_COMMAND = 'picket-markdown'

const time = atom({ plugin: 'picket-status', key: 'now' } as const, 0)

const work = atom({ plugin: 'picket-status', key: 'work' } as const, null as Work | null)

const agents = atom({ plugin: 'picket-status', key: 'agents' } as const, [] as AgentRow[])

const syncRoster = async ($: EngineInterface): Promise<number> => {
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

const stamp = ($: EngineInterface, matches: (row: AgentRow) => boolean, clocks: Partial<AgentRow>) =>
  update($, agents, known => known.map(row => (matches(row) ? { ...row, ...clocks } : row)))

const runner = { isBusy: false }

const sessionArgs = async ($: EngineInterface): Promise<string[]> => {
  try {
    const id = await $.session.id()
    return id ? ['--session', id] : []
  } catch {
    return []
  }
}

const openWork = (latest: Work | null): Work | null =>
  latest === null || latest.id === null || latest.action === 'none' ? null : latest

const refreshWork = async ($: EngineInterface) => {
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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
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
    await $.command.register({ name: 'picket-session', description: 'Show or hide the work pane', immediate: true })
    $.clock.every(PANE_REFRESH_MS, async () => {
      if (await isPaneOpen($)) await refreshPane($)
    })
    return started
  })

  on('command.run', { command: 'picket-session' }, async $ => {
    const isOpen = await togglePane($)
    return { text: isOpen ? 'Work pane opened.' : 'Work pane closed.' }
  })

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await scrollPane($, e.by, paneLimit.maxOffset)
    return {}
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => renderPane($, e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const called = await next(e)
    if (/\bpicket\b/.test(e.command)) {
      await refreshWork($)
      await tickBand($)
    }
    return called
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    const now = await syncRoster($)
    if (spawned.agentId !== undefined) {
      await stamp($, row => row.id === spawned.agentId, { startedAt: now })
    }
    return spawned
  }).catch(($, e, next) => next(e))

  on('session.send', async ($, e, next) => {
    const sent = await next(e)
    const now = await syncRoster($)
    await stamp($, row => row.name === e.to || row.id === e.to, { startedAt: now })
    return sent
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const completed = await next(e)
    const now = await syncRoster($)
    if (e.agentId !== undefined) {
      await stamp($, row => row.id === e.agentId, { idleAt: now })
    }
    return completed
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
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
  })
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
