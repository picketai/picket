import type { Register } from 'claude-code'

import { resetLaunchers } from '../../shared/kernel'
import { noteFileTool, refresh, reopen, scrollPane, show } from './actions'
import { forgetWork, link, PANE, remember, rememberMessages, textOf, toolPath } from './data'
import { candidatePaths, resolvePath } from './links'
import { renderPane, renderReply } from './view'

const POLL_MS = 2000
const FILE_TOOLS = ['Read', 'Write', 'Edit']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    resetLaunchers()
    forgetWork()
    await $.command.register({
      name: 'md',
      description: 'Open a markdown file read-only in the side pane',
      argumentHint: '[path]',
    })
    await rememberMessages($)
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
    const asked = FILE_TOOLS.includes(tool) ? toolPath(e) : undefined
    if (asked !== undefined) await noteFileTool($, tool, asked)
    return ran
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'md' }, async ($, e) => {
    const asked = e.args.trim().replace(/^["']|["']$/g, '')
    if (asked === '') {
      const reopened = await reopen($)
      return { text: reopened === null ? 'Usage: /md <path to a markdown file>' : `Reopened ${reopened}` }
    }
    const path = resolvePath(await $.session.cwd(), asked)
    const opened = await show($, path)
    return { text: opened.isPlaced ? `Opened ${path}` : `Opened ${path} (the pane waits for a wider terminal)` }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)
    const linked = await link($, e.props.text, await $.session.cwd())
    if (linked.hrefs.length === 0) return next(e)
    return renderReply($, e, linked)
  })

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await scrollPane($, e.pointer?.row, e.by)
    return {}
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => renderPane($, e))
}
