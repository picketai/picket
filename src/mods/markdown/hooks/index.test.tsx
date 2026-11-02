import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = Date.parse('2026-10-23T10:00:00Z')
const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const
const REPO = 'D:/repo'
const DESIGN = 'D:/repo/work/w2/design.md'
const STATE_YAML = 'D:/repo/work/w2/state.yaml'
const POLL_MS = 2000

const STATE = {
  id: 'w2',
  lane: 'design',
  status: 'open',
  phases: [
    { n: 1, title: 'One', done: true, approved: true, reviewed: true },
    { n: 2, title: 'Two', done: false, approved: false, reviewed: false },
    { n: 3, title: 'Three', done: false, approved: false, reviewed: false },
  ],
  phase_count: 3,
  phases_approved: 1,
}

const exited = (exitCode: number, stdout: string) => ({
  value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
})

const isStateCall = (argv: readonly string[]) => argv.includes('state')

const modelled = (hostPath: string) => hostPath.replace(/\\/g, '/').replace(/^.*?(?=[A-Za-z]:\/)/, '')

const world = (on: On) => {
  const timer = mock.clock(on, { now: NOW })
  const modified: Record<string, number> = { [DESIGN]: 1, [STATE_YAML]: 1 }
  const runs: (readonly string[])[] = []
  const registered: { name: string; immediate?: true }[] = []
  const opened: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: REPO }))
  on('session.messages', () => ({ value: [] }))
  on('command.register', ($, e) => {
    registered.push({ name: e.name, immediate: e.immediate })
    return { value: undefined }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.open', ($, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('fs.stat', ($, e) => {
    const mtimeMs = modified[modelled(e.path)]
    return mtimeMs === undefined ? { deny: 'ENOENT' } : { value: { kind: 'file', size: 10, mtimeMs, isLink: false } }
  })
  on('fs.read', ($, e) => (modelled(e.path) === DESIGN ? { value: '# Design\n\nText.' } : { deny: 'ENOENT' }))
  on('fs.list', () => ({ value: [{ name: '1.done', kind: 'file' as const, size: 0, mtimeMs: 0, isLink: false }] }))
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return isStateCall(e.argv) ? exited(0, JSON.stringify(STATE)) : exited(0, '')
  })
  return { timer, modified, runs, registered, opened }
}

const pane = ($: Engine) =>
  $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: { title: 'design.md', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })

test('/picket-markdown on a work item document shows the status picket state answers', async ($, on) => {
  const { runs } = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: 'work/w2/design.md' })

  expect(await (await pane($)).find({ type: 'Text', text: 'work w2 · design · open · phase 1/3 approved' })).toBeDefined()
  expect(runs.filter(isStateCall)).toEqual([['picket', 'state', 'w2']])
})

test('the mod registers only /picket-markdown, and it runs mid-turn (T-2.3)', async ($, on) => {
  const { registered } = world(on)
  await $.session.start(START)

  expect(registered).toEqual([{ name: 'picket-markdown', immediate: true }])
})

test('/picket-markdown with no argument and no document opens the empty pane naming the command (T-2.2)', async ($, on) => {
  const { opened } = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: '' })

  expect(opened).toEqual(['picket-markdown'])
  expect(await (await pane($)).find({ type: 'Text', text: /\/picket-markdown <path>/ })).toBeDefined()
})

test('a rendered reply adds its linked file to the pane list with no session.append', async ($, on) => {
  const { timer, modified } = world(on)
  const guide = 'D:/repo/guide.md'
  modified[guide] = 1
  await $.session.start(START)
  await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'Read guide.md first.', isFirstOfReply: true },
  })
  await timer.advance(0)
  await $.command.run({ command: 'picket-markdown', args: 'work/w2/design.md' })

  expect(await (await pane($)).find({ key: `file:${guide}` })).toBeDefined()
})

test('the poll asks picket state again only when the work signature changes', async ($, on) => {
  const { timer, modified, runs } = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: 'work/w2/design.md' })
  expect(runs.filter(isStateCall).length).toBe(1)

  await timer.advance(POLL_MS)
  await timer.advance(POLL_MS)
  expect(runs.filter(isStateCall).length).toBe(1)

  modified[STATE_YAML] = 2
  await timer.advance(POLL_MS)
  expect(runs.filter(isStateCall).length).toBe(2)
})
