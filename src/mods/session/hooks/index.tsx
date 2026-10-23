import type { EngineInterface, Register } from 'claude-code'

import { resetLaunchers } from '../../shared/kernel'
import { scrollPane } from './actions'
import {
  addSpawned,
  applyLeadMessage,
  PADDING,
  recordStep,
  recordTool,
  refreshSessions,
  SESSIONS_MS,
  tickAgents,
} from './data'
import { renderPane } from './view'

const PANE = 'picket-session'
const TITLE = 'Agents'
const PANE_COLUMNS = 48 + 2 * PADDING
const TICK_MS = 1000

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    resetLaunchers()
    await $.command.register({ name: 'picket-session', description: 'Show or hide the agents sidebar' })
    void openPane($)
    $.clock.every(TICK_MS, () => tickAgents($))
    void refreshSessions($)
    $.clock.every(SESSIONS_MS, () => void refreshSessions($))
    return started
  })

  on('command.run', { command: 'picket-session' }, async $ => {
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Agents sidebar closed.' }
    }
    await openPane($)
    return { text: 'Agents sidebar opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.agentId !== undefined) {
      await addSpawned($, {
        id: result.agentId,
        type: e.subagentType,
        description: e.description,
        model: result.model ?? null,
        prompt: e.prompt,
      })
    }
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'SendMessage' }, async ($, e, next) => {
    const sent = await next(e)
    const text = typeof e.message === 'string' ? e.message : ''
    if (e.agentId === undefined && text !== '') {
      await applyLeadMessage($, String(e.to), text)
    }
    return sent
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (e.agentId !== undefined) {
      await recordStep($, { id: e.agentId, model: e.model, effort: e.effort, usage: result.usage })
    }
    return result
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id === undefined) {
      return next(e)
    }
    await recordTool($, id, { tool: e.tool })
    const ran = await next(e)
    await recordTool($, id, { tool: null, lastTool: e.tool })
    return ran
  }).catch(($, e, next) => next(e))

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await scrollPane($, { bodyRows: e.bodyRows, row: e.pointer?.row, by: e.by })
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => renderPane($, e))
}
