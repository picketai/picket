import { describe, expect, test } from 'claude-code/testing'

import { ANSI, BRAND, rgb } from '../../../lib/shared/styling/palette.mts'
import { isBlinking, roleStripe, sprite, SPRITE_COLUMNS, toBase64 } from './sprite'

const packed = (hex: string): number => {
  const [r, g, b] = rgb(hex)
  return (r << 16) | (g << 8) | b
}

const topColor = (cells: string, row: number, col: number): number | undefined => {
  const bytes = Uint8Array.from(atob(cells), char => char.charCodeAt(0))
  return new Uint32Array(bytes.buffer)[(row * SPRITE_COLUMNS + col) * 3 + 1]
}

describe('sprite', () => {
  test('roles get their stripe from the terminal palette, others the muted brand colour', async () => {
    expect(roleStripe('picket:reviewer')).toBe(ANSI.red[0])
    expect(roleStripe('Explore')).toBe(BRAND.muted)
  })

  test('the body is brand orange and a developer stripe is the palette green', async () => {
    const cells = sprite('picket:developer', 0, false)
    expect(topColor(cells, 1, 2)).toBe(packed(BRAND.orange))
    expect(topColor(cells, 4, 2)).toBe(packed(ANSI.green[0]))
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
