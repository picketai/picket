import { describe, expect, test } from 'claude-code/testing'

import { isBlinking, roleColor, sprite, toBase64 } from './sprite'

describe('sprite', () => {
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
})
