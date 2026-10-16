import { atom, read, update } from 'claude-code'
import type { EngineInterface, ProcessRunResult, Register, SessionUsage } from 'claude-code'

import type { AgentRow, Bar, CacheTtl, Work } from '../types'
import { agentsLine, isEnded, isWorking, rows, sessionLine, workLine } from './band'

const EMPTY: Bar = {
  model: null,
  effort: null,
  skill: null,
  cacheRead: null,
  contextTokens: null,
  contextWindow: null,
  contextPercent: null,
  limits: [],
  now: 0,
  cost: null,
  compactAt: null,
  lastRequestAt: null,
  cacheTtl: null,
  ttlSource: null,
}

const state = atom({ plugin: 'picket-status', key: 'bar' } as const, EMPTY)

const work = atom({ plugin: 'picket-status', key: 'work' } as const, null as Work | null)

const agents = atom({ plugin: 'picket-status', key: 'agents' } as const, [] as AgentRow[])

const roleOf = (type: string) => type.replace(/^picket:/, '')

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

const LAUNCHERS: readonly (readonly string[])[] = [['picket'], ['cmd', '/c', 'picket']]

const runner = { launchers: LAUNCHERS, isBusy: false }

const runLatest = async ($: EngineInterface): Promise<ProcessRunResult | null> => {
  for (const launcher of runner.launchers) {
    try {
      const result = await $.process.run([...launcher, 'next', '--latest'], { timeoutMs: 10_000 })
      runner.launchers = [launcher]
      return result
    } catch {
      continue
    }
  }
  runner.launchers = []
  return null
}

const parseWork = (result: ProcessRunResult | null): Work | null => {
  if (result === null || result.exitCode !== 0) {
    return null
  }
  try {
    const answer = JSON.parse(result.stdout) as Work
    return answer.action === 'none' || answer.id === null ? null : answer
  } catch {
    return null
  }
}

const refreshWork = async ($: EngineInterface) => {
  if (runner.isBusy || runner.launchers.length === 0) {
    return
  }
  runner.isBusy = true
  try {
    const latest = parseWork(await runLatest($))
    await update($, work, () => latest)
  } finally {
    runner.isBusy = false
  }
}

const compactAtOf = (usage: SessionUsage): number =>
  usage.context.breakdown?.autoCompactThreshold ?? usage.context.breakdown?.rawMaxTokens ?? usage.context.window

type CacheSplit = { ephemeral_1h_input_tokens: number; ephemeral_5m_input_tokens: number } | null | undefined

const ttlOfSplit = (split: CacheSplit): CacheTtl | null => {
  if (!split) {
    return null
  }
  if (split.ephemeral_1h_input_tokens > 0) {
    return '1h'
  }
  return split.ephemeral_5m_input_tokens > 0 ? '5m' : null
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const [model, usage, now] = await Promise.all([
      $.session.model(),
      $.session.usage({ breakdown: 'summary' }),
      $.clock.now(),
    ])
    await update($, state, s => ({
      ...s,
      model,
      contextTokens: usage.context.tokens ?? null,
      contextWindow: usage.context.window,
      contextPercent: usage.context.percent ?? null,
      limits: usage.rateLimits,
      cost: usage.cost?.usd ?? null,
      compactAt: compactAtOf(usage),
      now,
    }))
    runner.launchers = LAUNCHERS
    await refreshWork($)
    $.clock.every(30_000, async () => {
      const tick = await $.clock.now()
      await update($, state, s => ({ ...s, now: tick }))
      await refreshWork($)
    })
    await syncRoster($)
    $.clock.every(5_000, async () => {
      const tick = await syncRoster($)
      const known = await read($, agents)
      if (known.some(row => isWorking(row.status))) {
        await update($, state, s => ({ ...s, now: tick }))
      }
    })
    return started
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId === undefined) {
      const [before, now] = await Promise.all([read($, state), $.clock.now()])
      const compactAt =
        before.model === e.model ? before.compactAt : compactAtOf(await $.session.usage({ breakdown: 'summary' }))
      await update($, state, s => ({
        ...s,
        model: e.model,
        effort: e.effort === undefined ? null : String(e.effort),
        cacheRead: result.usage?.cache_read_input_tokens ?? s.cacheRead,
        lastRequestAt: now,
        compactAt,
        now,
      }))
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    await update($, state, s => ({ ...s, skill: e.skill }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const called = await next(e)
    if (/\bpicket\b/.test(e.command)) {
      await refreshWork($)
    }
    return called
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const called = await next(e)
    const split = called.result && 'usage' in called.result ? called.result.usage.cache_creation : null
    const learned = ttlOfSplit(split)
    if (learned !== null) {
      await update($, state, s => (s.ttlSource === 'switch' ? s : { ...s, cacheTtl: learned, ttlSource: 'agent' }))
    }
    return called
  }).catch(($, e, next) => next(e))

  on('classic.PreModelSwitch', async ($, e, next) => {
    await update($, state, s => ({ ...s, cacheTtl: e.cache_ttl, ttlSource: 'switch' }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostModelSwitch', async ($, e, next) => {
    await update($, state, s => ({ ...s, cacheTtl: e.cache_ttl, ttlSource: 'switch' }))
    return next(e)
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

  on('session.measure', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, state, s => ({
      ...s,
      contextTokens: e.context.tokens ?? s.contextTokens,
      contextWindow: e.context.window,
      contextPercent: e.context.percent ?? s.contextPercent,
      limits: e.rateLimits.length > 0 ? e.rateLimits : s.limits,
      cost: e.cost?.usd ?? s.cost,
      now,
    }))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const [s, latest, roster] = await Promise.all([read($, state), read($, work), read($, agents)])
    const lines = [workLine(latest, s.now), agentsLine(roster, latest, s.now), sessionLine(s)].filter(
      line => line !== null,
    )
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
