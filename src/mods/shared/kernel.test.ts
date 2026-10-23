import { expect, test } from 'claude-code/testing'
import type { EngineInterface, ProcessRunResult } from 'claude-code'

import { resetLaunchers, runPicket } from './kernel'

type Run = { argv: readonly string[]; timeoutMs: number | undefined }

const exited = (exitCode: number, stdout: string): ProcessRunResult => ({
  exitCode,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const engine = (answer: (argv: readonly string[]) => ProcessRunResult) => {
  const runs: Run[] = []
  const $ = {
    process: {
      run: async (argv: readonly string[], options?: { timeoutMs?: number }) => {
        runs.push({ argv, timeoutMs: options?.timeoutMs })
        return answer(argv)
      },
    },
  } as unknown as EngineInterface
  return { $, runs }
}

const cannotStart = (): ProcessRunResult => {
  throw new Error('ENOENT')
}

test('a picket that cannot start falls back to cmd /c picket and keeps it for later calls', async () => {
  resetLaunchers()
  const { $, runs } = engine(argv => (argv[0] === 'picket' ? cannotStart() : exited(0, '{"phase_count":3}')))

  expect(await runPicket<{ phase_count: number }>($, ['state', 'w1'])).toEqual({ phase_count: 3 })
  expect(await runPicket($, ['state', 'w2'])).toEqual({ phase_count: 3 })
  expect(runs.map(run => run.argv)).toEqual([
    ['picket', 'state', 'w1'],
    ['cmd', '/c', 'picket', 'state', 'w1'],
    ['cmd', '/c', 'picket', 'state', 'w2'],
  ])
})

test('no launcher that starts gives null and stops trying until the launchers are reset', async () => {
  resetLaunchers()
  const { $, runs } = engine(cannotStart)

  expect(await runPicket($, ['state', 'w1'])).toBe(null)
  expect(await runPicket($, ['state', 'w1'])).toBe(null)
  expect(runs.length).toBe(2)
  resetLaunchers()
  await runPicket($, ['state', 'w1'])
  expect(runs.length).toBe(4)
})

test('a non-zero exit and an answer that is not JSON give null', async () => {
  resetLaunchers()
  const answers = [exited(2, '{"phase_count":3}'), exited(0, 'not json')]
  const { $ } = engine(() => answers.shift() ?? exited(1, ''))

  expect(await runPicket($, ['state', 'w1'])).toBe(null)
  expect(await runPicket($, ['state', 'w1'])).toBe(null)
})

test('a good answer is parsed, with the timeout passed through', async () => {
  resetLaunchers()
  const { $, runs } = engine(() => exited(0, '{"id":"w1","phase_count":2}'))

  expect(await runPicket($, ['state', 'w1'], { timeoutMs: 3_000 })).toEqual({ id: 'w1', phase_count: 2 })
  await runPicket($, ['state', 'w1'])
  expect(runs.map(run => run.timeoutMs)).toEqual([3_000, 10_000])
})
