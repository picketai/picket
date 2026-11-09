import type { Register } from 'claude-code'

import {
  DOC_PANE,
  noteFileCall,
  rememberReply,
  renderDocPane,
  renderLinkedReply,
  runMarkdownCommand,
  scrollDocPane,
  startMarkdown,
} from './markdown/hooks/index'
import {
  noteSend,
  noteSpawn,
  noteTurnEnd,
  renderBand,
  renderWorkPane,
  runSessionCommand,
  scrollWorkPane,
  startStatus,
  watchPicketCalls,
  WORK_PANE,
} from './status/hooks/index'

export const register: Register = on => {
  on('session.start', ($, e, next) => startStatus($, e, started => startMarkdown($, started, next)))

  on('command.run', { command: 'picket-session' }, $ => runSessionCommand($))
  on('ui.scroll', { component: 'Pane', requestId: WORK_PANE }, ($, e) => scrollWorkPane($, e)).catch(($, e, next) => next(e))
  on('ui.render', { component: 'Pane', requestId: WORK_PANE }, ($, e) => renderWorkPane($, e))
  on('tool.call', { tool: 'Bash' }, ($, e, next) => watchPicketCalls($, e, next)).catch(($, e, next) => next(e))
  on('agent.spawn', ($, e, next) => noteSpawn($, e, next)).catch(($, e, next) => next(e))
  on('session.send', ($, e, next) => noteSend($, e, next)).catch(($, e, next) => next(e))
  on('turn.complete', ($, e, next) => noteTurnEnd($, e, next)).catch(($, e, next) => next(e))
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => renderBand($, e, next))

  on('session.append', ($, e, next) => rememberReply($, e, next)).catch(($, e, next) => next(e))
  on('tool.call', ($, e, next) => noteFileCall($, e, next)).catch(($, e, next) => next(e))
  on('command.run', { command: 'picket-markdown' }, ($, e) => runMarkdownCommand($, e))
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => renderLinkedReply($, e, next))
  on('ui.scroll', { component: 'Pane', requestId: DOC_PANE }, ($, e) => scrollDocPane($, e)).catch(($, e, next) => next(e))
  on('ui.render', { component: 'Pane', requestId: DOC_PANE }, ($, e) => renderDocPane($, e))
}
