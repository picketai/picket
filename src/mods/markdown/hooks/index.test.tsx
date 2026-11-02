import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, UiPane } from 'claude-code'

import { PANE_PADDING } from '../../shared/theme'

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

const GUIDE = 'D:/repo/guide.md'
const GUIDE_TEXT = ['# Guide', ...Array.from({ length: 60 }, (_, n) => `Line ${n + 1}.`)].join('\n\n')
const TEXTS: Record<string, string> = { [DESIGN]: '# Design\n\nText.', [GUIDE]: GUIDE_TEXT }

const isStateCall = (argv: readonly string[]) => argv.includes('state')

const modelled = (hostPath: string) => hostPath.replace(/\\/g, '/').replace(/^.*?(?=[A-Za-z]:\/)/, '')

const world = (on: On) => {
  const timer = mock.clock(on, { now: NOW })
  const modified: Record<string, number> = { [DESIGN]: 1, [STATE_YAML]: 1, [GUIDE]: 1 }
  const runs: (readonly string[])[] = []
  const registered: { name: string; immediate?: true }[] = []
  const opened: string[] = []
  const closed: string[] = []
  let panes: UiPane[] = []
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
    panes = [{ id: e.id, title: e.title ?? e.id, isShown: true, isFocused: false, isPlaced: true }]
    return { value: { isPlaced: true } }
  })
  on('ui.panes', () => ({ value: panes }))
  on('ui.close', ($, e) => {
    closed.push(e.id)
    panes = panes.filter(pane => pane.id !== e.id)
    return { value: undefined }
  })
  on('fs.stat', ($, e) => {
    const mtimeMs = modified[modelled(e.path)]
    return mtimeMs === undefined ? { deny: 'ENOENT' } : { value: { kind: 'file', size: 10, mtimeMs, isLink: false } }
  })
  on('fs.read', ($, e) => {
    const text = TEXTS[modelled(e.path)]
    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
  on('fs.list', () => ({ value: [{ name: '1.done', kind: 'file' as const, size: 0, mtimeMs: 0, isLink: false }] }))
  on('process.run', ($, e) => {
    runs.push(e.argv)
    return isStateCall(e.argv) ? exited(0, JSON.stringify(STATE)) : exited(0, '')
  })
  return { timer, modified, runs, registered, opened, closed }
}

const pane = ($: Engine) =>
  $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: { title: 'design.md', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })

const inset = async (drawn: Awaited<ReturnType<typeof pane>>) => {
  const root = await drawn.find({ key: 'pane' })
  return { paddingX: root?.props.paddingX, paddingY: root?.props.paddingY }
}

const PADDED = { paddingX: PANE_PADDING, paddingY: PANE_PADDING }

const shownText = (node: unknown): string => {
  if (typeof node === 'string') return node
  if (node === null || typeof node !== 'object' || !('children' in node) || !Array.isArray(node.children)) return ''
  return node.children.map(shownText).join('')
}

test('/picket-markdown with no argument closes an open pane, and a second run opens it on the same document (T-1.3)', async ($, on) => {
  const { opened, closed } = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: 'guide.md' })

  const closing = await $.command.run({ command: 'picket-markdown', args: '' })
  expect(closed).toEqual(['picket-markdown'])
  expect(closing).toEqual({ text: 'Markdown pane closed.' })

  const reopening = await $.command.run({ command: 'picket-markdown', args: '' })
  expect(opened).toEqual(['picket-markdown', 'picket-markdown'])
  expect(reopening).toEqual({ text: `Reopened ${GUIDE}` })
  expect(await (await pane($)).find({ type: 'Text', text: 'Guide' })).toBeDefined()
})

test('/picket-markdown with a path shows that file while the pane is open, and closes nothing (T-1.4)', async ($, on) => {
  const { closed } = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: 'guide.md' })
  await $.command.run({ command: 'picket-markdown', args: 'work/w2/design.md' })

  expect(closed).toEqual([])
  expect(await (await pane($)).find({ type: 'Text', text: 'Design' })).toBeDefined()
})

test('the Markdown pane keeps one inset on every side, empty, in Files and in Outline (T-1.7)', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: '' })
  const drawn = await pane($)
  expect(await drawn.find({ type: 'Text', text: /^No file open/ })).toBeDefined()
  expect(await inset(drawn)).toEqual(PADDED)

  await $.command.run({ command: 'picket-markdown', args: 'guide.md' })
  expect(await drawn.find({ key: 'mode:files' })).toBeDefined()
  expect(await inset(drawn)).toEqual(PADDED)
  await drawn.press({ key: 'mode:outline' })
  expect(await drawn.find({ key: 'h:0' })).toBeDefined()
  expect(await inset(drawn)).toEqual(PADDED)
})

test('the document starts on the first body row, and the wheel scrolls the tree from the row below the document and the top inset (T-1.8)', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run({ command: 'picket-markdown', args: 'guide.md' })
  const drawn = await pane($)
  const firstRow = async () => shownText((await drawn.find({ key: 'document' }))?.children[0])
  const treeTop = Number((await drawn.find({ key: 'document' }))?.props.height) + PANE_PADDING
  const wheel = (row: number) => $.ui.scroll({ component: 'Pane', requestId: 'picket-markdown', by: 3, pointer: { row, column: 4 } })
  expect(await firstRow()).toMatch(/^\s*Guide\?/)

  await wheel(treeTop)
  expect(await firstRow()).toMatch(/^\s*Guide\?/)
  await wheel(treeTop - 1)
  expect(await firstRow()).not.toMatch(/Guide/)
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
