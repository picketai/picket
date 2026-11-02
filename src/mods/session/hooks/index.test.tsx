import { expect, test } from 'claude-code/testing'

const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const

test('on session start the retired stub raises one uninstall toast and registers no command (T-3.1)', async ($, on) => {
  const toasts: string[] = []
  const registered: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('command.register', ($, e) => {
    registered.push(e.name)
    return { value: undefined }
  })

  await $.session.start(START)

  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('claude plugin uninstall picket-session@picketai --scope project')
  expect(registered).toEqual([])
})
