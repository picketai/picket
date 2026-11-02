import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

import { PANE_PADDING } from '../../shared/theme'

const NOW = Date.parse('2026-10-16T10:00:00Z')

const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const

const world = (on: On, roster: AgentInfo[] = []) => {
  const timer = mock.clock(on, { now: NOW })
  on('agent.list', () => ({ value: roster }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('command.list', () => ({ value: [] }))
  on('ui.panes', () => ({ value: [] }))
  on('env.get', () => ({ value: undefined }))
  on('session.root', () => ({ value: 'D:/repo' }))
  on('fs.list', () => ({ value: [] }))
  on('store.get', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return timer
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
  expect(runs.filter(isLatest)).toEqual([
    ['picket', 'next', '--latest'],
    ['cmd', '/c', 'picket', 'next', '--latest'],
  ])
  expect(await (await band($)).find({ type: 'Text', text: /^▶ order/ })).toBeDefined()
})

test('the latest call carries the session id the engine answers', async ($, on) => {
  world(on)
  on('session.id', () => ({ value: 'sid-1' }))
  const runs: (readonly string[])[] = []
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return exited(0, JSON.stringify(LATEST))
  })

  await $.session.start(START)
  expect(runs.filter(argv => argv.includes('next'))).toEqual([['picket', 'next', '--latest', '--session', 'sid-1']])
})

test('a session id that cannot be read leaves the latest call without it', async ($, on) => {
  world(on)
  on('session.id', () => ({ deny: 'no session' }))
  const runs: (readonly string[])[] = []
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return exited(0, JSON.stringify(LATEST))
  })

  await $.session.start(START)
  expect(runs.filter(argv => argv.includes('next'))).toEqual([['picket', 'next', '--latest']])
})

test('a failed, unreadable or empty answer draws no work line, and the band still draws ☰ (T-6.3)', async ($, on) => {
  world(on)
  const answers = [exited(1, ''), exited(0, 'not json'), exited(0, JSON.stringify({ ...LATEST, id: null, action: 'none' }))]
  let answer = answers[0]
  on('process.run', () => answer ?? exited(1, ''))

  for (const next of answers) {
    answer = next
    await $.session.start(START)
    const drawn = await band($)
    expect(await drawn.find({ type: 'Text', text: /^▶/ })).toBeUndefined()
    expect(await drawn.find({ type: 'Text', text: '☰ 0' })).toBeDefined()
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
  const timer = world(on)
  const gate = { ...LATEST, action: 'approve_phase', actor: 'user', since: new Date(NOW - 6 * 60_000).toISOString() }
  on('process.run', () => exited(0, JSON.stringify(gate)))
  await $.session.start(START)

  expect(await shows($, ' 6m')).toBe(true)
  await timer.advance(60_000)
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
  const timer = world(on, roster)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: '' }))
  on('session.send', () => ({ isDelivered: true }))
  return timer
}

const shows = async ($: Engine, text: string) => (await (await band($)).find({ type: 'Text', text })) !== undefined

test('a spawned agent leaves the band when idle and works again from a message', async ($, on) => {
  const roster = [developer()]
  const timer = agentWorld(on, roster)
  await $.session.start(START)
  await $.agent.spawn(SPAWN)

  roster[0] = { ...developer(), status: 'idle' }
  await $.turn.complete({ answer: '', durationMs: 250_000, isAborted: false, turnId: 't1', agentId: 'a1', reason: 'answer' })
  expect(await shows($, 'developer ')).toBe(false)

  await timer.advance(60_000)
  roster[0] = developer()
  await $.session.send({ to: 'developer', text: 'phase 2', origin: { kind: 'model' } })
  expect(await shows($, ' (0s)')).toBe(true)
  await timer.advance(5_000)
  expect(await shows($, ' (5s)')).toBe(true)
})

