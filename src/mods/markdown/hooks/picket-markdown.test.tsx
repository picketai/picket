import { expect, mock, test } from 'claude-code/testing'

import { candidatePaths, fromHref, linkPaths, resolvePath, toHref } from './links'
import { changedRows, layout, sliceSpans, wrap } from './markdown'
import type { Row } from './markdown'
import { statusLine, workId } from './data'

const REPO = 'D:/repo'
const modelled = (hostPath: string) => hostPath.replace(/\\/g, '/').replace(/^.*?(?=[A-Za-z]:\/)/, '')
const REPORT = 'D:/repo/artifacts/reports/latency.md'
const ORDER = 'D:/repo/work/20261011-x/order.md'
const FILES: Record<string, string> = {
  [REPORT]: '# Latency\n\nSee [the order](../../work/20261011-x/order.md).\n\n```bash\nnpm test\n```',
  [ORDER]: '# Order\n\nPhase 1.',
}

test('the fake file system finds a modelled file however the host resolved its path', async () => {
  expect(modelled('D:\\repo\\work\\w1\\order.md')).toBe('D:/repo/work/w1/order.md')
  expect(modelled('/home/runner/work/picket/picket/D:/repo/work/w1/order.md')).toBe('D:/repo/work/w1/order.md')
  expect(modelled('D:/repo/guide.md')).toBe('D:/repo/guide.md')
})

test('paths resolve against the base and round-trip through a file href', async () => {
  expect(resolvePath('D:\\repo', 'artifacts\\reports\\latency.md')).toBe(REPORT)
  expect(resolvePath('D:/repo/artifacts/reports', '../../work/20261011-x/order.md')).toBe(ORDER)
  expect(resolvePath('D:/repo', '/home/me/notes.md')).toBe('/home/me/notes.md')
  expect(fromHref(toHref('D:/repo/my docs/a.md'))).toBe('D:/repo/my docs/a.md')
  expect(fromHref(toHref('/home/me/notes.md'))).toBe('/home/me/notes.md')
})

test('bare, code and linked markdown paths become file links; fences and urls stay', async () => {
  const text = [
    'Report: artifacts/reports/latency.md, and `work/20261011-x/order.md`.',
    'Also [order](work/20261011-x/order.md#L3) and https://example.com/a.md and missing.md.',
    '```',
    'artifacts/reports/latency.md',
    '```',
  ].join('\n')
  expect(candidatePaths(text)).toEqual(['artifacts/reports/latency.md', 'work/20261011-x/order.md', 'missing.md'])

  const linked = linkPaths(text, REPO, new Set([REPORT, ORDER]))
  expect(linked.hrefs).toEqual([toHref(REPORT), toHref(ORDER)])
  expect(linked.text).toContain(`[artifacts/reports/latency.md](${toHref(REPORT)})`)
  expect(linked.text).toContain(`[\`work/20261011-x/order.md\`](${toHref(ORDER)})`)
  expect(linked.text).toContain(`[order](${toHref(ORDER)})`)
  expect(linked.text).toContain('https://example.com/a.md')
  expect(linked.text).toContain('and missing.md.')
  expect(linked.text).toContain('```\nartifacts/reports/latency.md\n```')
})

