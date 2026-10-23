const ZERO_WIDTH = /[\p{Mn}\p{Me}‍︀-️\u{E0100}-\u{E01EF}]/u;
const EMOJI = /\p{Emoji_Presentation}/u;
const EAST_ASIAN_WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

export function charWidth(char: string): number {
  if (ZERO_WIDTH.test(char)) return 0;
  const code = char.codePointAt(0) ?? 0;
  if (EMOJI.test(char) || EAST_ASIAN_WIDE.some(([from, to]) => code >= from && code <= to)) return 2;
  return 1;
}

export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += charWidth(char);
  return width;
}
