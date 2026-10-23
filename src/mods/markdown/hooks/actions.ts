import type { EngineInterface, PressedLink, UiPressArgument } from 'claude-code'

import type { BrowseMode, ViewedDoc } from '../types'
import {
  clamp,
  closedFolders,
  keyOf,
  load,
  message,
  PANE,
  paneView,
  readDoc,
  readExpanded,
  readFiles,
  readHistory,
  remember,
  updateChanged,
  updateDoc,
  updateExpanded,
  updateHistory,
  updateHscroll,
  updateMode,
  updateOffsets,
  updateTreeOffset,
  workOf,
} from './data'
import { baseName, fromHref, resolvePath } from './links'
import { folderOf, folders, relative, treeRows } from './tree'

const TABLE_STEP = 8
const HISTORY_LENGTH = 50

async function reveal($: EngineInterface, path: string) {
  const cwd = await $.session.cwd()
  const dir = folderOf(cwd, path)
  const drop = (map: Readonly<Record<string, boolean>>) => {
    if (dir === undefined || map[dir] === undefined) return map
    const { [dir]: _, ...rest } = map
    return rest
  }
  await updateExpanded($, drop)
  const list = await readFiles($)
  const rows = treeRows(list, cwd, closedFolders(folders(list, cwd), drop(await readExpanded($)), dir), path)
  const at = rows.findIndex(row => row.kind === 'file' && row.isSelected)
  const listRows = paneView()?.listRows ?? 4
  if (at >= 0) await updateTreeOffset($, n => (at >= n && at < n + listRows ? n : Math.max(0, at - 1)))
}

export async function show($: EngineInterface, path: string, isBack = false) {
  const previous = await readDoc($)
  if (!isBack && previous !== null && keyOf(previous.path) !== keyOf(path)) {
    await updateHistory($, list => [...list, previous.path].slice(-HISTORY_LENGTH))
  }
  const viewed = await load($, path)
  await updateDoc($, () => viewed)
  await updateChanged($, map => {
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

export async function reopen($: EngineInterface) {
  const last = await readDoc($)
  if (last === null) return null
  await $.ui.open({ id: PANE, title: baseName(last.path) })
  return last.path
}

export async function refresh($: EngineInterface, force: boolean) {
  const current = await readDoc($)
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
    await updateDoc($, now => (sameDoc(now) && now !== null ? { ...now, work } : now))
    return
  }
  const loaded = await load($, current.path)
  const before = loaded.text !== current.text ? current.text : current.before
  const fresh = before === undefined ? loaded : { ...loaded, before }
  await updateDoc($, now => (sameDoc(now) ? fresh : now))
}

export async function noteFileTool($: EngineInterface, tool: string, asked: string) {
  const path = resolvePath(await $.session.cwd(), asked)
  await remember($, [path])
  if (tool === 'Read') return
  const current = await readDoc($)
  if (current !== null && keyOf(current.path) === keyOf(path)) await refresh($, true)
  else await updateChanged($, map => ({ ...map, [keyOf(path)]: true }))
}

async function back($: EngineInterface) {
  const list = await readHistory($)
  const previous = list[list.length - 1]
  if (previous === undefined) return
  await updateHistory($, now => now.slice(0, -1))
  await show($, previous, true)
}

export function goBack($: EngineInterface) {
  back($).catch(error => $.ui.toast(`picket-markdown: ${message(error)}`))
}

export async function openInEditor($: EngineInterface, path: string) {
  const argv = /^[A-Za-z]:/.test(path) ? ['cmd', '/c', 'code', path.replace(/\//g, '\\')] : ['code', path]
  try {
    const result = await $.process.run(argv, { timeoutMs: 15000 })
    if (result.exitCode !== 0) $.ui.toast(`Could not open the editor: ${result.stderr.trim() || `exit ${result.exitCode}`}`)
  } catch (error) {
    $.ui.toast(`Could not open the editor: ${message(error)}`)
  }
}

export async function ask($: EngineInterface, path: string, section: string) {
  const cwd = (await $.session.cwd()).replace(/\\/g, '/')
  const quoted = section
    .split('\n')
    .map(line => (line === '' ? '>' : `> ${line}`))
    .join('\n')
  await $.prompt.fill({ text: `About ${relative(cwd, path)}:\n${quoted}\n\n`, mode: 'insert' })
  $.ui.toast('Section quoted in the prompt')
}

export function showOrToast($: EngineInterface, path: string) {
  show($, path).catch(error => $.ui.toast(`picket-markdown: ${message(error)}`))
}

export function openPressed($: EngineInterface) {
  return (pressed: PressedLink) => {
    const path = fromHref(pressed.href)
    if (path !== undefined) showOrToast($, path)
  }
}

export function copy($: EngineInterface, text: string, what: string) {
  return (press: UiPressArgument) => {
    void $.ui.copy({ text, surface: press.surface }).then(result => {
      if (result.isCopied) $.ui.toast(`Copied ${what}`)
    })
  }
}

export function scrollTo($: EngineInterface, path: string, row: number) {
  const view = paneView()
  const limit = view !== undefined && keyOf(view.path) === keyOf(path) ? view.maxOffset : Number.MAX_SAFE_INTEGER
  return updateOffsets($, map => ({ ...map, [keyOf(path)]: clamp(row, 0, limit) }))
}

export async function scrollPane($: EngineInterface, row: number | undefined, by: number) {
  const view = paneView()
  if (view === undefined) return
  if (row !== undefined && row >= view.treeTop) {
    await updateTreeOffset($, n => clamp(Math.min(n, view.maxTreeOffset) + by, 0, view.maxTreeOffset))
    return
  }
  await updateOffsets($, map => {
    const now = Math.min(map[keyOf(view.path)] ?? 0, view.maxOffset)
    return { ...map, [keyOf(view.path)]: clamp(now + by, 0, view.maxOffset) }
  })
}

export function toggleFolder($: EngineInterface, dir: string, isClosed: boolean) {
  return updateExpanded($, map => ({ ...map, [dir]: isClosed }))
}

export async function chooseMode($: EngineInterface, next: BrowseMode) {
  await updateMode($, () => next)
  await updateTreeOffset($, () => 0)
}

export function scrollTable($: EngineInterface, key: string, step: -1 | 1, max: number) {
  return updateHscroll($, map => ({ ...map, [key]: clamp((map[key] ?? 0) + step * TABLE_STEP, 0, max) }))
}