test('clicking a report path in a reply opens it in the pane, and its links navigate', async ($, on) => {
  on('session.cwd', () => ({ value: REPO }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.stat', ($, e) => {
    if (FILES[modelled(e.path)] === undefined) return { deny: 'ENOENT' }
    return { value: { kind: 'file', size: 10, mtimeMs: 0, isLink: false } }
  })
  on('fs.read', ($, e) => {
    const text = FILES[modelled(e.path)]
    if (text === undefined) return { deny: 'ENOENT' }
    return { value: text }
  })

  const reply = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'The report is at artifacts/reports/latency.md.', isFirstOfReply: true },
  })
  const markdown = await reply.find({ key: 'reply' })
  expect(markdown?.props.pressableLinks).toEqual([toHref(REPORT)])
  await reply.press({ key: 'reply', link: { href: toHref(REPORT) } })

  const pane = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: {
      title: 'latency.md',
      isFocused: false,
      bodyColumns: 60,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  })
  expect((await pane.find({ key: 'pane' }))?.props.backgroundColor).toBe('bashMessageBackgroundColor')
  expect((await pane.find({ key: 'code:0' }))?.props.backgroundColor).toBe('userMessageBackground')
  const title = await pane.find({ type: 'Text', text: 'Latency' })
  expect(title?.props.color).toBeUndefined()
  expect(title?.props.bold).toBe(true)
  expect(await pane.find({ key: 'copy:0' })).toBeDefined()
  expect((await pane.find({ type: 'Text', text: '⧉' }))?.props.color).toBe('claudeShimmer')
  expect((await pane.find({ type: 'Text', text: '?' }))?.props.color).toBe('claudeShimmer')
  expect((await pane.find({ type: 'Text', text: '✎' }))?.props.color).toBe('claudeShimmer')
  expect((await pane.find({ type: 'Text', text: ' ─╮' }))?.props.color).toBe('promptBorder')
  expect(await pane.find({ type: 'Text', text: `╰${'─'.repeat(54)}╯` })).toBeDefined()
  expect((await pane.find({ type: 'Text', text: '── ' }))?.props.color).toBe('promptBorder')
  expect((await pane.find({ type: 'Text', text: ' ──' }))?.props.color).toBe('promptBorder')
  expect(await pane.find({ key: `file:${REPORT}` })).toBeDefined()
  const selected = await pane.find({ key: `row:${REPORT}` })
  expect(selected?.props.backgroundColor).toBe('userMessageBackgroundHover')

  await pane.press({ key: 'link:0' })
  expect(await pane.find({ type: 'Text', text: 'Order' })).toBeDefined()
  expect((await pane.find({ key: `row:${REPORT}` }))?.props.backgroundColor).toBeUndefined()
  expect(await pane.find({ key: `file:${ORDER}` })).toBeDefined()

  expect(await pane.find({ key: 'toggle-tree' })).toBeUndefined()
  expect(await pane.find({ key: `file:${REPORT}` })).toBeUndefined()
  expect(await pane.find({ key: 'dir:artifacts/reports' })).toBeDefined()

  await pane.press({ key: 'dir:artifacts/reports' })
  expect(await pane.find({ key: `file:${REPORT}` })).toBeDefined()
  await pane.press({ key: 'dir:work/20261011-x' })
  expect(await pane.find({ key: `file:${ORDER}` })).toBeUndefined()

  await pane.press({ key: `file:${REPORT}` })
  expect(await pane.find({ key: `file:${ORDER}` })).toBeUndefined()
  await pane.press({ key: 'link:0' })
  expect(await pane.find({ key: `file:${ORDER}` })).toBeDefined()
})

const texts = (rows: Row[]) => rows.map(row => (row.kind === 'line' ? row.spans.map(span => span.text).join('') : row.kind))

test('markdown lays out as terminal rows: headings, lists, quotes, tables, code', async () => {
  const doc = [
    '# Title',
    'Some **bold** and `code`.',
    '- one',
    '- two',
    '> quoted',
    '| Id | Result |',
    '| --- | --- |',
    '| T-1 | met |',
    '```js',
    'const a = 1',
    '```',
  ].join('\n')
  const laid = layout(doc, 20)
  expect(texts(laid.rows)).toEqual([
    'Title',
    '━'.repeat(20),
    '',
    'Some bold and code.',
    '',
    '  • one',
    '  • two',
    '',
    '│ quoted',
    '',
    '┌─────┬────────┐',
    '│ Id  │ Result │',
    '├─────┼────────┤',
    '│ T-1 │ met    │',
    '└─────┴────────┘',
    '',
    'code-head',
    'code',
    'code-foot',
  ])
  expect(laid.code).toEqual(['const a = 1'])
})

test('wrapping keeps words whole and hangs list text under its marker', async () => {
  const rows = wrap([{ text: 'alpha beta gamma delta' }], 12, [{ text: '• ' }], [{ text: '  ' }])
  expect(rows.map(row => row.map(span => span.text).join(''))).toEqual(['• alpha beta', '  gamma', '  delta'])
  expect(wrap([{ text: 'abcdefghij' }], 4).map(row => row.map(span => span.text).join(''))).toEqual(['abcd', 'efgh', 'ij'])
  const glued = wrap([{ text: 'ab ' }, { text: 'cd', style: { bold: true } }, { text: '.' }], 4)
  expect(glued.map(row => row.map(span => span.text).join(''))).toEqual(['ab', 'cd.'])
})

