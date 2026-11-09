import type { EngineInterface, RenderInput } from 'claude-code'

import { modEnabled } from '../../../lib/shared/mod-switch.mts'
import { resetLaunchers } from '../../shared/kernel'
import { readProjectConfig } from '../../shared/project-config'
import type { Next } from '../../types'
import { noteFileTool, refresh, scrollPane, show, toggle, type Toggled } from './actions'
import { addFiles, forgetWork, link, PANE, remember, rememberMessages, textOf, toolPath } from './data'
import { candidatePaths, fromHref, resolvePath } from './links'
import { renderPane, renderReply } from './view'

const POLL_MS = 2000
const FILE_TOOLS = ['Read', 'Write', 'Edit']
const COMMAND = 'picket-markdown'
const MOD_NAME = 'markdown'

type AppendedMessage = { agentId?: string; message: { role: string; content: unknown } }

let isOff = false

function toggleReply(toggled: Toggled): string {
  if (toggled.kind === 'closed') return 'Markdown pane closed.'
  return toggled.path === null ? `Opened the empty pane: /${COMMAND} <path> shows a markdown file` : `Reopened ${toggled.path}`
}

export const DOC_PANE = PANE

export async function startMarkdown<E, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  isOff = !modEnabled(await readProjectConfig($), MOD_NAME)
  if (isOff) return next(e)
  resetLaunchers()
  forgetWork()
  await $.command.register({
    name: COMMAND,
    description: 'Open a markdown file read-only in the side pane',
    argumentHint: '[path]',
    immediate: true,
  })
  await rememberMessages($)
  $.clock.every(POLL_MS, () => {
    refresh($, false).catch(() => {})
  })
  return next(e)
}

export async function rememberReply<E extends AppendedMessage, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  if (isOff) return next(e)
  const stored = await next(e)
  if (e.agentId === undefined && e.message.role === 'assistant') await remember($, candidatePaths(textOf(e.message.content)))
  return stored
}

export async function noteFileCall<E extends { tool: unknown }, R>($: EngineInterface, e: E, next: Next<E, R>): Promise<R> {
  if (isOff) return next(e)
  const ran = await next(e)
  const tool = String(e.tool)
  const asked = FILE_TOOLS.includes(tool) ? toolPath(e) : undefined
  if (asked !== undefined) await noteFileTool($, tool, asked)
  return ran
}

export async function runMarkdownCommand($: EngineInterface, e: { args: string }) {
  const asked = e.args.trim().replace(/^["']|["']$/g, '')
  if (asked === '') return { text: toggleReply(await toggle($)) }
  const path = resolvePath(await $.session.cwd(), asked)
  const opened = await show($, path)
  return { text: opened.isPlaced ? `Opened ${path}` : `Opened ${path} (the pane waits for a wider terminal)` }
}

export async function renderLinkedReply<R>($: EngineInterface, e: RenderInput<'AssistantMessage'>, next: Next<RenderInput<'AssistantMessage'>, R>) {
  if (isOff || e.surface !== 'terminal' || e.props.isSummary) return next(e)
  const linked = await link($, e.props.text, await $.session.cwd())
  if (linked.hrefs.length === 0) return next(e)
  $.clock.after(0, () => {
    addFiles($, linked.hrefs.map(fromHref)).catch(() => {})
  })
  return renderReply($, e, linked)
}

export async function scrollDocPane($: EngineInterface, e: { by: number; pointer?: { row: number } }) {
  await scrollPane($, e.pointer?.row, e.by)
  return {}
}

export function renderDocPane($: EngineInterface, e: RenderInput<'Pane'>) {
  return renderPane($, e)
}
