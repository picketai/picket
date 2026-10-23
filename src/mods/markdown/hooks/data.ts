import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { StateView } from '../../../lib/shared/views.mts'
import { runPicket } from '../../shared/kernel'
import type { BrowseMode, DocWork, PaneView, ViewedDoc } from '../types'
import { candidatePaths, isMarkdownPath, linkPaths, resolvePath } from './links'
import { relative } from './tree'

export const PANE = 'picket-markdown'
const MAX_FILES = 500
const WORK_ARTIFACTS = ['order.md', 'design.md', 'research.md']

const doc = atom({ plugin: 'picket-markdown', key: 'doc' } as const, null)
const files = atom({ plugin: 'picket-markdown', key: 'files' } as const, [])
const expanded = atom({ plugin: 'picket-markdown', key: 'expanded' } as const, {})
const offsets = atom({ plugin: 'picket-markdown', key: 'offsets' } as const, {})
const treeOffset = atom({ plugin: 'picket-markdown', key: 'treeOffset' } as const, 0)
const mode = atom({ plugin: 'picket-markdown', key: 'mode' } as const, 'files')
const changed = atom({ plugin: 'picket-markdown', key: 'changed' } as const, {})
const history = atom({ plugin: 'picket-markdown', key: 'history' } as const, [])
const hscroll = atom({ plugin: 'picket-markdown', key: 'hscroll' } as const, {})

type Change<T> = (current: T) => T

export function readDoc($: EngineInterface): Promise<ViewedDoc | null> {
  return read($, doc)
}

export function updateDoc($: EngineInterface, change: Change<ViewedDoc | null>) {
  return update($, doc, change)
}

export function readFiles($: EngineInterface): Promise<string[]> {
  return read($, files)
}

export function readExpanded($: EngineInterface): Promise<Record<string, boolean>> {
  return read($, expanded)
}

export function updateExpanded($: EngineInterface, change: Change<Record<string, boolean>>) {
  return update($, expanded, change)
}

export function readOffsets($: EngineInterface): Promise<Record<string, number>> {
  return read($, offsets)
}

export function updateOffsets($: EngineInterface, change: Change<Record<string, number>>) {
  return update($, offsets, change)
}

export function readTreeOffset($: EngineInterface): Promise<number> {
  return read($, treeOffset)
}

export function updateTreeOffset($: EngineInterface, change: Change<number>) {
  return update($, treeOffset, change)
}

export function readMode($: EngineInterface): Promise<BrowseMode> {
  return read($, mode)
}

export function updateMode($: EngineInterface, change: Change<BrowseMode>) {
  return update($, mode, change)
}

export function readChanged($: EngineInterface): Promise<Record<string, boolean>> {
  return read($, changed)
}

export function updateChanged($: EngineInterface, change: Change<Record<string, boolean>>) {
  return update($, changed, change)
}

export function readHistory($: EngineInterface): Promise<string[]> {
  return read($, history)
}

export function updateHistory($: EngineInterface, change: Change<string[]>) {
  return update($, history, change)
}

export function readHscroll($: EngineInterface): Promise<Record<string, number>> {
  return read($, hscroll)
}

export function updateHscroll($: EngineInterface, change: Change<Record<string, number>>) {
  return update($, hscroll, change)
}

let lastView: PaneView | undefined

export function paneView(): PaneView | undefined {
  return lastView
}

export function rememberPaneView(view: PaneView) {
  lastView = view
}

const askedWork = new Map<string, { signature: string; work: DocWork }>()

export function forgetWork() {
  askedWork.clear()
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high))
}

export function cut(text: string, room: number): string {
  const chars = [...text]
  return chars.length <= room ? text : `${chars.slice(0, Math.max(0, room - 1)).join('')}…`
}

