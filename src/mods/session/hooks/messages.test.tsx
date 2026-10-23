import { expect, mock, test } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

const START = { cwd: 'D:/repo', surface: 'terminal', isInteractive: true } as const
const NOW = Date.parse('2026-10-23T10:00:00Z')

const developer = (): AgentInfo => ({ id: 'a1', type: 'picket:developer', name: 'developer', status: 'running', description: 'implement phase 2' })

const SPAWN = {
  tool_use_id: 'tu1',
  prompt: 'work: w1\nphase: 2',
  description: 'implement phase 2',
  subagentType: 'picket:developer',
  provider: { plugin: 'test', tier: 'user' },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
} as const

const stateAnswer = { exitCode: 0, stdout: '{"phase_count":3}', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }

const engineAround = (on: On, order: string[]) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }))
  on('session.root', () => ({ value: 'D:/repo' }))
  on('session.id', () => ({ value: 'current-session' }))
  on('env.get', () => ({ value: 'D:/home/.claude' }))
  on('fs.list', () => ({ value: [] }))
  on('store.get', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [developer()] }))
  on('agent.spawn', () => {
    order.push('spawned')
    return { model: 'claude-opus-5-5', agentId: 'a1' }
  })
  on('tool.call', ($, e) => {
    order.push(`delivered to ${String(e.to)}`)
    return { result: { isDelivered: true } }
  })
}

test('a lead message reaches its agent before picket state is asked for its work line', async ($, on) => {
  const order: string[] = []
  const timer = mock.clock(on, { now: NOW })
  engineAround(on, order)
  on('process.run', ($, e) => {
    order.push(e.argv.join(' '))
    return { value: stateAnswer }
  })

  await $.session.start(START)
  await timer.advance(1_000)
  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'work: w1\nphase: 2' })

  expect(order).toEqual(['delivered to developer', 'picket state w1'])
})

test('a lead message is delivered once when the work line update after it throws', async ($, on) => {
  const order: string[] = []
  const timer = mock.clock(on, { now: NOW })
  engineAround(on, order)
  on('process.run', () => ({ value: null }))

  await $.session.start(START)
  await timer.advance(1_000)
  await $.tool.call({ tool: 'SendMessage', to: 'developer', message: 'work: w1\nphase: 2' })

  expect(order).toEqual(['delivered to developer'])
})

test("an agent's tool runs once when the tool update after it throws", async ($, on) => {
  const order: string[] = []
  engineAround(on, order)
  let writes = 0
  on('state.set', () => {
    writes += 1
    return writes === 1 ? { value: { isSet: true } } : { deny: 'state store unavailable' }
  })

  await $.tool.call({ tool: 'Edit', agentId: 'a1', file_path: 'D:/repo/a.md' })

  expect(order).toEqual(['delivered to undefined'])
  expect(writes).toBe(2)
})

test('an agent is spawned once when the row update after it throws', async ($, on) => {
  const order: string[] = []
  engineAround(on, order)
  on('clock.now', () => ({ deny: 'no clock' }))
  on('process.run', ($, e) => {
    order.push(e.argv.join(' '))
    return { value: stateAnswer }
  })

  expect(await $.agent.spawn(SPAWN)).toEqual({ model: 'claude-opus-5-5', agentId: 'a1' })
  expect(order).toEqual(['spawned'])
})
