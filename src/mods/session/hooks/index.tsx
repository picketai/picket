import type { Register } from 'claude-code'

const RETIRED_NOTICE =
  'picket-session is retired: the session list is now the work pane of picket-status (/picket-session). Uninstall it: claude plugin uninstall picket-session@picketai --scope project'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.ui.toast(RETIRED_NOTICE)
    return next(e)
  })
}