export function keyOf(path: string): string {
  return path.toLowerCase()
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function workId(relativePath: string): string | undefined {
  return /^work\/([^/]+)\//.exec(relativePath.replace(/\\/g, '/'))?.[1]
}

export function statusLine(work: DocWork): string {
  const parts = [`work ${work.id}`, work.lane, work.status]
  if (work.total > 0) parts.push(`phase ${work.approved}/${work.total} approved`)
  if (work.done > work.approved) parts.push(`${work.done - work.approved} awaiting review`)
  return parts.filter(part => part !== '').join(' · ')
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

export async function remember($: EngineInterface, paths: readonly string[]) {
  if (paths.length === 0) return
  const found = await existing($, await $.session.cwd(), paths)
  if (found.size === 0) return
  await update($, files, list => {
    const known = new Set(list.map(keyOf))
    const added = [...found].filter(file => !known.has(keyOf(file)))
    return added.length === 0 ? list : [...list, ...added].slice(-MAX_FILES)
  })
}

export function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(block => (block !== null && typeof block === 'object' && 'text' in block && typeof block.text === 'string' ? block.text : ''))
    .join('\n')
}

export function toolPath(input: unknown): string | undefined {
  if (input === null || typeof input !== 'object' || !('file_path' in input)) return undefined
  const path = input.file_path
  return typeof path === 'string' && isMarkdownPath(path) ? path : undefined
}

export async function rememberMessages($: EngineInterface) {
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
}

export async function link($: EngineInterface, text: string, base: string) {
  const paths = candidatePaths(text)
  if (paths.length === 0) return { text, hrefs: [] }
  return linkPaths(text, base, await existing($, base, paths))
}

async function modifiedAt($: EngineInterface, path: string): Promise<number | null> {
  try {
    return (await $.fs.stat(path)).mtimeMs
  } catch {
    return null
  }
}

async function entryCount($: EngineInterface, dir: string): Promise<number> {
  try {
    return (await $.fs.list(dir)).length
  } catch {
    return 0
  }
}

async function workSignature($: EngineInterface, base: string): Promise<string | null> {
  const state = await modifiedAt($, `${base}/state.yaml`)
  if (state === null) return null
  const artifacts = await Promise.all(WORK_ARTIFACTS.map(name => modifiedAt($, `${base}/${name}`)))
  return JSON.stringify([state, ...artifacts, await entryCount($, `${base}/phases`)])
}

async function askKernel($: EngineInterface, id: string): Promise<DocWork | undefined> {
  const state = await runPicket<StateView>($, ['state', id])
  if (state === null) return undefined
  return {
    id,
    lane: state.lane,
    status: state.status,
    approved: state.phases_approved,
    done: state.phases.filter(phase => phase.done).length,
    total: state.phase_count,
  }
}

export async function workOf($: EngineInterface, path: string): Promise<DocWork | undefined> {
  const cwd = (await $.session.cwd()).replace(/\\/g, '/').replace(/\/$/, '')
  const id = workId(relative(cwd, path))
  if (id === undefined) return undefined
  const signature = await workSignature($, `${cwd}/work/${id}`)
  if (signature === null) return undefined
  const cached = askedWork.get(id)
  if (cached !== undefined && cached.signature === signature) return cached.work
  const work = await askKernel($, id)
  if (work !== undefined) askedWork.set(id, { signature, work })
  return work
}

export async function load($: EngineInterface, path: string): Promise<ViewedDoc> {
  try {
    const stat = await $.fs.stat(path)
    const text = await $.fs.read(path)
    const work = await workOf($, path)
    return { path, text, mtimeMs: stat.mtimeMs, ...(work !== undefined && { work }) }
  } catch (error) {
    return { path, text: '', error: message(error) }
  }
}

export function closedFolders(dirs: readonly string[], chosen: Readonly<Record<string, boolean>>, current: string | undefined) {
  return Object.fromEntries(dirs.map(dir => [dir, chosen[dir] === undefined ? dir !== current : !chosen[dir]]))
}
