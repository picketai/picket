import { atom, read, update } from 'claude-code'
import type { EngineInterface, UiPressArgument } from 'claude-code'

import type { ListRowView } from '../../../lib/shared/views.mts'
import { runPicket } from '../../shared/kernel'
import type { PaneTab, PaneView, SessionEntry } from '../types'
import { deleteTranscript, isDeletable, listSessions, renameSession } from './session-files'

export const DELETE_ALL = 'all'

export const PANE = 'work'
export const PANE_TITLE = 'Work'
export const PANE_COLUMNS = 50
export const DONE_KEY = 'done-sessions'

const VIEW_DEFAULTS: PaneView = { tab: 'active', selectedId: null, renamingId: null, confirm: null, offset: 0 }

const rows = atom({ plugin: 'picket-status', key: 'rows' } as const, [] as ListRowView[])

const sessions = atom({ plugin: 'picket-status', key: 'sessions' } as const, [] as SessionEntry[])

const done = atom({ plugin: 'picket-status', key: 'done' } as const, [] as string[])

const paneView = atom({ plugin: 'picket-status', key: 'paneView' } as const, VIEW_DEFAULTS)

export function readRows($: EngineInterface) {
  return read($, rows)
}

export function readSessions($: EngineInterface) {
  return read($, sessions)
}

export function readDone($: EngineInterface) {
  return read($, done)
}

export function readPaneView($: EngineInterface) {
  return read($, paneView)
}

function updateView($: EngineInterface, change: Partial<PaneView>) {
  return update($, paneView, current => ({ ...current, ...change }))
}

const storedIds = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])

export async function refreshPane($: EngineInterface) {
  const [entries, listed, stored] = await Promise.all([listSessions($), runPicket<ListRowView[]>($, ['list']), $.store.get(DONE_KEY)])
  await update($, sessions, () => entries)
  if (listed !== null) await update($, rows, () => listed)
  await update($, done, () => storedIds(stored))
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

export async function select($: EngineInterface, id: string) {
  const view = await read($, paneView)
  await updateView($, { selectedId: view.selectedId === id ? null : id })
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
