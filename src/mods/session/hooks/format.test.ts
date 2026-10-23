import { describe, expect, test } from 'claude-code/testing'

import type { AgentRow } from '../types'
import {
  clock,
  contextPercent,
  countPhases,
  groupAgents,
  isBlinking,
  tally,
  parseWork,
  prettyModel,
  progressOf,
  roleColor,
  sprite,
  toBase64,
} from './format'

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

describe('format', () => {
  test('the clock reads minutes and seconds', async () => {
    expect(clock(16_000)).toBe('0:16')
    expect(clock(44_900)).toBe('0:44')
    expect(clock(3_725_000)).toBe('1:02:05')
  })

  test('context reads against a 1M window', async () => {
    expect(contextPercent(31_000)).toBe(3)
  })

  test('work id and phase come from a lead message', async () => {
    const message = 'Phase 2 next.\nwork: 20261010-ship-x\nphase: 2\nrun through 2'
    expect(parseWork(message)).toEqual({ workId: '20261010-ship-x', phase: 2 })
    expect(parseWork('no fields here')).toEqual({ workId: null, phase: null })
  })

  test('phases are counted from the artifact frontmatter', async () => {
    const order = '---\nlane: order\nphases:\n  - n: 1\n    files: [a]\n  - n: 2\n    files: [b]\n---\n## Phase 1\n- n: 9'
    expect(countPhases(order)).toBe(2)
    expect(countPhases('# no frontmatter')).toBe(null)
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

  test('roles get their own colors', async () => {
    expect(roleColor('picket:reviewer')).toBe('#db61a2')
    expect(roleColor('Explore')).toBe('#8b949e')
  })

  test('base64 matches the standard alphabet with padding', async () => {
    expect(toBase64(new TextEncoder().encode('Man'))).toBe('TWFu')
    expect(toBase64(new TextEncoder().encode('Ma'))).toBe('TWE=')
    expect(toBase64(new TextEncoder().encode('M'))).toBe('TQ==')
  })

  test('a sprite is 12 by 6 cells of three words each', async () => {
    const cells = sprite('picket:developer', 0, false)
    expect(cells.length).toBe(Math.ceil((12 * 6 * 12) / 3) * 4)
  })

  test('a running head blinks on every fourth frame; a finished one keeps its eyes shut', async () => {
    expect([0, 1, 2, 3, 7].map(isBlinking)).toEqual([false, false, false, true, true])
    expect(sprite('picket:developer', 3, false)).not.toBe(sprite('picket:developer', 0, false))
    expect(sprite('picket:developer', 0, true)).not.toBe(sprite('picket:developer', 3, false))
  })

  test('the cheeks carry the role colour', async () => {
    expect(sprite('picket:developer', 0, false)).not.toBe(sprite('picket:reviewer', 0, false))
  })

  test('model ids read as their family and version', async () => {
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
  })
})
