import { expect, mock, test } from 'claude-code/testing'
import type { AgentInfo } from 'claude-code'

const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const

const developer = (): AgentInfo => ({ id: 'a1', type: 'picket:developer', name: 'developer', status: 'running', description: 'implement phase 2' })

test('a lead message reaches its agent before picket state is asked for its work line', async ($, on) => {
  const order: string[] = []
  const timer = mock.clock(on, { now: Date.parse('2026-10-23T10:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('session.root', () => ({ value: 'D:/repo' }))
  on('session.id', () => ({ value: 'current-session' }))
  on('env.get', () => ({ value: 'D:/home/.claude' }))
  on('fs.list', () => ({ value: [] }))
  on('store.get', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [developer()] }))
  on('tool.call', ($, e) => {
    order.push(`delivered to ${String(e.to)}`)
    return { result: { isDelivered: true } }
  })
  on('process.run', ($, e) => {
    order.push(e.argv.join(' '))
    return { value: { exitCode: 0, stdout: '{"phase_count":3}', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start(START)
  await timer.advance(1_000)
  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'work: w1\nphase: 2' })

  expect(order).toEqual(['delivered to developer', 'picket state w1'])
})