const CONFIG = 'D:/home/.claude'
const PROJECT = `${CONFIG}/projects/D--repo`
const S_CURRENT = '11111111-1111-4111-8111-111111111111'
const S_WORKING = '22222222-2222-4222-8222-222222222222'
const S_NONE = '33333333-3333-4333-8333-333333333333'
const S_LIVE = '44444444-4444-4444-8444-444444444444'

const TITLES: Record<string, string> = {
  [S_CURRENT]: 'Gate the release',
  [S_WORKING]: 'Build the pane',
  [S_NONE]: 'Read the logs',
  [S_LIVE]: 'Other window',
}

const listRow = (id: string, attention: string, sessions: string[]) => ({
  id,
  lane: 'design',
  status: attention === 'closed' ? 'done' : 'open',
  title: `Item ${id}`,
  phases: '1/3',
  next: 'none',
  attention,
  sessions,
  session: sessions.at(-1) ?? null,
  branch: null,
  worktrees: [],
})

const LIST = [listRow('w-gate', 'needs-you', [S_CURRENT]), listRow('w-pane', 'working', [S_WORKING]), listRow('w-moved', 'open', [S_WORKING, S_CURRENT])]

const isList = (argv: readonly string[]) => argv.at(-1) === 'list'

type PaneWorld = {
  stored: Record<string, unknown>
  copied: string[]
  toasts: string[]
  written: Record<string, string>
  opened: string[]
  closed: string[]
  registered: { name: string; immediate?: true }[]
  runs: (readonly string[])[]
  commands: string[]
  commandRuns: string[]
  reads: string[]
  work: Record<string, { 'state.yaml': number; 'verdicts.jsonl': number }>
}

