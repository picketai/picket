import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

const NOW = Date.parse('2026-10-23T10:00:00Z')
const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const
const CONFIG = 'D:/home/.claude'
const CLOSED_SESSION = '11111111-2222-3333-4444-555555555555'

const exited = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const isStateCall = (argv: readonly string[]) => argv.includes('state')

type World = { roster: AgentInfo[]; opened: string[]; closed: string[]; runs: (readonly string[])[]; stored: unknown[]; stateAnswer: () => ReturnType<typeof exited> }

const world = (on: On, change: Partial<World> = {}) => {
  const w: World = { roster: [], opened: [], closed: [], runs: [], stored: [], stateAnswer: () => exited(0, JSON.stringify({ phase_count: 3 })), ...change }
  const timer = mock.clock(on, { now: NOW })
  let panes: { id: string }[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('session.root', () => ({ value: 'D:/repo' }))
  on('session.id', () => ({ value: 'current-session' }))
  on('env.get', ($, e) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? CONFIG : undefined }))
  on('agent.list', () => ({ value: w.roster }))
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('tool.call', () => ({ result: { isDelivered: true } }))
  on('fs.list', ($, e) =>
    e.path.replace(/\\/g, '/').endsWith('/projects/D--repo')
      ? { value: [{ name: `${CLOSED_SESSION}.jsonl`, kind: 'file' as const, size: 10, mtimeMs: NOW - 60_000, isLink: false }] }
      : { value: [] },
  )
  on('fs.read', () => ({ value: '' }))
  on('store.get', () => ({ value: w.stored }))
  on('store.set', ($, e) => {
    w.stored = e.value as unknown[]
    return { value: undefined }
  })
  on('ui.open', ($, e) => {
    w.opened.push(e.id)
    panes = [{ id: e.id }]
    return { value: { isPlaced: true } }
  })
  on('ui.panes', () => ({ value: panes }))
  on('ui.close', ($, e) => {
    w.closed.push(e.id)
    panes = []
    return { value: undefined }
  })
  on('process.run', ($, e) => {
    w.runs.push(e.argv)
    return isStateCall(e.argv) ? w.stateAnswer() : exited(0, '')
  })
  return { w, timer }
}

const pane = ($: Engine) =>
  $.ui.mount({
    plugin: 'picket-session',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-session',
    props: { title: 'Agents', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} },
  })

const developer = (): AgentInfo => ({ id: 'a1', type: 'picket:developer', name: 'developer', status: 'running', description: 'implement phase 2' })

const SPAWN = {
  tool_use_id: 'tu1',
  prompt: 'work: w1\nphase: 2\nrun through 3',
  description: 'implement phase 2',
  subagentType: 'picket:developer',
  provider: { plugin: 'test', tier: 'user' },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
} as const

const shows = async ($: Engine, text: string | RegExp) => (await (await pane($)).find({ type: 'Text', text })) !== undefined

test('the pane opens on start, and /picket-session closes and reopens it', async ($, on) => {
  const { w } = world(on)
  await $.session.start(START)
  expect(w.opened).toEqual(['picket-session'])

  await $.command.run({ command: 'picket-session', args: '' })
  expect(w.closed).toEqual(['picket-session'])
  await $.command.run({ command: 'picket-session', args: '' })
  expect(w.opened).toEqual(['picket-session', 'picket-session'])
})

test('a spawned agent with a work line shows its phase of the phase_count picket state answers', async ($, on) => {
  const { w } = world(on, { roster: [developer()] })
  await $.session.start(START)
  await $.agent.spawn(SPAWN)

  expect(w.runs.filter(isStateCall)).toEqual([['picket', 'state', 'w1']])
  expect(await shows($, /^2\/3/)).toBe(true)
})

test('a picket state that exits 2 leaves the card with no phase fraction', async ($, on) => {
  const { w } = world(on, { roster: [developer()], stateAnswer: () => exited(2, '') })
  await $.session.start(START)
  await $.agent.spawn(SPAWN)

  expect(w.runs.filter(isStateCall).length).toBe(1)
  const drawn = await pane($)
  expect(await drawn.find({ type: 'Text', text: 'implement phase 2' })).toBeDefined()
  expect(await drawn.find({ type: 'Text', text: /^2\// })).toBeUndefined()
})

test('a lead message with a work line asks picket state once and updates that agent; one without asks nothing', async ($, on) => {
  const { w, timer } = world(on, { roster: [developer()] })
  await $.session.start(START)
  await $.agent.spawn({ ...SPAWN, prompt: 'implement phase 2' })
  await timer.advance(1_000)
  expect(w.runs.filter(isStateCall).length).toBe(0)

  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'carry on' })
  expect(w.runs.filter(isStateCall).length).toBe(0)

  w.stateAnswer = () => exited(0, JSON.stringify({ phase_count: 4 }))
  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'work: w1\nphase: 3' })
  expect(w.runs.filter(isStateCall)).toEqual([['picket', 'state', 'w1']])
  expect(await shows($, /^3\/4/)).toBe(true)
})

test('picket state runs on no event but agent.spawn and a lead SendMessage with a work line', async ($, on) => {
  const { w, timer } = world(on, { roster: [developer()] })
  await $.session.start(START)
  await timer.advance(16_000)
  await $.tool.call({ tool: 'Bash', command: 'picket state w1' })
  await $.command.run({ command: 'picket-session', args: '' })
  await pane($)
  expect(w.runs.filter(isStateCall).length).toBe(0)

  await $.agent.spawn(SPAWN)
  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'work: w1\nphase: 3' })
  expect(w.runs.filter(isStateCall).length).toBe(2)
})

test('archiving a closed session moves it to the archived tab', async ($, on) => {
  world(on)
  await $.session.start(START)
  const drawn = await pane($)
  expect(await drawn.find({ key: `row-${CLOSED_SESSION}` })).toBeDefined()

  await drawn.press({ key: `archive-${CLOSED_SESSION}` })
  expect(await drawn.find({ key: `row-${CLOSED_SESSION}` })).toBeUndefined()
  expect(await drawn.find({ type: 'Text', text: ' Archived · 1 ' })).toBeDefined()
  await drawn.press({ key: 'tab-archived' })
  expect(await drawn.find({ key: `row-${CLOSED_SESSION}` })).toBeDefined()
})
