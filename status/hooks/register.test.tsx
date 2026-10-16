import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = Date.parse('2026-10-16T10:00:00Z')

const USAGE = {
  startedAt: NOW,
  context: { tokens: 62_000, window: 200_000, percent: 31 },
  rateLimits: [],
  cost: { usd: 1.5 },
}

const world = (on: On) => {
  mock.clock(on, { now: NOW })
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({ value: USAGE }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
}

const band = ($: Engine, hasSurvey = false) =>
  $.ui.mount({
    plugin: 'picket-status',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 160,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  })

const step = async ($: Engine) => {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 })
  let next = await stream.next()
  while (next.done !== true) {
    next = await stream.next()
  }
  return next.value
}

const agentResult = (split: { ephemeral_1h_input_tokens: number; ephemeral_5m_input_tokens: number }) => ({
  agentId: 'a1',
  content: [{ type: 'text' as const, text: 'done' }],
  totalToolUseCount: 0,
  totalDurationMs: 1000,
  totalTokens: 10,
  usage: {
    input_tokens: 1,
    output_tokens: 1,
    cache_creation_input_tokens: 10,
    cache_read_input_tokens: 0,
    server_tool_use: null,
    service_tier: null,
    cache_creation: split,
  },
  status: 'completed' as const,
  prompt: 'p',
})

test('a model switch teaches the cache ttl and an agent result never overrides it', async ($, on) => {
  world(on)
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: null }
  })
  on('classic.PostModelSwitch', () => ({}))
  on('tool.call', () => ({ result: agentResult({ ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 10 }) }))

  await $.session.start({ cwd: 'D:/repo', surface: 'terminal', isInteractive: true })
  await step($)
  expect(await (await band($)).find({ type: 'Text', text: '◷ ~5m' })).toBeDefined()

  await $.classic.PostModelSwitch({
    from_model: 'claude-opus-5-5',
    to_model: 'claude-opus-5-5',
    requested_model: null,
    source: 'command',
    context_tokens: 62_000,
    prompt_cache_warm: true,
    cache_ttl: '1h',
    estimated_cache_write_usd: 0,
    pricing: 'catalog',
  })
  expect(await (await band($)).find({ type: 'Text', text: '◷ 60m' })).toBeDefined()

  await $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p' })
  const after = await band($)
  expect(await after.find({ type: 'Text', text: '◷ 60m' })).toBeDefined()
  expect(await after.find({ type: 'Text', text: /~/ })).toBeUndefined()
})

test('the band yields to a survey and otherwise draws label-free rows', async ($, on) => {
  world(on)
  await $.session.start({ cwd: 'D:/repo', surface: 'terminal', isInteractive: true })

  const survey = await band($, true)
  expect((await survey.find({ type: 'Text' }))?.text).toBe('engine')

  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: 'Opus 5.5' })).toBeDefined()
  expect(await drawn.find({ type: 'Text', text: '$1.50' })).toBeDefined()
  expect(await drawn.find({ type: 'Text', text: 'Model:' })).toBeUndefined()
  expect(await drawn.find({ type: 'Text', text: ' | ' })).toBeUndefined()
  expect(await drawn.find({ type: 'Text', text: 'engine' })).toBeUndefined()
})
