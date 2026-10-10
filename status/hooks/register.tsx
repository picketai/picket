import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Bar } from '../types'
import { bar, compactTokens, levelColor, pack, prettyModel, untilReset } from './format'

type Piece = { text: string; color?: string; bold?: boolean }
type Segment = { label: string; pieces: Piece[] }

const SEPARATOR = ' | '

const widthOf = (segment: Segment) =>
  segment.label.length + 2 + segment.pieces.reduce((sum, piece) => sum + piece.text.length, 0)

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
}

const state = atom({ plugin: 'picket-status', key: 'bar' } as const, EMPTY)

const CONTEXT_BAR_WIDTH = 10

const windowOf = (limits: SessionRateLimit[], kind: string) =>
  limits.find(limit => limit.kind === kind)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const [model, usage, now] = await Promise.all([
      $.session.model(),
      $.session.usage(),
      $.clock.now(),
    ])
    await update($, state, s => ({
      ...s,
      model,
      contextTokens: usage.context.tokens ?? null,
      contextWindow: usage.context.window,
      contextPercent: usage.context.percent ?? null,
      limits: usage.rateLimits,
      now,
    }))
    $.clock.every(30_000, async () => {
      const tick = await $.clock.now()
      await update($, state, s => ({ ...s, now: tick }))
    })
    return started
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId === undefined) {
      await update($, state, s => ({
        ...s,
        model: e.model,
        effort: e.effort === undefined ? null : String(e.effort),
        cacheRead: result.usage?.cache_read_input_tokens ?? s.cacheRead,
      }))
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    await update($, state, s => ({ ...s, skill: e.skill }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, state, s => ({
      ...s,
      contextTokens: e.context.tokens ?? s.contextTokens,
      contextWindow: e.context.window,
      contextPercent: e.context.percent ?? s.contextPercent,
      limits: e.rateLimits.length > 0 ? e.rateLimits : s.limits,
      now,
    }))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, state)
    const session = windowOf(s.limits, 'five_hour')
    const weekly = windowOf(s.limits, 'seven_day')
    const percent = s.contextPercent ?? 0
    const used = (window: SessionRateLimit | undefined): Piece =>
      window
        ? { text: `${window.percentUsed.toFixed(1)}%`, color: levelColor(window.percentUsed) }
        : { text: 'n/a', color: 'inactive' }
    const resetIn = (window: SessionRateLimit | undefined): Piece => ({
      text: window ? untilReset(window.resetsAt, s.now) : 'n/a',
      color: 'suggestion',
    })
    const tokens = `${s.contextTokens === null ? '0' : compactTokens(s.contextTokens)}/${
      s.contextWindow === null ? '?' : compactTokens(s.contextWindow)
    } (${percent}%)`

    const segments: Segment[] = [
      { label: 'Model', pieces: [{ text: s.model ? prettyModel(s.model) : '...', color: 'claude', bold: true }] },
      { label: 'Thinking', pieces: [{ text: s.effort ?? 'default', color: 'remember' }] },
      { label: 'Skill', pieces: [{ text: s.skill ?? 'none', color: 'ide' }] },
      { label: 'Session', pieces: [used(session)] },
      { label: 'Reset', pieces: [resetIn(session)] },
      { label: 'Weekly', pieces: [used(weekly)] },
      { label: 'Weekly Reset', pieces: [resetIn(weekly)] },
      {
        label: 'Context',
        pieces: [
          { text: `[${bar(percent, CONTEXT_BAR_WIDTH)}]`, color: levelColor(percent) },
          { text: ` ${tokens}` },
        ],
      },
      { label: 'Cached', pieces: [{ text: s.cacheRead === null ? 'n/a' : compactTokens(s.cacheRead), color: 'success' }] },
    ]
    const rows = pack(segments.map(widthOf), e.props.bodyColumns, SEPARATOR.length)

    return (
      <Box flexDirection="column" paddingTop={1}>
        {rows.map(row => (
          <Text key={row.join('-')} wrap="truncate-end">
            {row.map((index, position) => {
              const segment = segments[index]
              if (segment === undefined) {
                return null
              }
              return (
                <Text key={segment.label}>
                  {position > 0 ? <Text dimColor>{SEPARATOR}</Text> : null}
                  <Text color="subtle">{segment.label}: </Text>
                  {segment.pieces.map(piece => (
                    <Text key={piece.text} color={piece.color} bold={piece.bold}>
                      {piece.text}
                    </Text>
                  ))}
                </Text>
              )
            })}
          </Text>
        ))}
      </Box>
    )
  })
}
