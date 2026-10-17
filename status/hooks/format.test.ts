import { describe, expect, test } from 'claude-code/testing'

import { elapsed, minutes } from './format'

describe('format', () => {
  test('elapsed reads seconds, then minutes and seconds, then hours and minutes', async () => {
    expect(elapsed(42_000)).toBe('42s')
    expect(elapsed(192_000)).toBe('3m12s')
    expect(elapsed(3_900_000)).toBe('1h05m')
  })

  test('minutes reads whole minutes, then hours and minutes', async () => {
    expect(minutes(6 * 60_000)).toBe('6m')
    expect(minutes(65 * 60_000)).toBe('1h05m')
  })
})
