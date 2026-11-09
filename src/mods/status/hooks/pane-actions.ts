import { atom, read, update } from 'claude-code'
import type { EngineInterface, UiPressArgument } from 'claude-code'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { runPicket } from '../../shared/kernel'
import type { BandEntry, FoldableGroup, PaneTab, PaneView, SessionEntry } from '../../types'
import { deleteTranscript, isDeletable, listSessions, listTranscriptIds, renameSession } from './session-files'
import { activeSessionCount, needYouCount, watchedIds, workSignature, type WorkStat } from './watch'

export const DELETE_ALL = 'all'

export const PANE = 'work'
export const PANE_TITLE = 'Work'
export const PANE_COLUMNS = 50
export const DONE_KEY = 'done-sessions'

const VIEW_DEFAULTS: PaneView = { tab: 'active', selectedId: null, renamingId: null, confirm: null, offset: 0, folded: ['none'] }

const rows = atom({ plugin: 'picket', key: 'rows' } as const, [] as ListRowView[])

const sessions = atom({ plugin: 'picket', key: 'sessions' } as const, [] as SessionEntry[])

const done = atom({ plugin: 'picket', key: 'done' } as const, [] as string[])

const paneView = atom({ plugin: 'picket', key: 'paneView' } as const, VIEW_DEFAULTS)

const transcriptIds = atom({ plugin: 'picket', key: 'transcriptIds' } as const, [] as string[])

const hasMarkdown = atom({ plugin: 'picket', key: 'hasMarkdown' } as const, false)

const currentId = atom({ plugin: 'picket', key: 'currentId' } as const, null as string | null)

export function readRows($: EngineInterface) {
  return read($, rows)
}

export function readSessions($: EngineInterface) {
  return read($, sessions)
}

export function readDone($: EngineInterface) {
  return read($, done)
}

export const viewOf = (stored: Partial<PaneView>): PaneView => ({ ...VIEW_DEFAULTS, ...stored })

export async function readPaneView($: EngineInterface) {
  return viewOf(await read($, paneView))
}

function updateView($: EngineInterface, change: Partial<PaneView>) {
  return update($, paneView, current => ({ ...current, ...change }))
}

const storedIds = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])

const watch = { signature: null as string | null }

async function workFolders($: EngineInterface, root: string): Promise<string[]> {
  const entries = await $.fs.list(`${root}/work`).catch(() => [])
  return entries.filter(entry => entry.kind === 'dir').map(entry => entry.name)
}

async function modifiedAt($: EngineInterface, path: string): Promise<number | null> {
  try {
    return (await $.fs.stat(path)).mtimeMs
  } catch {
    return null
  }
}

async function workStats($: EngineInterface, root: string, ids: readonly string[]): Promise<WorkStat[]> {
  const stats: WorkStat[] = []
  for (const id of ids) {
    const folder = `${root}/work/${id}`
    stats.push({ id, stateMs: await modifiedAt($, `${folder}/state.yaml`), verdictsMs: await modifiedAt($, `${folder}/verdicts.jsonl`) })
  }
  return stats
}

async function currentSignature($: EngineInterface, root: string): Promise<string> {
  const folders = await workFolders($, root)
  return workSignature(folders, await workStats($, root, watchedIds(folders, await read($, rows))))
}

export async function refreshRows($: EngineInterface, { force }: { force: boolean }) {
  const root = await $.session.root()
  const signature = await currentSignature($, root)
  if (!force && signature === watch.signature) return
  watch.signature = signature
  const listed = await runPicket<unknown>($, ['list'])
  if (!Array.isArray(listed)) return
  await update($, rows, () => listed as ListRowView[])
  watch.signature = await currentSignature($, root)
}

async function loadDone($: EngineInterface) {
  const stored = await $.store.get(DONE_KEY)
  await update($, done, () => storedIds(stored))
}

export async function refreshPane($: EngineInterface) {
  const entries = await listSessions($)
  await update($, sessions, () => entries)
  await refreshRows($, { force: true })
  await loadDone($)
}

export type BandParts = { hasMarkdown: boolean; hasWorkPane: boolean }

async function bandTranscriptIds($: EngineInterface, parts: BandParts): Promise<string[]> {
  return parts.hasWorkPane ? listTranscriptIds($) : []
}

export async function refreshBand($: EngineInterface, parts: BandParts) {
  const [ids, current] = await Promise.all([bandTranscriptIds($, parts), $.session.id().catch(() => null)])
  await update($, transcriptIds, () => ids)
  await update($, hasMarkdown, () => parts.hasMarkdown)
  await update($, currentId, () => current || null)
  await refreshRows($, { force: false })
}

