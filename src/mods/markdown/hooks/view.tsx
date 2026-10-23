import type { EngineInterface, RenderInput } from 'claude-code'

import type { BrowseMode, ViewedDoc } from '../types'
import { ask, chooseMode, copy, goBack, openInEditor, openPressed, scrollTable, scrollTo, showOrToast, toggleFolder } from './actions'
import {
  clamp,
  closedFolders,
  cut,
  keyOf,
  readChanged,
  readDoc,
  readExpanded,
  readFiles,
  readHistory,
  readHscroll,
  readMode,
  readOffsets,
  readTreeOffset,
  rememberPaneView,
  statusLine,
} from './data'
import { baseName, dirOf, isMarkdownPath, resolvePath } from './links'
import { changedRows, layout, sliceSpans, width } from './markdown'
import type { Row, Span } from './markdown'
import { SURFACES, TONES } from './palette'
import { folderOf, folders, treeRows } from './tree'

const FOOTER_START = '── '
const FOOTER_END = ' Files │ Outline  ✎ ──'

type Laid = ReturnType<typeof layout>
type TreeRow = ReturnType<typeof treeRows>[number]

type Pane = {
  ui: ReturnType<EngineInterface['ui']['resolve']>
  viewed: ViewedDoc
  laid: Laid
  room: number
  columns: number
  marks: Set<number>
  scrolled: Record<string, number>
  links: { count: number }
}

export function renderReply($: EngineInterface, e: RenderInput<'AssistantMessage'>, linked: { text: string; hrefs: string[] }) {
  const { Box, Text, Markdown } = $.ui.resolve(e)
  return (
    <Box flexDirection="row">
      <Box width={2} flexShrink={0}>
        <Text>{e.props.isFirstOfReply ? '●' : ' '}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <Markdown key="reply" text={linked.text} pressableLinks={linked.hrefs} onLinkPress={openPressed($)} />
      </Box>
    </Box>
  )
}

function icon(pane: Pane, glyph: string) {
  const { Text } = pane.ui
  return <Text color={TONES.control}>{glyph}</Text>
}

function gutter(pane: Pane, at: number) {
  const { Text } = pane.ui
  return <Text color={TONES.accent}>{pane.marks.has(at) ? '▎ ' : '  '}</Text>
}