const paneWorld = (on: On, transcripts: string[] = [S_CURRENT, S_WORKING, S_NONE], list: unknown[] = LIST) => {
  const timer = mock.clock(on, { now: NOW })
  const w: PaneWorld = {
    stored: {},
    copied: [],
    toasts: [],
    written: {},
    opened: [],
    closed: [],
    registered: [],
    runs: [],
    commands: ['picket-markdown'],
    commandRuns: [],
    reads: [],
    work: {},
  }
  on('command.list', () => ({ value: w.commands.map(name => ({ name, description: '', source: 'plugin' as const })) }))
  on('command.run', ($, e) => {
    w.commandRuns.push(e.command)
    return { text: '' }
  })
  on('fs.stat', ($, e) => {
    const [id, file] = e.path.replace(/\\/g, '/').split('/').slice(-2) as [string, 'state.yaml' | 'verdicts.jsonl']
    const mtimeMs = w.work[id]?.[file]
    return mtimeMs === undefined ? { deny: 'ENOENT' } : { value: { kind: 'file' as const, size: 10, mtimeMs, isLink: false } }
  })
  let panes: { id: string }[] = []
  on('agent.list', () => ({ value: [] }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => {
    w.registered.push({ name: e.name, immediate: e.immediate })
    return { value: undefined }
  })
  on('session.root', () => ({ value: 'D:/repo' }))
  on('session.id', () => ({ value: S_CURRENT }))
  on('env.get', ($, e) => ({ value: e.name === 'CLAUDE_CONFIG_DIR' ? CONFIG : undefined }))
  on('fs.list', ($, e) => {
    const path = e.path.replace(/\\/g, '/')
    if (path === PROJECT) {
      return { value: transcripts.map((id, at) => ({ name: `${id}.jsonl`, kind: 'file' as const, size: 10, mtimeMs: NOW - (at + 1) * 60_000, isLink: false })) }
    }
    if (path === `${CONFIG}/sessions`) return { value: [{ name: '4444.json', kind: 'file' as const, size: 10, mtimeMs: NOW, isLink: false }] }
    if (path === 'D:/repo/work') return { value: Object.keys(w.work).map(name => ({ name, kind: 'dir' as const, size: 0, mtimeMs: 0, isLink: false })) }
    return { value: [] }
  })
  on('fs.read', ($, e) => {
    const path = e.path.replace(/\\/g, '/')
    w.reads.push(path)
    if (path === `${CONFIG}/sessions/4444.json`) return { value: JSON.stringify({ sessionId: S_LIVE, cwd: 'D:/repo' }) }
    const id = path.slice(PROJECT.length + 1, -'.jsonl'.length)
    return { value: w.written[path] ?? `{"type":"ai-title","aiTitle":"${TITLES[id] ?? id}"}\n` }
  })
  on('fs.write', ($, e) => {
    w.written[e.path.replace(/\\/g, '/')] = e.text
    return { value: undefined }
  })
  on('store.get', ($, e) => ({ value: w.stored[e.key] }))
  on('store.set', ($, e) => {
    w.stored[e.key] = e.value
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
  on('ui.copy', ($, e) => {
    w.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.toast', ($, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  on('process.run', ($, e) => {
    w.runs.push(e.argv)
    return isList(e.argv) ? exited(0, JSON.stringify(list)) : exited(0, JSON.stringify(LATEST))
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return { w, timer }
}

const workPane = ($: Engine) =>
  $.ui.mount({
    plugin: 'picket-status',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'work',
    props: { title: 'Work', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 60 }, view: {} },
  })

const HEADER_OR_TITLE = /^(NEEDS YOU|WORKING|OPEN|CLOSED|NO WORK ITEM) · \d+$|^(Gate the release|Build the pane|Read the logs|Other window)$/

type Drawing = Awaited<ReturnType<typeof workPane>>

const outline = async (drawn: Drawing) => (await drawn.findAll({ type: 'Text', text: HEADER_OR_TITLE })).map(found => found.text)

const openWorkPane = async ($: Engine) => {
  await $.session.start(START)
  await $.command.run({ command: 'picket-session', args: '' })
}

test('/picket-session opens the work pane, closes it the second time, and runs mid-turn (T-4.2)', async ($, on) => {
  const { w } = paneWorld(on)
  await openWorkPane($)
  expect(w.opened).toEqual(['work'])

  await $.command.run({ command: 'picket-session', args: '' })
  expect(w.closed).toEqual(['work'])
  expect(w.registered).toEqual([{ name: 'picket-session', immediate: true }])
})

test('the work pane groups sessions under NEEDS YOU, WORKING and NO WORK ITEM in that order (T-4.3)', async ($, on) => {
  paneWorld(on)
  await openWorkPane($)

  expect(await outline(await workPane($))).toEqual(['NEEDS YOU · 1', 'Gate the release', 'WORKING · 1', 'Build the pane', 'NO WORK ITEM · 1', 'Read the logs'])
})

test('copy puts the resume command on the clipboard, and pressing a row peeks at its items with the moved one dimmed (T-4.4)', async ($, on) => {
  const { w } = paneWorld(on)
  await openWorkPane($)
  const drawn = await workPane($)

  await drawn.press({ key: `copy-${S_WORKING}` })
  expect(w.copied).toEqual([`claude --resume ${S_WORKING}`])

  await drawn.press({ key: `peek-${S_WORKING}` })
  const own = await drawn.find({ type: 'Text', text: 'Item w-pane' })
  const moved = await drawn.find({ type: 'Text', text: 'Item w-moved' })
  expect(own?.props.dimColor).toBe(false)
  expect(moved?.props.dimColor).toBe(true)
})

test('marking a session done moves it to the Done tab and the store, and back returns it (T-4.5)', async ($, on) => {
  const { w } = paneWorld(on)
  await openWorkPane($)
  const drawn = await workPane($)

  await drawn.press({ key: `done-${S_NONE}` })
  expect(await outline(drawn)).not.toContain('Read the logs')
  expect(w.stored['done-sessions']).toEqual([S_NONE])

  await drawn.press({ key: 'tab-done' })
  expect(await outline(drawn)).toEqual(['Read the logs'])

  await drawn.press({ key: `back-${S_NONE}` })
  expect(w.stored['done-sessions']).toEqual([])
  await drawn.press({ key: 'tab-active' })
  expect(await outline(drawn)).toContain('Read the logs')
})

test('renaming a closed session appends an agent-name record; a live other session is refused (T-4.6)', async ($, on) => {
  const { w } = paneWorld(on, [S_CURRENT, S_NONE, S_LIVE])
  await openWorkPane($)
  const drawn = await workPane($)

  await drawn.press({ key: `rename-${S_NONE}` })
  await drawn.input({ key: `rename-input-${S_NONE}`, text: 'Logs reviewed' })
  expect(w.written[`${PROJECT}/${S_NONE}.jsonl`]).toContain(JSON.stringify({ type: 'agent-name', agentName: 'Logs reviewed', sessionId: S_NONE }))
  expect(await drawn.find({ type: 'Text', text: 'Logs reviewed' })).toBeDefined()

  await drawn.press({ key: `rename-${S_LIVE}` })
  await drawn.input({ key: `rename-input-${S_LIVE}`, text: 'Renamed' })
  expect(w.toasts).toEqual(['That session is open in another window; rename it there.'])
  expect(w.written[`${PROJECT}/${S_LIVE}.jsonl`]).toBeUndefined()
})

const isUnlink = (argv: readonly string[]) => argv[0] === 'node' && String(argv[2]).includes('unlinkSync')

const unlinked = (w: PaneWorld) => w.runs.filter(isUnlink).map(argv => String(argv.at(-1)).replace(/\\/g, '/'))

const onDoneTab = async (drawn: Drawing, ids: string[]) => {
  for (const id of ids) await drawn.press({ key: `done-${id}` })
  await drawn.press({ key: 'tab-done' })
}

test('delete on the Done tab confirms first; confirming unlinks the transcript and cancelling runs nothing (T-5.3)', async ($, on) => {
  const { w } = paneWorld(on)
  await openWorkPane($)
  const drawn = await workPane($)
  await onDoneTab(drawn, [S_NONE, S_WORKING])

  await drawn.press({ key: `ask-delete-${S_WORKING}` })
  expect(await drawn.find({ type: 'Text', text: `Delete "Build the pane" (${S_WORKING}) for good?` })).toBeDefined()
  await drawn.press({ key: `cancel-${S_WORKING}` })
  expect(unlinked(w)).toEqual([])

  await drawn.press({ key: `ask-delete-${S_NONE}` })
  await drawn.press({ key: `delete-${S_NONE}` })
  expect(unlinked(w)).toEqual([`${PROJECT}/${S_NONE}.jsonl`])
  expect(await outline(drawn)).toEqual(['Build the pane'])
})

test('the current session, a live one and an id that is not a session id are refused with a toast and run nothing (T-5.4)', async ($, on) => {
  const { w } = paneWorld(on, [S_CURRENT, S_LIVE, 'notes'])
  await openWorkPane($)
  const drawn = await workPane($)
  await onDoneTab(drawn, [S_CURRENT, S_LIVE, 'notes'])

  for (const id of [S_CURRENT, S_LIVE, 'notes']) {
    await drawn.press({ key: `ask-delete-${id}` })
    await drawn.press({ key: `delete-${id}` })
  }
  expect(w.toasts).toEqual(['Only a closed session can be deleted.', 'Only a closed session can be deleted.', 'Only a closed session can be deleted.'])
  expect(unlinked(w)).toEqual([])
})

test('Delete all deletes every closed Done session after one confirmation and names the skipped one (T-5.5)', async ($, on) => {
  const { w } = paneWorld(on, [S_CURRENT, S_WORKING, S_NONE, S_LIVE])
  await openWorkPane($)
  const drawn = await workPane($)
  await onDoneTab(drawn, [S_WORKING, S_NONE, S_LIVE])

  await drawn.press({ key: 'ask-delete-all' })
  await drawn.press({ key: 'delete-all' })
  expect(unlinked(w).sort()).toEqual([`${PROJECT}/${S_WORKING}.jsonl`, `${PROJECT}/${S_NONE}.jsonl`].sort())
  expect(w.toasts).toEqual(['Deleted 2 of 3 sessions; skipped 1 open or current.'])
})

test('a Cleanup worktree row copies its git -C remove command (T-5.6)', async ($, on) => {
  const shipped = { ...listRow('w-shipped', 'closed', [S_NONE]), worktrees: [{ repo: 'svc', path: 'svc/.worktrees/feat', present: true }] }
  const { w } = paneWorld(on, [S_CURRENT, S_NONE], [shipped])
  await openWorkPane($)
  const drawn = await workPane($)

  await drawn.press({ key: 'tab-cleanup' })
  await drawn.press({ key: 'copy-command-w-shipped-svc' })
  expect(w.copied).toEqual(['git -C svc worktree remove .worktrees/feat'])
  expect(w.toasts).toEqual(['Copied the worktree remove command'])
})

const TICK_MS = 30_000

const WATCHED = [listRow('w-open', 'open', [S_WORKING]), listRow('w-shut', 'closed', [S_NONE]), listRow('w-gate', 'needs-you', [S_NONE])]

test('the band runs picket list at start and then only when a not-closed item changes (T-6.4)', async ($, on) => {
  const { w, timer } = paneWorld(on, [S_CURRENT, S_WORKING, S_NONE], WATCHED)
  w.work = { 'w-open': { 'state.yaml': 1, 'verdicts.jsonl': 1 }, 'w-shut': { 'state.yaml': 1, 'verdicts.jsonl': 1 }, 'w-gate': { 'state.yaml': 1, 'verdicts.jsonl': 1 } }
  const lists = () => w.runs.filter(isList).length
  await $.session.start(START)
  expect(lists()).toBe(1)

  await timer.advance(TICK_MS)
  await timer.advance(TICK_MS)
  expect(lists()).toBe(1)

  w.work['w-open'] = { 'state.yaml': 1, 'verdicts.jsonl': 2 }
  await timer.advance(TICK_MS)
  expect(lists()).toBe(2)

  w.work['w-shut'] = { 'state.yaml': 2, 'verdicts.jsonl': 1 }
  await timer.advance(TICK_MS)
  expect(lists()).toBe(2)
})

test('the band counts sessions that need you outside this one, and its ☰ and M↓ open the panes (T-6.5)', async ($, on) => {
  const { w, timer } = paneWorld(on, [S_CURRENT, S_WORKING, S_NONE], WATCHED)
  await $.session.start(START)
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: '◀ 1 need you' })).toBeDefined()
  expect(await drawn.find({ type: 'Text', text: '☰ 3' })).toBeDefined()

  await drawn.press({ key: 'band-work' })
  expect(w.opened).toEqual(['work'])
  await drawn.press({ key: 'band-markdown' })
  expect(w.commandRuns).toEqual(['picket-markdown'])

  w.commands = []
  await timer.advance(TICK_MS)
  expect(await drawn.find({ type: 'Text', text: 'M↓' })).toBeUndefined()
})

test('the work pane keeps the same inset as the Markdown pane (T-1.7)', async ($, on) => {
  paneWorld(on)
  await $.session.start(START)
  const root = await (await workPane($)).find({ key: 'pane' })
  expect({ paddingX: root?.props.paddingX, paddingY: root?.props.paddingY }).toEqual({ paddingX: PANE_PADDING, paddingY: PANE_PADDING })
})

test('no transcript is read over three ticks while the work pane is closed (T-6.6)', async ($, on) => {
  const { w, timer } = paneWorld(on)
  await $.session.start(START)
  for (let tick = 0; tick < 3; tick += 1) await timer.advance(TICK_MS)
  expect(w.reads.filter(path => path.endsWith('.jsonl'))).toEqual([])
})

test('a working agent clock moves with the five second timer', async ($, on) => {
  const timer = agentWorld(on, [developer()])
  await $.session.start(START)
  await timer.advance(3_000)
  await $.agent.spawn(SPAWN)
  await timer.advance(192_000)
  expect(await shows($, ' (3m12s)')).toBe(true)
  await timer.advance(5_000)
  expect(await shows($, ' (3m17s)')).toBe(true)
})
