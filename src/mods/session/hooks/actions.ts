import type { EngineInterface } from 'claude-code'

import type { AgentGroup, SessionEntry, View } from '../types'
import { ARCHIVED_KEY, layout, limits, PADDING, readSessions, transcriptPath, updateSessions, updateView } from './data'

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function toggleArchived($: EngineInterface, id: string) {
  const current = await readSessions($)
  const archived = current.archived.includes(id)
    ? current.archived.filter(one => one !== id)
    : [...current.archived, id]
  await $.store.set(ARCHIVED_KEY, archived)
  await updateSessions($, s => ({ ...s, archived }))
}

export async function deleteSession($: EngineInterface, entry: SessionEntry) {
  await updateView($, current => ({ ...current, confirmId: null }))
  if (entry.isCurrent || entry.isLive || !SESSION_ID.test(entry.id)) {
    $.ui.toast('Only a closed session can be deleted.')
    return
  }
  const path = await transcriptPath($, entry.id)
  const removed = await $.process
    .run(['node', '-e', 'require("fs").unlinkSync(process.argv[1])', path])
    .catch(() => ({ exitCode: 1 }))
  if (removed.exitCode !== 0) {
    $.ui.toast(`Could not delete "${entry.title}".`)
    return
  }
  const archived = (await readSessions($)).archived.filter(id => id !== entry.id)
  await $.store.set(ARCHIVED_KEY, archived)
  await updateSessions($, current => ({
    entries: current.entries.filter(one => one.id !== entry.id),
    archived,
  }))
}

export async function switchTo($: EngineInterface, entry: SessionEntry) {
  if (entry.isCurrent) {
    $.ui.toast('This is the current session.')
    return
  }
  try {
    await $.command.run({ command: 'resume', args: entry.id })
  } catch {
    await $.prompt.fill({ text: `/resume ${entry.id}` })
    $.ui.toast(`Could not switch directly; press Enter to switch to "${entry.title}".`)
  }
}

async function appendName($: EngineInterface, path: string, id: string, name: string) {
  const text = await $.fs.read(path)
  if (typeof text !== 'string') {
    throw new Error('unreadable transcript')
  }
  const record = JSON.stringify({ type: 'agent-name', agentName: name, sessionId: id })
  await $.fs.write(path, `${text}${text.endsWith('\n') ? '' : '\n'}${record}\n`)
}

export async function rename($: EngineInterface, entry: SessionEntry, value: string) {
  const name = value.trim()
  await updateView($, current => ({ ...current, renamingId: null }))
  if (name === '' || name === entry.title) {
    return
  }
  try {
    if (entry.isCurrent) {
      await $.command.run({ command: 'rename', args: name })
    } else if (entry.isLive) {
      $.ui.toast('That session is open in another window; rename it there.')
      return
    } else {
      await appendName($, await transcriptPath($, entry.id), entry.id, name)
    }
    await updateSessions($, s => ({
      ...s,
      entries: s.entries.map(one => (one.id === entry.id ? { ...one, title: name } : one)),
    }))
  } catch {
    $.ui.toast(`Could not rename "${entry.title}".`)
  }
}

export function selectTab($: EngineInterface, tab: View['tab']) {
  return updateView($, current => ({ ...current, tab, confirmId: null }))
}

export function askDelete($: EngineInterface, id: string) {
  return updateView($, current => ({ ...current, confirmId: id }))
}

export function cancelDelete($: EngineInterface) {
  return updateView($, current => ({ ...current, confirmId: null }))
}

export function startRename($: EngineInterface, id: string) {
  return updateView($, current => ({ ...current, renamingId: id }))
}

export function toggleGroup($: EngineInterface, group: AgentGroup) {
  return updateView($, current => ({
    ...current,
    closedGroups: current.closedGroups.includes(group)
      ? current.closedGroups.filter(one => one !== group)
      : [...current.closedGroups, group],
  }))
}

export function toggleCompact($: EngineInterface) {
  return updateView($, current => ({ ...current, isCompact: !current.isCompact }))
}

export function scrollPane($: EngineInterface, scroll: { bodyRows: number; row: number | undefined; by: number }) {
  const { topRows } = layout(scroll.bodyRows)
  const isOverSessions = scroll.row !== undefined && scroll.row < PADDING + topRows
  return updateView($, current =>
    isOverSessions
      ? { ...current, sessionsOffset: Math.max(0, Math.min(current.sessionsOffset + scroll.by, limits.sessions)) }
      : { ...current, agentsOffset: Math.max(0, Math.min(current.agentsOffset + scroll.by, limits.agents)) },
  )
}
