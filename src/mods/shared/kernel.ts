import type { EngineInterface, ProcessRunResult } from 'claude-code'

const LAUNCHERS: readonly (readonly string[])[] = [['picket'], ['cmd', '/c', 'picket']]

const DEFAULT_TIMEOUT_MS = 10_000

const launch = { order: LAUNCHERS }

export const resetLaunchers = (): void => {
  launch.order = LAUNCHERS
}

const answerOf = <T>(result: ProcessRunResult): T | null => {
  if (result.exitCode !== 0) {
    return null
  }
  try {
    return JSON.parse(result.stdout) as T
  } catch {
    return null
  }
}

export async function runPicket<T>(
  $: EngineInterface,
  args: readonly string[],
  options: { timeoutMs?: number } = {},
): Promise<T | null> {
  for (const launcher of launch.order) {
    let result: ProcessRunResult
    try {
      result = await $.process.run([...launcher, ...args], { timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS })
    } catch {
      continue
    }
    launch.order = [launcher]
    return answerOf<T>(result)
  }
  launch.order = []
  return null
}