test('a reply with no existing markdown path is left to the engine', async ($, on) => {
  on('session.cwd', () => ({ value: REPO }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('fs.stat', () => ({ deny: 'ENOENT' }))
  const reply = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'Nothing at missing.md.', isFirstOfReply: true },
  })
  expect(await reply.find({ key: 'reply' })).toBeUndefined()
  expect((await reply.find({ type: 'Text' }))?.text).toBe('engine')
})

const GUIDE = 'D:/repo/guide.md'
const GUIDE_TEXT = [
  '# Guide',
  '',
  'Intro.',
  '',
  '## Setup',
  '',
  ...Array.from({ length: 60 }, (_, n) => `Step ${n + 1}.\n`),
  '## Usage',
  '',
  'find me here',
].join('\n')

test('outline jumps to a heading and the divider shows the position', async ($, on) => {
  on('session.cwd', () => ({ value: REPO }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.stat', ($, e) =>
    modelled(e.path) === GUIDE ? { value: { kind: 'file', size: 10, mtimeMs: 1, isLink: false } } : { deny: 'ENOENT' },
  )
  on('fs.read', ($, e) => (modelled(e.path) === GUIDE ? { value: GUIDE_TEXT } : { deny: 'ENOENT' }))

  const reply = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'See guide.md for the steps.', isFirstOfReply: true },
  })
  await reply.press({ key: 'reply', link: { href: toHref(GUIDE) } })

  const pane = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: {
      title: 'guide.md',
      isFocused: false,
      bodyColumns: 60,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 30 },
      view: {},
    },
  })
  expect(await pane.find({ type: 'Text', text: /guide\.md · 0%/ })).toBeDefined()
  expect(await pane.find({ key: 'section:0' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'find me here' })).toBeUndefined()

  await pane.press({ key: 'mode:outline' })
  expect(await pane.find({ key: 'h:2' })).toBeDefined()
  await pane.press({ key: 'h:2' })
  expect(await pane.find({ type: 'Text', text: 'find me here' })).toBeDefined()
  expect(await pane.find({ key: 'section:2' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /guide\.md · 0%/ })).toBeUndefined()
  expect(await pane.find({ key: 'search-toggle' })).toBeUndefined()
})

test('front matter becomes a table, wide tables keep their width, changed rows are found', async () => {
  const front = layout('---\nid: x\nlane: order\nphases:\n  - n: 1\n---\n# T', 40)
  expect(texts(front.rows)).toContain('│ id    │ x     │')
  expect(texts(front.rows)).toContain('│ lane  │ order │')
  expect(front.code).toEqual(['phases:\n  - n: 1'])

  const wide = layout(`| a | b |\n| --- | --- |\n| ${'x'.repeat(30)} | y |`, 20)
  const top = wide.rows[0]
  expect(top?.kind === 'line' ? top.wide : undefined).toEqual({ table: 0, width: 40, isTop: true })
  const body = wide.rows[3]
  const sliced = body?.kind === 'line' ? sliceSpans(body.spans, 30, 10) : []
  expect(sliced.map(span => span.text).join('')).toBe('xx │ y   │')

  expect([...changedRows(layout('a\n\nb', 20).rows, layout('a\n\nc', 20).rows)]).toEqual([2])
})

test('a work item path names its id, and its status line reads lane, status and phases', async () => {
  expect(workId('work/abc/order.md')).toBe('abc')
  expect(workId('artifacts/x.md')).toBeUndefined()
  expect(statusLine({ id: 'w1', lane: 'order', status: 'open', approved: 1, done: 2, total: 3 })).toBe(
    'work w1 · order · open · phase 1/3 approved · 1 awaiting review',
  )
})

