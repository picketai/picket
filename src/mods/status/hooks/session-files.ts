import type { EngineInterface } from 'claude-code'

import type { SessionEntry } from '../../types'
import { projectSlug, TITLE_RECORD, titleOf } from './sessions'

const MAX_TRANSCRIPT_BYTES = 4 * 1024 * 1024
const TRANSCRIPT = '.jsonl'
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const UNLINK = 'require("fs").unlinkSync(process.argv[1])'

export const isDeletable = (entry: SessionEntry): boolean => !entry.isCurrent && !entry.isLive && SESSION_ID.test(entry.id)

const titles = new Map<string, string>()

type LiveSession = { name: string | null }

export async function configDir($: EngineInterface): Promise<string> {
  const override = await $.env.get('CLAUDE_CONFIG_DIR')
  if (override) {
    return override
  }
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  return `${home}/.claude`
}

export async function transcriptFolder($: EngineInterface): Promise<string> {
  const [dir, root] = await Promise.all([configDir($), $.session.root()])
  return `${dir}/projects/${projectSlug(root)}`
}

export async function transcriptPath($: EngineInterface, id: string): Promise<string> {
  return `${await transcriptFolder($)}/${id}${TRANSCRIPT}`
}

async function liveSessions($: EngineInterface, dir: string, root: string) {
  const live = new Map<string, LiveSession>()
  const files = await $.fs.list(`${dir}/sessions`).catch(() => [])
  for (const file of files.filter(entry => entry.name.endsWith('.json'))) {
    try {
      const text = await $.fs.read(`${dir}/sessions/${file.name}`)
      const info = JSON.parse(typeof text === 'string' ? text : '{}') as Record<string, unknown>
      if (typeof info.sessionId === 'string' && info.cwd === root) {
        live.set(info.sessionId, { name: info.nameSource === 'user' && typeof info.name === 'string' ? info.name : null })
      }
    } catch {
      continue
    }
  }
  return live
}

const TITLE_SCAN = [
  'const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\\n")',
  `const re = ${TITLE_RECORD.toString()}`,
  'console.log(lines.filter(l => re.test(l)).slice(-50).join("\\n"))',
].join(';')

async function readTitleRecords($: EngineInterface, path: string, size: number): Promise<string> {
  if (size <= MAX_TRANSCRIPT_BYTES) {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : ''
  }
  const scan = await $.process.run(['node', '-e', TITLE_SCAN, path])
  return scan.exitCode === 0 ? scan.stdout : ''
}

async function transcriptTitle($: EngineInterface, path: string, id: string, mtimeMs: number, size: number) {
  const cacheKey = `${id}:${mtimeMs}`
  const cached = titles.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  const fallback = `Session ${id.slice(0, 8)}`
  const title = await readTitleRecords($, path, size)
    .then(text => titleOf(text) ?? fallback)
    .catch(() => fallback)
  titles.set(cacheKey, title)
  return title
}

export async function listTranscriptIds($: EngineInterface): Promise<string[]> {
  const files = await $.fs.list(await transcriptFolder($)).catch(() => [])
  return files.filter(one => one.kind === 'file' && one.name.endsWith(TRANSCRIPT)).map(one => one.name.slice(0, -TRANSCRIPT.length))
}

export async function listSessions($: EngineInterface): Promise<SessionEntry[]> {
  const [dir, root, currentId] = await Promise.all([configDir($), $.session.root(), $.session.id()])
  const folder = `${dir}/projects/${projectSlug(root)}`
  const [files, live] = await Promise.all([$.fs.list(folder).catch(() => []), liveSessions($, dir, root)])
  const entries: SessionEntry[] = []
  for (const file of files.filter(one => one.kind === 'file' && one.name.endsWith(TRANSCRIPT))) {
    const id = file.name.slice(0, -TRANSCRIPT.length)
    const running = live.get(id)
    entries.push({
      id,
      title: running?.name ?? (await transcriptTitle($, `${folder}/${file.name}`, id, file.mtimeMs, file.size)),
      mtimeMs: file.mtimeMs,
      size: file.size,
      isLive: running !== undefined,
      isCurrent: id === currentId,
    })
  }
  return entries
}

export async function deleteTranscript($: EngineInterface, entry: SessionEntry): Promise<boolean> {
  if (!isDeletable(entry)) {
    $.ui.toast('Only a closed session can be deleted.')
    return false
  }
  const removed = await $.process
    .run(['node', '-e', UNLINK, await transcriptPath($, entry.id)])
    .catch(() => ({ exitCode: 1 }))
  if (removed.exitCode !== 0) {
    $.ui.toast(`Could not delete "${entry.title}".`)
    return false
  }
  return true
}

async function appendName($: EngineInterface, path: string, id: string, name: string) {
  const text = await $.fs.read(path)
  if (typeof text !== 'string') {
    throw new Error('unreadable transcript')
  }
  const record = JSON.stringify({ type: 'agent-name', agentName: name, sessionId: id })
  await $.fs.write(path, `${text}${text.endsWith('\n') ? '' : '\n'}${record}\n`)
}

export async function renameSession($: EngineInterface, entry: SessionEntry, name: string): Promise<boolean> {
  try {
    if (entry.isCurrent) {
      await $.command.run({ command: 'rename', args: name })
      return true
    }
    if (entry.isLive) {
      $.ui.toast('That session is open in another window; rename it there.')
      return false
    }
    await appendName($, await transcriptPath($, entry.id), entry.id, name)
    return true
  } catch {
    $.ui.toast(`Could not rename "${entry.title}".`)
    return false
  }
}
