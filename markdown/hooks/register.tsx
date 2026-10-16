import { atom, read, update } from 'claude-code'
import type { EngineInterface, PressedLink, Register, UiPressArgument } from 'claude-code'

import type { DocWork, ViewedDoc } from '../types'
import { baseName, candidatePaths, dirOf, fromHref, isMarkdownPath, linkPaths, resolvePath } from './links'
import { changedRows, layout, sliceSpans, width } from './markdown'
import type { Row, Span, Tone } from './markdown'
import { folderOf, folders, relative, treeRows } from './tree'
import { field, markerCount, phaseCount, statusLine, workId } from './work'

const PANE = 'picket-markdown'
const MAX_FILES = 500
const POLL_MS = 2000
const doc = atom({ plugin: 'picket-markdown', key: 'doc' } as const, null)
const files = atom({ plugin: 'picket-markdown', key: 'files' } as const, [])
const expanded = atom({ plugin: 'picket-markdown', key: 'expanded' } as const, {})
const offsets = atom({ plugin: 'picket-markdown', key: 'offsets' } as const, {})
const treeOffset = atom({ plugin: 'picket-markdown', key: 'treeOffset' } as const, 0)
const mode = atom({ plugin: 'picket-markdown', key: 'mode' } as const, 'files')
const changed = atom({ plugin: 'picket-markdown', key: 'changed' } as const, {})
const history = atom({ plugin: 'picket-markdown', key: 'history' } as const, [])
const hscroll = atom({ plugin: 'picket-markdown', key: 'hscroll' } as const, {})
const TABLE_STEP = 8

const TONES: Record<Tone, string> = { accent: 'claude', link: 'suggestion', code: 'permission', subtle: 'subtle' }

type View = { path: string; treeTop: number; maxOffset: number; maxTreeOffset: number; listRows: number }
let lastView: View | undefined

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high))
}

function cut(text: string, room: number): string {
  const chars = [...text]
  return chars.length <= room ? text : `${chars.slice(0, Math.max(0, room - 1)).join('')}…`
}

function keyOf(path: string): string {
  return path.toLowerCase()
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}


async function existing($: EngineInterface, base: string, paths: readonly string[]): Promise<Set<string>> {
  const found = new Set<string>()
  await Promise.all(
    paths.map(async path => {
      const absolute = resolvePath(base, path)
      try {
        const stat = await $.fs.stat(absolute)
        if (stat.kind === 'file') found.add(absolute)
      } catch {}
    }),
  )
  return found
}

async function remember($: EngineInterface, paths: readonly string[]) {
  if (paths.length === 0) return
  const found = await existing($, await $.session.cwd(), paths)
  if (found.size === 0) return
  await update($, files, list => {
    const known = new Set(list.map(keyOf))
    const added = [...found].filter(file => !known.has(keyOf(file)))
    return added.length === 0 ? list : [...list, ...added].slice(-MAX_FILES)
  })
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(block => (block !== null && typeof block === 'object' && 'text' in block && typeof block.text === 'string' ? block.text : ''))
    .join('\n')
}

function toolPath(input: unknown): string | undefined {
  if (input === null || typeof input !== 'object' || !('file_path' in input)) return undefined
  const path = input.file_path
  return typeof path === 'string' && isMarkdownPath(path) ? path : undefined
}

async function link($: EngineInterface, text: string, base: string) {
  const paths = candidatePaths(text)
  if (paths.length === 0) return { text, hrefs: [] }
  return linkPaths(text, base, await existing($, base, paths))
}

async function readOr($: EngineInterface, path: string): Promise<string | undefined> {
  try {
    return await $.fs.read(path)
  } catch {
    return undefined
  }
}

async function workOf($: EngineInterface, path: string): Promise<DocWork | undefined> {
  const cwd = (await $.session.cwd()).replace(/\\/g, '/').replace(/\/$/, '')
  const id = workId(relative(cwd, path))
  if (id === undefined) return undefined
  const base = `${cwd}/work/${id}`
  const state = await readOr($, `${base}/state.yaml`)
  if (state === undefined) return undefined
  let names: string[] = []
  try {
    names = (await $.fs.list(`${base}/phases`)).map(entry => entry.name)
  } catch {}
  const artifact = (await readOr($, `${base}/order.md`)) ?? (await readOr($, `${base}/design.md`)) ?? ''
  return {
    id,
    lane: field(state, 'lane'),
    status: field(state, 'status'),
    approved: markerCount(names, 'approved'),
    done: markerCount(names, 'done'),
    total: phaseCount(artifact),
  }
}

