import { describe, expect, test } from 'claude-code/testing'

import { age, clampOffset, projectSlug, sizeLabel, titleOf } from './sessions'

describe('sessions', () => {
  test('the project folder name replaces every non-alphanumeric character', async () => {
    expect(projectSlug('D:\\workspace\\github\\AISpec')).toBe('D--workspace-github-AISpec')
  })

  test('the title is the latest name, preferring a later record over an earlier one', async () => {
    const transcript = [
      '{"type":"ai-title","aiTitle":"Continue from handoff","sessionId":"a"}',
      '{"type":"user","message":"hi"}',
      '{"type":"agent-name","agentName":"Claude mods","sessionId":"a"}',
      '{"type":"assistant","message":"ok"}',
    ].join('\n')
    expect(titleOf(transcript)).toBe('Claude mods')
    expect(titleOf('{"type":"user"}')).toBe(null)
  })

  test('a name the person gave beats a generated title written after it', async () => {
    const transcript = [
      '{"type":"custom-title","customTitle":"Mods with picket","sessionId":"a"}',
      '{"type":"agent-name","agentName":"Mods with picket","sessionId":"a"}',
      '{"type":"ai-title","aiTitle":"Claude mods","sessionId":"a"}',
    ].join('\n')
    expect(titleOf(transcript)).toBe('Mods with picket')
    expect(titleOf('{"type":"ai-title","aiTitle":"Continue from handoff","sessionId":"b"}')).toBe('Continue from handoff')
  })

  test('the session window stays inside the list', async () => {
    expect(clampOffset(5, 25, 10)).toBe(5)
    expect(clampOffset(30, 25, 10)).toBe(15)
    expect(clampOffset(-2, 25, 10)).toBe(0)
    expect(clampOffset(3, 4, 10)).toBe(0)
  })

  test('sizes step by 1024, with one decimal below 10 and whole numbers from 10 (T-3.3)', async () => {
    expect(sizeLabel(6500000)).toBe('6.2 MB')
    expect(sizeLabel(224395264)).toBe('214 MB')
    expect(sizeLabel(3250586)).toBe('3.1 MB')
    expect(sizeLabel(512)).toBe('512 B')
    expect(sizeLabel(2048)).toBe('2.0 KB')
    expect(sizeLabel(5 * 1024 ** 3)).toBe('5.0 GB')
  })

  test('a size that rounds up to the next step reads in the next unit', async () => {
    expect(sizeLabel(1048570)).toBe('1.0 MB')
    expect(sizeLabel(1023)).toBe('1023 B')
    expect(sizeLabel(1048064)).toBe('1.0 MB')
  })

  test('ages read in minutes, hours and days', async () => {
    expect(age(30_000)).toBe('now')
    expect(age(17 * 60_000)).toBe('17m')
    expect(age(5 * 3_600_000)).toBe('5h')
    expect(age(8 * 86_400_000)).toBe('8d')
  })
})