export async function startBand($: EngineInterface, parts: BandParts) {
  if (parts.hasWorkPane) await loadDone($)
  await refreshBand($, parts)
}

export async function readBandEntry($: EngineInterface, hasWorkPane: boolean): Promise<BandEntry> {
  const [listed, ids, closed, markdown, current] = await Promise.all([read($, rows), read($, transcriptIds), read($, done), read($, hasMarkdown), read($, currentId)])
  return { needYou: needYouCount(listed, current), sessions: hasWorkPane ? activeSessionCount(ids, closed) : null, hasMarkdown: markdown }
}

export async function isPaneOpen($: EngineInterface): Promise<boolean> {
  return (await $.ui.panes()).some(pane => pane.id === PANE)
}

export async function togglePane($: EngineInterface): Promise<boolean> {
  if (await isPaneOpen($)) {
    await $.ui.close({ id: PANE })
    return false
  }
  await $.ui.open({ id: PANE, title: PANE_TITLE, columns: PANE_COLUMNS })
  await refreshPane($)
  return true
}

export function select($: EngineInterface, id: string) {
  return updateView($, { selectedId: id })
}

export function toggleGroup($: EngineInterface, group: FoldableGroup) {
  return update($, paneView, stored => {
    const { folded } = viewOf(stored)
    return { ...stored, folded: folded.includes(group) ? folded.filter(one => one !== group) : [...folded, group] }
  })
}

export function copyResume($: EngineInterface, id: string) {
  return (press: UiPressArgument) => {
    void $.ui.copy({ text: `claude --resume ${id}`, surface: press.surface }).then(result => {
      if (result.isCopied) $.ui.toast('Copied the resume command')
    })
  }
}

export function startRename($: EngineInterface, id: string) {
  return updateView($, { renamingId: id })
}

export async function submitRename($: EngineInterface, entry: SessionEntry, value: string) {
  const name = value.trim()
  await updateView($, { renamingId: null })
  if (name === '' || name === entry.title) return
  if (!(await renameSession($, entry, name))) return
  await update($, sessions, list => list.map(one => (one.id === entry.id ? { ...one, title: name } : one)))
}

async function saveDone($: EngineInterface, change: (ids: string[]) => string[]) {
  const ids = change(await read($, done))
  await $.store.set(DONE_KEY, ids)
  await update($, done, () => ids)
}

export function markDone($: EngineInterface, id: string) {
  return saveDone($, ids => (ids.includes(id) ? ids : [...ids, id]))
}

export function back($: EngineInterface, id: string) {
  return saveDone($, ids => ids.filter(one => one !== id))
}

export function askDelete($: EngineInterface, target: string) {
  return updateView($, { confirm: target })
}

export function cancelDelete($: EngineInterface) {
  return updateView($, { confirm: null })
}

async function forget($: EngineInterface, ids: readonly string[]) {
  await update($, sessions, list => list.filter(one => !ids.includes(one.id)))
  await saveDone($, list => list.filter(one => !ids.includes(one)))
}

export async function confirmDelete($: EngineInterface, entry: SessionEntry) {
  await cancelDelete($)
  if (await deleteTranscript($, entry)) await forget($, [entry.id])
}

export async function deleteAll($: EngineInterface, entries: readonly SessionEntry[]) {
  await cancelDelete($)
  const eligible = entries.filter(isDeletable)
  const deleted: string[] = []
  for (const entry of eligible) {
    if (await deleteTranscript($, entry)) deleted.push(entry.id)
  }
  await forget($, deleted)
  const skipped = entries.length - eligible.length
  $.ui.toast(`Deleted ${deleted.length} of ${entries.length} sessions${skipped > 0 ? `; skipped ${skipped} open or current` : ''}.`)
}

export function copyRemoveCommand($: EngineInterface, command: string) {
  return (press: UiPressArgument) => {
    void $.ui.copy({ text: command, surface: press.surface }).then(result => {
      if (result.isCopied) $.ui.toast('Copied the worktree remove command')
    })
  }
}

export function selectTab($: EngineInterface, tab: PaneTab) {
  return updateView($, { tab, selectedId: null, renamingId: null, confirm: null, offset: 0 })
}

export function scrollPane($: EngineInterface, by: number, maxOffset: number) {
  return update($, paneView, current => ({ ...current, offset: Math.max(0, Math.min(current.offset + by, maxOffset)) }))
}