async function load($: EngineInterface, path: string): Promise<ViewedDoc> {
  try {
    const stat = await $.fs.stat(path)
    const text = await $.fs.read(path)
    const work = await workOf($, path)
    return { path, text, mtimeMs: stat.mtimeMs, ...(work !== undefined && { work }) }
  } catch (error) {
    return { path, text: '', error: message(error) }
  }
}

function closedFolders(dirs: readonly string[], chosen: Readonly<Record<string, boolean>>, current: string | undefined) {
  return Object.fromEntries(dirs.map(dir => [dir, chosen[dir] === undefined ? dir !== current : !chosen[dir]]))
}

async function reveal($: EngineInterface, path: string) {
  const cwd = await $.session.cwd()
  const dir = folderOf(cwd, path)
  const drop = (map: Readonly<Record<string, boolean>>) => {
    if (dir === undefined || map[dir] === undefined) return map
    const { [dir]: _, ...rest } = map
    return rest
  }
  await update($, expanded, drop)
  const list = await read($, files)
  const rows = treeRows(list, cwd, closedFolders(folders(list, cwd), drop(await read($, expanded)), dir), path)
  const at = rows.findIndex(row => row.kind === 'file' && row.isSelected)
  const listRows = lastView?.listRows ?? 4
  if (at >= 0) await update($, treeOffset, n => (at >= n && at < n + listRows ? n : Math.max(0, at - 1)))
}

async function show($: EngineInterface, path: string, isBack = false) {
  const previous = await read($, doc)
  if (!isBack && previous !== null && keyOf(previous.path) !== keyOf(path)) {
    await update($, history, list => [...list, previous.path].slice(-50))
  }
  const viewed = await load($, path)
  await update($, doc, () => viewed)
  await update($, changed, map => {
    if (map[keyOf(path)] !== true) return map
    const { [keyOf(path)]: _, ...rest } = map
    return rest
  })
  if (viewed.error === undefined) {
    await remember($, [path])
    await reveal($, path)
  }
  return $.ui.open({ id: PANE, title: baseName(path) })
}

async function refresh($: EngineInterface, force: boolean) {
  const current = await read($, doc)
  if (current === null) return
  let mtimeMs: number | undefined
  try {
    mtimeMs = (await $.fs.stat(current.path)).mtimeMs
  } catch {
    return
  }
  const sameDoc = (now: ViewedDoc | null) => now !== null && keyOf(now.path) === keyOf(current.path)
  if (!force && mtimeMs === current.mtimeMs) {
    const work = await workOf($, current.path)
    if (JSON.stringify(work) === JSON.stringify(current.work)) return
    await update($, doc, now => (sameDoc(now) && now !== null ? { ...now, work } : now))
    return
  }
  const loaded = await load($, current.path)
  const before = loaded.text !== current.text ? current.text : current.before
  const fresh = before === undefined ? loaded : { ...loaded, before }
  await update($, doc, now => (sameDoc(now) ? fresh : now))
}

async function back($: EngineInterface) {
  const list = await read($, history)
  const previous = list[list.length - 1]
  if (previous === undefined) return
  await update($, history, now => now.slice(0, -1))
  await show($, previous, true)
}

