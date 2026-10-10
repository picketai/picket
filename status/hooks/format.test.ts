import { describe, expect, test } from 'claude-code/testing'

import { bar, compactTokens, pack, prettyModel, untilReset } from './format'

describe('format', () => {
  test('model ids read as their family and version', async () => {
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(prettyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
    expect(prettyModel('opus')).toBe('opus')
  })

  test('token counts are compact', async () => {
    expect(compactTokens(55_000)).toBe('55k')
    expect(compactTokens(109_100)).toBe('109.1k')
    expect(compactTokens(1_000_000)).toBe('1.0M')
  })

  test('reset timers read in hours and minutes', async () => {
    const now = Date.parse('2026-10-10T10:00:00Z')
    expect(untilReset('2026-10-10T13:37:00Z', now)).toBe('3hr 37m')
    expect(untilReset('2026-10-10T10:20:00Z', now)).toBe('20m')
    expect(untilReset('2026-10-13T18:00:00Z', now)).toBe('3d 8hr')
    expect(untilReset(undefined, now)).toBe('?')
  })

  test('segments share one row while they fit and wrap when they do not', async () => {
    expect(pack([10, 10, 10], 40, 3)).toEqual([[0, 1, 2]])
    expect(pack([10, 10, 10], 25, 3)).toEqual([[0, 1], [2]])
    expect(pack([10, 10, 10], 12, 3)).toEqual([[0], [1], [2]])
    expect(pack([50], 20, 3)).toEqual([[0]])
  })

  test('the context bar fills by percent', async () => {
    expect(bar(5, 20)).toBe('█' + '░'.repeat(19))
    expect(bar(100, 4)).toBe('████')
  })
})