const W_ORDER = 'D:/repo/work/w1/order.md'
const W_NOTES = 'D:/repo/work/w1/notes.md'
const W_FILES: Record<string, string> = {
  [W_ORDER]: `---\nphases:\n  - n: 1\n  - n: 2\n---\n# Order\n\n## Plan\n\nSee [notes](notes.md).\n\n| col | other |\n| --- | --- |\n| ${'z'.repeat(80)} | q |`,
  [W_NOTES]: '# Notes',
  'D:/repo/work/w1/state.yaml': 'id: w1\nlane: order\nstatus: open\n',
}
const W1_STATE = {
  id: 'w1',
  lane: 'order',
  status: 'open',
  phases: [
    { n: 1, title: 'One', done: true, approved: true, reviewed: false },
    { n: 2, title: 'Two', done: false, approved: false, reviewed: false },
  ],
  phase_count: 2,
  phases_approved: 1,
}

test('work status, back, ask about a section, open in editor and wide table scrolling', async ($, on) => {
  const filled: string[] = []
  const runs: (readonly string[])[] = []
  on('session.cwd', () => ({ value: REPO }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.stat', ($, e) =>
    W_FILES[modelled(e.path)] === undefined
      ? { deny: 'ENOENT' }
      : { value: { kind: 'file', size: 10, mtimeMs: 1, isLink: false } },
  )
  on('fs.read', ($, e) => {
    const text = W_FILES[modelled(e.path)]
    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
  on('fs.list', () => ({
    value: ['1.done', '1.approved'].map(name => ({ name, kind: 'file' as const, size: 0, mtimeMs: 0, isLink: false })),
  }))
  on('prompt.fill', ($, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  on('process.run', ($, e) => {
    runs.push(e.argv)
    const stdout = e.argv.includes('state') ? JSON.stringify(W1_STATE) : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  const reply = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'The order is work/w1/order.md.', isFirstOfReply: true },
  })
  await reply.press({ key: 'reply', link: { href: toHref(W_ORDER) } })

  const pane = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: {
      title: 'order.md',
      isFocused: false,
      bodyColumns: 60,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 40 },
      view: {},
    },
  })
  expect(await pane.find({ type: 'Text', text: 'work w1 · order · open · phase 1/2 approved' })).toBeDefined()
  expect(await pane.find({ key: 'back' })).toBeUndefined()

  expect((await pane.find({ key: 'tl:0' }))?.props.dimColor).toBe(true)
  await pane.press({ key: 'tr:0' })
  expect((await pane.find({ key: 'tl:0' }))?.props.dimColor).toBe(false)

  await pane.press({ key: 'ask:1' })
  expect(filled[0]).toBe('About work/w1/order.md:\n> ## Plan\n>\n> See [notes](notes.md).\n>\n> | col | other |\n> | --- | --- |\n> | ' + 'z'.repeat(80) + ' | q |\n\n')

  await pane.press({ key: 'editor' })
  expect(runs.at(-1)).toEqual(['cmd', '/c', 'code', 'D:\\repo\\work\\w1\\order.md'])

  await pane.press({ key: 'link:0' })
  expect(await pane.find({ type: 'Text', text: 'Notes' })).toBeDefined()
  await pane.press({ key: 'back' })
  expect(await pane.find({ type: 'Text', text: 'Order' })).toBeDefined()
  expect(await pane.find({ key: 'back' })).toBeUndefined()
})

test('a picket state that fails is asked again on the next poll, with no file changed', async ($, on) => {
  const answers = [1, 0]
  const timer = mock.clock(on, { now: Date.parse('2026-10-23T10:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: REPO }))
  on('session.messages', () => ({ value: [] }))
  on('command.register', () => ({ value: undefined }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.stat', ($, e) =>
    W_FILES[modelled(e.path)] === undefined
      ? { deny: 'ENOENT' }
      : { value: { kind: 'file', size: 10, mtimeMs: 1, isLink: false } },
  )
  on('fs.read', ($, e) => {
    const text = W_FILES[modelled(e.path)]
    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
  on('fs.list', () => ({ value: [] }))
  on('process.run', () => {
    const exitCode = answers.shift() ?? 0
    return { value: { exitCode, stdout: JSON.stringify(W1_STATE), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: REPO, surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'md', args: 'work/w1/order.md' })
  const pane = await $.ui.mount({
    plugin: 'picket-markdown',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'picket-markdown',
    props: { title: 'order.md', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })
  expect(await pane.find({ type: 'Text', text: /^work w1/ })).toBeUndefined()

  await timer.advance(2000)
  expect(await pane.find({ type: 'Text', text: 'work w1 · order · open · phase 1/2 approved' })).toBeDefined()
})