async function openInEditor($: EngineInterface, path: string) {
  const argv = /^[A-Za-z]:/.test(path) ? ['cmd', '/c', 'code', path.replace(/\//g, '\\')] : ['code', path]
  try {
    const result = await $.process.run(argv, { timeoutMs: 15000 })
    if (result.exitCode !== 0) $.ui.toast(`Could not open the editor: ${result.stderr.trim() || `exit ${result.exitCode}`}`)
  } catch (error) {
    $.ui.toast(`Could not open the editor: ${message(error)}`)
  }
}

async function ask($: EngineInterface, path: string, section: string) {
  const cwd = (await $.session.cwd()).replace(/\\/g, '/')
  const quoted = section
    .split('\n')
    .map(line => (line === '' ? '>' : `> ${line}`))
    .join('\n')
  await $.prompt.fill({ text: `About ${relative(cwd, path)}:\n${quoted}\n\n`, mode: 'insert' })
  $.ui.toast('Section quoted in the prompt')
}

function showOrToast($: EngineInterface, path: string) {
  show($, path).catch(error => $.ui.toast(`picket-markdown: ${message(error)}`))
}

function openPressed($: EngineInterface) {
  return (pressed: PressedLink) => {
    const path = fromHref(pressed.href)
    if (path !== undefined) showOrToast($, path)
  }
}

function copy($: EngineInterface, text: string, what: string) {
  return (press: UiPressArgument) => {
    void $.ui.copy({ text, surface: press.surface }).then(result => {
      if (result.isCopied) $.ui.toast(`Copied ${what}`)
    })
  }
}

function scrollTo($: EngineInterface, path: string, row: number) {
  const limit = lastView !== undefined && keyOf(lastView.path) === keyOf(path) ? lastView.maxOffset : Number.MAX_SAFE_INTEGER
  return update($, offsets, map => ({ ...map, [keyOf(path)]: clamp(row, 0, limit) }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'md',
      description: 'Open a markdown file read-only in the side pane',
      argumentHint: '[path]',
    })
    const paths: string[] = []
    for (const entry of await $.session.messages()) {
      if (entry.role !== 'assistant') continue
      paths.push(...candidatePaths(entry.text))
      for (const use of entry.toolUses) {
        const path = toolPath(use.input)
        if (path !== undefined) paths.push(path)
      }
    }
    await remember($, paths)
    $.clock.every(POLL_MS, () => {
      refresh($, false).catch(() => {})
    })
    return next(e)
  })

  on('session.append', async ($, e, next) => {
    const stored = await next(e)
    if (e.agentId === undefined && e.message.role === 'assistant') await remember($, candidatePaths(textOf(e.message.content)))
    return stored
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const tool = String(e.tool)
    const asked = ['Read', 'Write', 'Edit'].includes(tool) ? toolPath(e) : undefined
    if (asked === undefined) return ran
    const path = resolvePath(await $.session.cwd(), asked)
    await remember($, [path])
    if (tool !== 'Read') {
      const current = await read($, doc)
      if (current !== null && keyOf(current.path) === keyOf(path)) await refresh($, true)
      else await update($, changed, map => ({ ...map, [keyOf(path)]: true }))
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'md' }, async ($, e) => {
    const asked = e.args.trim().replace(/^["']|["']$/g, '')
    if (asked === '') {
      const last = await read($, doc)
      if (last === null) return { text: 'Usage: /md <path to a markdown file>' }
      await $.ui.open({ id: PANE, title: baseName(last.path) })
      return { text: `Reopened ${last.path}` }
    }
    const path = resolvePath(await $.session.cwd(), asked)
    const opened = await show($, path)
    return { text: opened.isPlaced ? `Opened ${path}` : `Opened ${path} (the pane waits for a wider terminal)` }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)
    const linked = await link($, e.props.text, await $.session.cwd())
    if (linked.hrefs.length === 0) return next(e)

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
  })

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const view = lastView
    if (view === undefined) return {}
    if (e.pointer !== undefined && e.pointer.row >= view.treeTop) {
      await update($, treeOffset, n => clamp(Math.min(n, view.maxTreeOffset) + e.by, 0, view.maxTreeOffset))
    } else {
      await update($, offsets, map => {
        const now = Math.min(map[keyOf(view.path)] ?? 0, view.maxOffset)
        return { ...map, [keyOf(view.path)]: clamp(now + e.by, 0, view.maxOffset) }
      })
    }
    return {}
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Code, Link } = $.ui.resolve(e)
    const viewed = await read($, doc)
    if (viewed === null) return <Text dimColor>No file open. Click a .md path in a reply, or run /md path.</Text>

    const cwd = await $.session.cwd()
    const bodyRows = Math.max(8, e.props.scroll.bodyRows)
    const columns = Math.max(20, e.props.bodyColumns)
    const room = columns - 4
    const treeHeight = clamp(Math.floor(bodyRows / 5), 5, bodyRows - 4)
    const contentRows = bodyRows - treeHeight

    const laid =
      viewed.error === undefined
        ? layout(viewed.text, room)
        : {
            rows: [{ kind: 'line', spans: [{ text: `Could not read ${viewed.path}: ${viewed.error}`, style: { tone: 'accent' } }] }] as Row[],
            code: [],
            headings: [],
          }
    const top: Row[] = [{ kind: 'line', spans: [] }]
    if (viewed.work !== undefined) {
      top.push({ kind: 'line', spans: [{ text: statusLine(viewed.work), style: { tone: 'subtle' } }] }, { kind: 'line', spans: [] })
    }
    const headRows = top.length
    const rows: Row[] = [...top, ...laid.rows, { kind: 'line', spans: [] }]
    const marks =
      viewed.before === undefined || viewed.error !== undefined
        ? new Set<number>()
        : new Set([...changedRows(layout(viewed.before, room).rows, laid.rows)].map(n => n + headRows))
    const scrolled = await read($, hscroll)
    const maxOffset = Math.max(0, rows.length - contentRows)
    const shown = Math.min((await read($, offsets))[keyOf(viewed.path)] ?? 0, maxOffset)

    const browse = await read($, mode)
    const fileList = await read($, files)
    const closedDirs = closedFolders(folders(fileList, cwd), await read($, expanded), folderOf(cwd, viewed.path))
    const fresh = await read($, changed)
    const tree = treeRows(fileList, cwd, closedDirs, viewed.path)
    const listRows = treeHeight - 3
    const listLength = browse === 'files' ? tree.length : laid.headings.length
    const maxTreeOffset = Math.max(0, listLength - listRows)
    const treeShown = Math.min(await read($, treeOffset), maxTreeOffset)
    lastView = { path: viewed.path, treeTop: contentRows, maxOffset, maxTreeOffset, listRows }

    let links = 0

    const span = (part: Span, n: number) => {
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
      const target = resolvePath(dirOf(viewed.path), part.href.replace(/[#?].*$/, ''))
      return (
        <Button key={`link:${links++}`} plain onPress={() => showOrToast($, target)}>
          <Text color={TONES.link} underline>
            {part.text}
          </Text>
        </Button>
      )
    }

    const gutter = (at: number) => <Text color={TONES.accent}>{marks.has(at) ? '▎ ' : '  '}</Text>

    const tableControls = (table: number, key: string, off: number, max: number) => (
      <Box flexDirection="row">
        <Text> </Text>
        <Button
          key={`tl:${table}`}
          plain
          dimColor={off === 0}
          onPress={() => update($, hscroll, map => ({ ...map, [key]: clamp((map[key] ?? 0) - TABLE_STEP, 0, max) }))}
        >
          ◂
        </Button>
        <Button
          key={`tr:${table}`}
          plain
          dimColor={off >= max}
          onPress={() => update($, hscroll, map => ({ ...map, [key]: clamp((map[key] ?? 0) + TABLE_STEP, 0, max) }))}
        >
          ▸
        </Button>
      </Box>
    )

    const line = (at: number, row: Extract<Row, { kind: 'line' }>) => {
      let spans = row.spans
      let controls: JSX.Element | null = null
      if (row.wide !== undefined) {
        const key = `${keyOf(viewed.path)}#${row.wide.table}`
        const max = Math.max(0, row.wide.width - room)
        const off = clamp(scrolled[key] ?? 0, 0, max)
        spans = sliceSpans(spans, off, row.wide.isTop ? room - 3 : room)
        if (row.wide.isTop) controls = tableControls(row.wide.table, key, off, max)
      }
      const heading = row.heading === undefined ? undefined : laid.headings[row.heading]
      return (
        <Box height={1} flexDirection="row" overflow="hidden">
          {gutter(at)}
          {spans.length === 0 ? <Text> </Text> : spans.map(span)}
          {controls}
          {heading !== undefined ? (
            <Box flexGrow={1} justifyContent="flex-end">
              <Button key={`ask:${row.heading}`} plain dimColor onPress={() => ask($, viewed.path, heading.section)}>
                ?
              </Button>
              <Text> </Text>
              <Button key={`section:${row.heading}`} plain dimColor onPress={copy($, heading.section, 'the section')}>
                ⧉
              </Button>
            </Box>
          ) : null}
        </Box>
      )
    }

    const body: JSX.Element[] = []
    const visible = rows.slice(shown, shown + contentRows)
    for (let i = 0; i < visible.length; i++) {
      const row = visible[i]
      if (row === undefined) continue
      if (row.kind === 'line') body.push(line(shown + i, row))
      else if (row.kind === 'code-head') {
        const label = `╭─ ${row.lang === '' ? 'code' : row.lang} `
        body.push(
          <Box height={1} flexDirection="row">
            {gutter(shown + i)}
            <Text color={TONES.subtle}>{label + '─'.repeat(Math.max(1, room - width(label) - 3))} </Text>
            <Button key={`copy:${row.block}`} plain onPress={copy($, laid.code[row.block] ?? '', 'the snippet')}>
              ⧉
            </Button>
          </Box>,
        )
      } else if (row.kind === 'code-foot') {
        body.push(line(shown + i, { kind: 'line', spans: [{ text: `╰${'─'.repeat(room - 1)}`, style: { tone: 'subtle' } }] }))
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
        const first = shown + i
        i = j - 1
        body.push(
          <Box height={run.length} flexDirection="row">
            <Box width={2} flexShrink={0} flexDirection="column">
              {run.map((_, n) => gutter(first + n))}
            </Box>
            <Box width={2} flexShrink={0} flexDirection="column">
              {run.map(() => (
                <Text color={TONES.subtle}>│</Text>
              ))}
            </Box>
            <Box width={room - 2} flexDirection="column">
              <Code source={run.join('\n')} language={lang === '' ? undefined : lang} wrap="truncate-end" />
            </Box>
          </Box>,
        )
      }
    }

    const fileBody = tree.slice(treeShown, treeShown + listRows).map(item => {
      if (item.kind === 'folder') {
        return (
          <Box height={1} paddingLeft={2}>
            <Button
              key={`dir:${item.dir}`}
              plain
              onPress={() => update($, expanded, map => ({ ...map, [item.dir]: item.isClosed }))}
            >
              <Text dimColor>{cut(`${item.isClosed ? '▸' : '▾'} ${item.label}`, columns - 4)}</Text>
            </Button>
          </Box>
        )
      }
      const isNew = fresh[keyOf(item.path)] === true
      const indent = 2 + item.depth * 2 + (item.isSelected || isNew ? 0 : 2)
      const label = cut(item.label, columns - indent - 4)
      return (
        <Box height={1} paddingLeft={indent}>
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
    })

    const current = laid.headings.reduce((at, heading, n) => (heading.row + headRows <= shown + 1 ? n : at), -1)
    const outlineBody = laid.headings.slice(treeShown, treeShown + listRows).map((heading, n) => {
      const index = treeShown + n
      const indent = 2 + (heading.level - 1) * 2
      const label = cut(heading.text, columns - indent - 4)
      return (
        <Box height={1} paddingLeft={indent}>
          <Button key={`h:${index}`} plain onPress={() => scrollTo($, viewed.path, heading.row + headRows - 1)}>
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

    const where = maxOffset === 0 ? 'all' : `${Math.round((shown / maxOffset) * 100)}%`
    const canGoBack = (await read($, history)).length > 0
    const lead = `${cut(baseName(viewed.path), Math.max(8, columns - 42))} · ${where} `
    const controls = width('Files │ Outline ✎')
    const rule = '─'.repeat(Math.max(1, columns - 5 - width(lead) - controls))
    const setMode = (next: 'files' | 'outline') => async () => {
      await update($, mode, () => next)
      await update($, treeOffset, () => 0)
    }

    return (
      <Box flexDirection="column" height={bodyRows}>
        <Box height={contentRows} flexDirection="column" paddingRight={2} overflow="hidden">
          {body}
        </Box>
        <Box height={treeHeight} flexDirection="column" overflow="hidden" paddingTop={1}>
          <Box height={1} flexDirection="row" paddingRight={2}>
            {canGoBack ? (
              <Button key="back" plain onPress={() => back($).catch(error => $.ui.toast(`picket-markdown: ${message(error)}`))}>
                ←
              </Button>
            ) : (
              <Text color={TONES.subtle}>─</Text>
            )}
            <Text color={TONES.subtle}> {lead + rule} </Text>
            <Button key="mode:files" plain dimColor={browse !== 'files'} onPress={setMode('files')}>
              Files
            </Button>
            <Text color={TONES.subtle}> │ </Text>
            <Button key="mode:outline" plain dimColor={browse !== 'outline'} onPress={setMode('outline')}>
              Outline
            </Button>
            <Text> </Text>
            <Button key="editor" plain dimColor onPress={() => openInEditor($, viewed.path)}>
              ✎
            </Button>
          </Box>
          <Text> </Text>
          {browse === 'files' ? fileBody : outlineBody}
        </Box>
      </Box>
    )
  })
}
