import { roleOf } from '../../../lib/shared/format.mts'

const ROLE_COLORS: Record<string, string> = {
  architect: '#4a9eff',
  developer: '#3fb950',
  reviewer: '#db61a2',
  analyst: '#a371f7',
}

const OTHER_COLOR = '#8b949e'

export const roleColor = (type: string): string => ROLE_COLORS[roleOf(type)] ?? OTHER_COLOR

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const toBase64 = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const triple = (a << 16) | (b << 8) | c
    out += BASE64.charAt((triple >> 18) & 63)
    out += BASE64.charAt((triple >> 12) & 63)
    out += i + 1 < bytes.length ? BASE64.charAt((triple >> 6) & 63) : '='
    out += i + 2 < bytes.length ? BASE64.charAt(triple & 63) : '='
  }
  return out
}

const PICKET = [
  '............',
  '..KK....KK..',
  '.KOOK..KOOK.',
  '.KOOOKKOOOK.',
  '.KOOOOOOOOK.',
  'KOOCCCCCCOOK',
  'KOCCECCECCOK',
  'KOCCECCECCOK',
  '.KSCCCCCCSK.',
  '..KKKKKKKK..',
  '............',
  '............',
]

const EYES_SHUT = 'KOCCCCCCCCOK'

const SHUT_ROW = 6

const BLINK_EVERY = 4

const DEFAULT_COLOR = 0x01000000

const FINISHED_TINT = 0x30363d

const hex = (color: string): number => Number.parseInt(color.slice(1), 16)

const mixWith = (color: number, other: number, t: number): number => {
  const channel = (shift: number) => {
    const from = (color >> shift) & 255
    const to = (other >> shift) & 255
    return Math.round(from + (to - from) * t)
  }
  return (channel(16) << 16) | (channel(8) << 8) | channel(0)
}

export const SPRITE_COLUMNS = 12
export const SPRITE_ROWS = 6

export const isBlinking = (frame: number): boolean => frame % BLINK_EVERY === BLINK_EVERY - 1

export const sprite = (type: string, frame: number, isFinishedSprite: boolean): string => {
  const tint = (color: number) => (isFinishedSprite ? mixWith(color, FINISHED_TINT, 0.5) : color)
  const palette: Record<string, number> = {
    K: tint(0x412214),
    O: tint(0xff9139),
    C: tint(0xfff2d3),
    E: tint(0x1f1d1a),
    S: tint(hex(roleColor(type))),
  }
  const pixels = [...PICKET]
  if (isFinishedSprite || isBlinking(frame)) {
    pixels[SHUT_ROW] = EYES_SHUT
  }
  const words = new Uint32Array(SPRITE_COLUMNS * SPRITE_ROWS * 3)
  for (let row = 0; row < SPRITE_ROWS; row += 1) {
    for (let col = 0; col < SPRITE_COLUMNS; col += 1) {
      const top = palette[pixels[row * 2]?.charAt(col) ?? '.']
      const bottom = palette[pixels[row * 2 + 1]?.charAt(col) ?? '.']
      const at = (row * SPRITE_COLUMNS + col) * 3
      if (top === undefined && bottom === undefined) {
        words.set([0x20, DEFAULT_COLOR, DEFAULT_COLOR], at)
      } else if (top === undefined) {
        words.set([0x2584, bottom ?? DEFAULT_COLOR, DEFAULT_COLOR], at)
      } else {
        words.set([0x2580, top, bottom ?? DEFAULT_COLOR], at)
      }
    }
  }
  return toBase64(new Uint8Array(words.buffer))
}