function span($: EngineInterface, pane: Pane, part: Span, n: number) {
  const { Button, Link, Text } = pane.ui
  const style = part.style ?? {}
  const color = style.tone === undefined ? undefined : TONES[style.tone]
  const text = (
    <Text
      key={`s${n}`}
      color={color}
      bold={style.bold}
      italic={style.italic}
      underline={style.underline}
      strikethrough={style.strike}
      dimColor={style.dim}
    >
      {part.text}
    </Text>
  )
  if (part.href === undefined) return text
  if (/^https?:\/\//i.test(part.href)) return <Link key={`s${n}`} href={part.href} label={part.text} />
  if (!isMarkdownPath(part.href)) return text
  const target = resolvePath(dirOf(pane.viewed.path), part.href.replace(/[#?].*$/, ''))
  return (
    <Button key={`link:${pane.links.count++}`} plain onPress={() => showOrToast($, target)}>
      <Text color={TONES.link} underline>
        {part.text}
      </Text>
    </Button>
  )
}

function tableControls($: EngineInterface, pane: Pane, table: number, key: string, off: number, max: number) {
  const { Box, Button, Text } = pane.ui
  return (
    <Box flexDirection="row">
      <Text> </Text>
      <Button key={`tl:${table}`} plain dimColor={off === 0} onPress={() => scrollTable($, key, -1, max)}>
        {icon(pane, '◂')}
      </Button>
      <Button key={`tr:${table}`} plain dimColor={off >= max} onPress={() => scrollTable($, key, 1, max)}>
        {icon(pane, '▸')}
      </Button>
    </Box>
  )
}

function line($: EngineInterface, pane: Pane, at: number, row: Extract<Row, { kind: 'line' }>) {
  const { Box, Button, Text } = pane.ui
  const { room, viewed } = pane
  let spans = row.spans
  let controls: JSX.Element | null = null
  if (row.wide !== undefined) {
    const key = `${keyOf(viewed.path)}#${row.wide.table}`
    const max = Math.max(0, row.wide.width - room)
    const off = clamp(pane.scrolled[key] ?? 0, 0, max)
    spans = sliceSpans(spans, off, row.wide.isTop ? room - 3 : room)
    if (row.wide.isTop) controls = tableControls($, pane, row.wide.table, key, off, max)
  }
  const heading = row.heading === undefined ? undefined : pane.laid.headings[row.heading]
  return (
    <Box height={1} flexDirection="row" overflow="hidden">
      {gutter(pane, at)}
      {spans.length === 0 ? <Text> </Text> : spans.map((part, n) => span($, pane, part, n))}
      {controls}
      {heading !== undefined ? (
        <Box flexGrow={1} justifyContent="flex-end">
          <Button key={`ask:${row.heading}`} plain onPress={() => ask($, viewed.path, heading.section)}>
            {icon(pane, '?')}
          </Button>
          <Text> </Text>
          <Button key={`section:${row.heading}`} plain onPress={copy($, heading.section, 'the section')}>
            {icon(pane, '⧉')}
          </Button>
        </Box>
      ) : null}
    </Box>
  )
}

function codeHead($: EngineInterface, pane: Pane, at: number, row: Extract<Row, { kind: 'code-head' }>) {
  const { Box, Button, Text } = pane.ui
  const label = `╭─ ${row.lang === '' ? 'code' : row.lang} `
  return (
    <Box height={1} flexDirection="row">
      {gutter(pane, at)}
      <Text color={TONES.rule}>{label + '─'.repeat(Math.max(1, pane.room - width(label) - 5))} </Text>
      <Button key={`copy:${row.block}`} plain onPress={copy($, pane.laid.code[row.block] ?? '', 'the snippet')}>
        {icon(pane, '⧉')}
      </Button>
      <Text color={TONES.rule}> ─╮</Text>
    </Box>
  )
}

function codeBlock(pane: Pane, first: number, block: number, run: string[], lang: string) {
  const { Box, Code, Text } = pane.ui
  return (
    <Box height={run.length} flexDirection="row">
      <Box width={2} flexShrink={0} flexDirection="column">
        {run.map((_, n) => gutter(pane, first + n))}
      </Box>
      <Box width={2} flexShrink={0} flexDirection="column">
        {run.map(() => (
          <Text color={TONES.rule}>│</Text>
        ))}
      </Box>
      <Box key={`code:${block}`} width={pane.room - 3} flexDirection="column" backgroundColor={SURFACES.code}>
        <Code source={run.join('\n')} language={lang === '' ? undefined : lang} wrap="truncate-end" />
      </Box>
      <Box width={1} flexShrink={0} flexDirection="column">
        {run.map(() => (
          <Text color={TONES.rule}>│</Text>
        ))}
      </Box>
    </Box>
  )
}

function body($: EngineInterface, pane: Pane, visible: Row[], shown: number) {
  const parts: JSX.Element[] = []
  for (let i = 0; i < visible.length; i++) {
    const row = visible[i]
    if (row === undefined) continue
    if (row.kind === 'line') parts.push(line($, pane, shown + i, row))
    else if (row.kind === 'code-head') parts.push(codeHead($, pane, shown + i, row))
    else if (row.kind === 'code-foot') {
      parts.push(line($, pane, shown + i, { kind: 'line', spans: [{ text: `╰${'─'.repeat(pane.room - 2)}╯`, style: { tone: 'rule' } }] }))
    } else {
      const run: string[] = []
      const block = row.block
      let j = i
      let lang = row.lang
      while (j < visible.length) {
        const next = visible[j]
        if (next === undefined || next.kind !== 'code' || next.block !== block) break
        run.push(next.text)
        lang = next.lang
        j++
      }
      parts.push(codeBlock(pane, shown + i, block, run, lang))
      i = j - 1
    }
  }
  return parts
}

function fileRow($: EngineInterface, pane: Pane, item: TreeRow, fresh: Record<string, boolean>) {
  const { Box, Button, Text } = pane.ui
  const { columns } = pane
  if (item.kind === 'folder') {
    return (
      <Box key={`row:${item.dir}`} height={1} paddingLeft={2} hover={{ backgroundColor: SURFACES.row }}>
        <Button key={`dir:${item.dir}`} plain onPress={() => toggleFolder($, item.dir, item.isClosed)}>
          <Text color={TONES.muted}>{cut(`${item.isClosed ? '▸' : '▾'} ${item.label}`, columns - 4)}</Text>
        </Button>
      </Box>
    )
  }
  const isNew = fresh[keyOf(item.path)] === true
  const indent = 2 + item.depth * 2 + (item.isSelected || isNew ? 0 : 2)
  const label = cut(item.label, columns - indent - 4)
  return (
    <Box
      key={`row:${item.path}`}
      height={1}
      paddingLeft={indent}
      backgroundColor={item.isSelected ? SURFACES.row : undefined}
      hover={{ backgroundColor: SURFACES.row }}
    >
      <Button key={`file:${item.path}`} plain onPress={() => showOrToast($, item.path)}>
        {item.isSelected ? (
          <Text color={TONES.accent} bold>
            {`› ${label}`}
          </Text>
        ) : isNew ? (
          <Text>
            <Text color={TONES.accent}>• </Text>
            {label}
          </Text>
        ) : (
          <Text>{label}</Text>
        )}
      </Button>
    </Box>
  )
}

function outline($: EngineInterface, pane: Pane, treeShown: number, listRows: number, headRows: number, shown: number) {
  const { Box, Button, Text } = pane.ui
  const { headings } = pane.laid
  const current = headings.reduce((at, heading, n) => (heading.row + headRows <= shown + 1 ? n : at), -1)
  return headings.slice(treeShown, treeShown + listRows).map((heading, n) => {
    const index = treeShown + n
    const indent = 2 + (heading.level - 1) * 2
    const label = cut(heading.text, pane.columns - indent - 4)
    return (
      <Box height={1} paddingLeft={indent}>
        <Button key={`h:${index}`} plain onPress={() => scrollTo($, pane.viewed.path, heading.row + headRows - 1)}>
          {index === current ? (
            <Text color={TONES.accent} bold>
              {label}
            </Text>
          ) : (
            <Text>{label}</Text>
          )}
        </Button>
      </Box>
    )
  })
}

function footer($: EngineInterface, pane: Pane, browse: BrowseMode, where: string, canGoBack: boolean) {
  const { Box, Button, Text } = pane.ui
  const { columns, viewed } = pane
  const lead = `${cut(baseName(viewed.path), Math.max(8, columns - 42))} · ${where} `
  const backWidth = canGoBack ? width('← ') : 0
  const rule = '─'.repeat(Math.max(1, columns - 2 - width(FOOTER_START) - backWidth - width(lead) - width(FOOTER_END)))
  const tab = (name: BrowseMode, label: string) =>
    browse === name ? (
      <Text bold underline>
        {label}
      </Text>
    ) : (
      <Text color={TONES.muted}>{label}</Text>
    )
  return (
    <Box height={1} flexDirection="row" paddingRight={2}>
      <Text color={TONES.rule}>{FOOTER_START}</Text>
      {canGoBack ? (
        <Button key="back" plain onPress={() => goBack($)}>
          {icon(pane, '←')}
        </Button>
      ) : null}
      {canGoBack ? <Text> </Text> : null}
      <Text color={TONES.muted}>{lead}</Text>
      <Text color={TONES.rule}>{rule} </Text>
      <Button key="mode:files" plain onPress={() => chooseMode($, 'files')}>
        {tab('files', 'Files')}
      </Button>
      <Text color={TONES.rule}> │ </Text>
      <Button key="mode:outline" plain onPress={() => chooseMode($, 'outline')}>
        {tab('outline', 'Outline')}
      </Button>
      <Text>  </Text>
      <Button key="editor" plain onPress={() => openInEditor($, viewed.path)}>
        {icon(pane, '✎')}
      </Button>
      <Text color={TONES.rule}> ──</Text>
    </Box>
  )
}

function laidOut(viewed: ViewedDoc, room: number): Laid {
  if (viewed.error === undefined) return layout(viewed.text, room)
  return {
    rows: [{ kind: 'line', spans: [{ text: `Could not read ${viewed.path}: ${viewed.error}`, style: { tone: 'accent' } }] }] as Row[],
    code: [],
    headings: [],
  }
}

export async function renderPane($: EngineInterface, e: RenderInput<'Pane'>) {
  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  const viewed = await readDoc($)
  if (viewed === null) {
    return (
      <Box flexDirection="column" height={Math.max(1, e.props.scroll.bodyRows)} backgroundColor={SURFACES.pane}>
        <Text color={TONES.muted}>No file open. Click a .md path in a reply, or run /md path.</Text>
      </Box>
    )
  }

  const cwd = await $.session.cwd()
  const bodyRows = Math.max(8, e.props.scroll.bodyRows)
  const columns = Math.max(20, e.props.bodyColumns)
  const room = columns - 4
  const treeHeight = clamp(Math.floor(bodyRows / 5), 5, bodyRows - 4)
  const contentRows = bodyRows - treeHeight

  const laid = laidOut(viewed, room)
  const top: Row[] = [{ kind: 'line', spans: [] }]
  if (viewed.work !== undefined) {
    top.push({ kind: 'line', spans: [{ text: statusLine(viewed.work), style: { tone: 'muted' } }] }, { kind: 'line', spans: [] })
  }
  const headRows = top.length
  const rows: Row[] = [...top, ...laid.rows, { kind: 'line', spans: [] }]
  const marks =
    viewed.before === undefined || viewed.error !== undefined
      ? new Set<number>()
      : new Set([...changedRows(layout(viewed.before, room).rows, laid.rows)].map(n => n + headRows))
  const maxOffset = Math.max(0, rows.length - contentRows)
  const shown = Math.min((await readOffsets($))[keyOf(viewed.path)] ?? 0, maxOffset)

  const browse = await readMode($)
  const fileList = await readFiles($)
  const closedDirs = closedFolders(folders(fileList, cwd), await readExpanded($), folderOf(cwd, viewed.path))
  const fresh = await readChanged($)
  const tree = treeRows(fileList, cwd, closedDirs, viewed.path)
  const listRows = treeHeight - 3
  const listLength = browse === 'files' ? tree.length : laid.headings.length
  const maxTreeOffset = Math.max(0, listLength - listRows)
  const treeShown = Math.min(await readTreeOffset($), maxTreeOffset)
  rememberPaneView({ path: viewed.path, treeTop: contentRows, maxOffset, maxTreeOffset, listRows })

  const pane: Pane = { ui, viewed, laid, room, columns, marks, scrolled: await readHscroll($), links: { count: 0 } }
  const where = maxOffset === 0 ? 'all' : `${Math.round((shown / maxOffset) * 100)}%`
  const canGoBack = (await readHistory($)).length > 0
  const list =
    browse === 'files'
      ? tree.slice(treeShown, treeShown + listRows).map(item => fileRow($, pane, item, fresh))
      : outline($, pane, treeShown, listRows, headRows, shown)

  return (
    <Box key="pane" flexDirection="column" height={bodyRows} backgroundColor={SURFACES.pane}>
      <Box height={contentRows} flexDirection="column" paddingRight={2} overflow="hidden">
        {body($, pane, rows.slice(shown, shown + contentRows), shown)}
      </Box>
      <Box height={treeHeight} flexDirection="column" overflow="hidden" paddingTop={1}>
        {footer($, pane, browse, where, canGoBack)}
        <Text> </Text>
        {list}
      </Box>
    </Box>
  )
}
