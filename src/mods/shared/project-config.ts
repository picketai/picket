import type { EngineInterface } from 'claude-code'

const CONFIG_FILE = '.picket/config.json'

export async function readProjectConfig($: EngineInterface): Promise<unknown> {
  try {
    return JSON.parse(await $.fs.read(`${await $.session.root()}/${CONFIG_FILE}`))
  } catch {
    return undefined
  }
}
