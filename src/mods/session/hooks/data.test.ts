import { describe, expect, test } from 'claude-code/testing'

import type { AgentRow } from '../types'
import { contextPercent, groupAgents, merge, parseWork, progressOf, tally } from './data'

const row = (change: Partial<AgentRow>): AgentRow => ({
  id: 'a',
  name: 'developer',
  type: 'picket:developer',
  description: 'Implement phase 1',
  status: 'running',
  model: null,
  effort: null,
  contextTokens: null,
  tool: null,
  lastTool: null,
  workId: null,
  phase: null,
  phases: null,
  startedAt: 0,
  endedAt: null,
  ...change,
})

describe('data', () => {
  test('context reads against a 1M window', async () => {
    expect(contextPercent(31_000)).toBe(3)
  })

  test('work id and phase come from a lead message', async () => {
    const message = 'Phase 2 next.\nwork: 20261010-ship-x\nphase: 2\nrun through 2'
    expect(parseWork(message)).toEqual({ workId: '20261010-ship-x', phase: 2 })
    expect(parseWork('no fields here')).toEqual({ workId: null, phase: null })
  })

  test('progress shows phase n of total, and context fill without one', async () => {
    expect(progressOf(row({ phase: 1, phases: 2, tool: 'Edit' }))).toEqual({
      label: '1/2 · Edit',
      fraction: 0.25,
      isMeasured: true,
    })
    expect(progressOf(row({ phase: 2, phases: 2, status: 'completed' })).fraction).toBe(1)
    expect(progressOf(row({ contextTokens: 50_000 })).isMeasured).toBe(false)
  })

  test('agents fall into running, idle and finished groups', async () => {
    const agents = [
      row({ id: 'r', status: 'running' }),
      row({ id: 'p', status: 'pending' }),
      row({ id: 'i', status: 'idle' }),
      row({ id: 'w', status: 'waiting' }),
      row({ id: 'c', status: 'completed' }),
    ]
    const grouped = groupAgents(agents)
    expect(grouped.running.map(agent => agent.id)).toEqual(['r', 'p'])
    expect(grouped.idle.map(agent => agent.id)).toEqual(['i', 'w'])
    expect(grouped.finished.map(agent => agent.id)).toEqual(['c'])
    expect(tally(grouped)).toBe('2 running · 2 idle · 1 done')
    expect(tally(groupAgents([row({ status: 'running' })]))).toBe('1 running · 0 done')
  })

  test('merge stamps the end of a finished agent and clears it when the agent runs again', async () => {
    const info = { id: 'a', type: 'picket:developer', name: 'developer', description: 'Implement phase 1' }
    const ended = merge([row({ tool: 'Edit' })], [{ ...info, status: 'completed' }], 50)
    expect(ended[0]).toMatchObject({ status: 'completed', endedAt: 50, tool: null })
    expect(merge(ended, [{ ...info, status: 'running' }], 90)[0]?.endedAt).toBe(null)
  })
})
