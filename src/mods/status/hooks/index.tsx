import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { roleOf } from '../../../lib/shared/format.mts'
import { resetLaunchers, runPicket } from '../../shared/kernel'
import type { AgentRow, Work } from '../types'
import { agentsLine, isEnded, isWorking, rows, workLine } from './band'

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
    $.clock.every(30_000, async () => {
      const tick = await $.clock.now()
      await update($, time, () => tick)
      await refreshWork($)
    })
    await syncRoster($)
    $.clock.every(5_000, async () => {
      const tick = await syncRoster($)
      const known = await read($, agents)
      if (known.some(row => isWorking(row.status))) {
        await update($, time, () => tick)
      }
    })
    return started
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const called = await next(e)
    if (/\bpicket\b/.test(e.command)) {
      await refreshWork($)
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
    const [now, latest, roster] = await Promise.all([read($, time), read($, work), read($, agents)])
    const lines = [workLine(latest, now), agentsLine(roster, latest, now)].filter(line => line !== null)
    if (lines.length === 0) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const drawn = lines.flatMap(line => rows(line, e.props.bodyColumns))

    return (
      <Box flexDirection="column" paddingTop={1}>
        {drawn.map((row, rowIndex) => (
          <Text key={`row:${rowIndex}`} wrap="truncate-end">
            {row.map((piece, pieceIndex) => (
              <Text key={`piece:${pieceIndex}`} color={piece.color} bold={piece.bold} dimColor={piece.dim}>
                {piece.text}
              </Text>
            ))}
          </Text>
        ))}
      </Box>
    )
  })
}
