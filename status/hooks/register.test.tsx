import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

const NOW = Date.parse('2026-10-16T10:00:00Z')

const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const

const world = (on: On, roster: AgentInfo[] = []) => {
  const clock = mock.clock(on, { now: NOW })
  on('agent.list', () => ({ value: roster }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return clock
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

const engineText = async ($: Engine) => (await (await band($)).find({ type: 'Text' }))?.text

const LATEST = {
  id: '20261016-ship',
  lane: 'order',
  status: 'open',
  phase: 1,
  options: [],
  own_gate: null,
  action: 'implement_phase',
  actor: 'developer',
  detail: 'phase 1 of 2',
  title: 'Ship picket-markdown mod with picket init',
  phases_approved: 0,
  phase_count: 2,
  blocked_reason: null,
  since: new Date(NOW).toISOString(),
  by: null,
}

const exited = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const isLatest = (argv: readonly string[]) => argv.slice(-2).join(' ') === 'next --latest'

test('a picket command in Bash refreshes the work line and other commands do not', async ($, on) => {
  world(on)
  const runs: (readonly string[])[] = []
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return exited(0, JSON.stringify(LATEST))
  })
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))

  await $.session.start(START)
  expect(runs.filter(isLatest).length).toBe(1)
  await $.tool.call({ tool: 'Bash', command: 'picket route x --verdict approved' })
  expect(runs.filter(isLatest).length).toBe(2)
  await $.tool.call({ tool: 'Bash', command: 'git status' })
  expect(runs.filter(isLatest).length).toBe(2)
})

test('a picket that cannot start is retried through cmd and the work line draws', async ($, on) => {
  world(on)
  const runs: (readonly string[])[] = []
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return e.argv[0] === 'picket' ? { deny: 'ENOENT' } : exited(0, JSON.stringify(LATEST))
  })

  await $.session.start(START)
  expect(runs).toEqual([
    ['picket', 'next', '--latest'],
    ['cmd', '/c', 'picket', 'next', '--latest'],
  ])
  expect(await (await band($)).find({ type: 'Text', text: /^▶ order/ })).toBeDefined()
})

test('a failed, unreadable or empty answer with no agent at work leaves the engine its own tree', async ($, on) => {
  world(on)
  const answers = [exited(1, ''), exited(0, 'not json'), exited(0, JSON.stringify({ ...LATEST, id: null, action: 'none' }))]
  let answer = answers[0]
  on('process.run', () => answer ?? exited(1, ''))

  for (const next of answers) {
    answer = next
    await $.session.start(START)
    expect(await engineText($)).toBe('engine')
  }
})

test('the band yields to a survey and otherwise draws the work line with no session line', async ($, on) => {
  world(on)
  on('process.run', () => exited(0, JSON.stringify(LATEST)))
  await $.session.start(START)

  expect((await (await band($, true)).find({ type: 'Text' }))?.text).toBe('engine')

  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /^▶/ })).toBeDefined()
  expect(await drawn.find({ type: 'Text', text: 'Opus 5.5' })).toBeUndefined()
  expect(await drawn.find({ type: 'Text', text: /◆/ })).toBeUndefined()
  expect(await drawn.find({ type: 'Text', text: 'engine' })).toBeUndefined()
})

test('a user gate counts its minutes with the thirty second clock', async ($, on) => {
  const clock = world(on)
  const gate = { ...LATEST, action: 'approve_phase', actor: 'user', since: new Date(NOW - 6 * 60_000).toISOString() }
  on('process.run', () => exited(0, JSON.stringify(gate)))
  await $.session.start(START)

  expect(await shows($, ' 6m')).toBe(true)
  await clock.advance(60_000)
  expect(await shows($, ' 7m')).toBe(true)
})

const developer = (): AgentInfo => ({
  id: 'a1',
  type: 'picket:developer',
  name: 'developer',
  status: 'running',
  description: 'implement phase 1',
})

const SPAWN = {
  tool_use_id: 'tu1',
  prompt: 'implement phase 1',
  description: 'implement phase 1',
  subagentType: 'picket:developer',
  provider: { plugin: 'test', tier: 'user' },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
} as const

const agentWorld = (on: On, roster: AgentInfo[]) => {
  const clock = world(on, roster)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))
  on('session.send', () => ({ isDelivered: true }))
  return clock
}

const shows = async ($: Engine, text: string) => (await (await band($)).find({ type: 'Text', text })) !== undefined

test('a spawned agent leaves the band when idle and works again from a message', async ($, on) => {
  const roster = [developer()]
  const clock = agentWorld(on, roster)
  await $.session.start(START)
  await $.agent.spawn(SPAWN)

  roster[0] = { ...developer(), status: 'idle' }
  await $.turn.complete({ answer: '', durationMs: 250_000, isAborted: false, turnId: 't1', agentId: 'a1', reason: 'answer' })
  expect(await engineText($)).toBe('engine')

  await clock.advance(60_000)
  roster[0] = developer()
  await $.session.send({ to: 'developer', text: 'phase 2', origin: { kind: 'model' } })
  expect(await shows($, ' (0s)')).toBe(true)
  await clock.advance(5_000)
  expect(await shows($, ' (5s)')).toBe(true)
})

test('a working agent clock moves with the five second timer', async ($, on) => {
  const clock = agentWorld(on, [developer()])
  await $.session.start(START)
  await clock.advance(3_000)
  await $.agent.spawn(SPAWN)
  await clock.advance(192_000)
  expect(await shows($, ' (3m12s)')).toBe(true)
  await clock.advance(5_000)
  expect(await shows($, ' (3m17s)')).toBe(true)
})
