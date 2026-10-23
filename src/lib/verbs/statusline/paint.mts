import { BRAND, rgb } from "../../shared/styling/palette.mjs";
import type { ColorName, Piece, Row } from "./layout.mts";

const COLORS: Record<ColorName, string> = {
  claude: BRAND.orange,
  text: BRAND.cream,
  muted: BRAND.muted,
  dim: BRAND.border,
  success: BRAND.success,
  warning: BRAND.warning,
  error: BRAND.error,
  dark: BRAND.background,
  barText: BRAND.barText,
  barEmpty: BRAND.barEmpty,
};

function codesOf(piece: Piece): string[] {
  const codes = piece.bold ? ["1"] : [];
  if (piece.color) codes.push(`38;2;${rgb(COLORS[piece.color]).join(";")}`);
  if (piece.bg) codes.push(`48;2;${rgb(COLORS[piece.bg]).join(";")}`);
  return codes;
}

function paintPiece(piece: Piece): string {
  const codes = codesOf(piece);
  return codes.length === 0 ? piece.text : `\x1b[${codes.join(";")}m${piece.text}\x1b[0m`;
}

export function paint(rows: Row[]): string {
  return rows.map((row) => row.map(paintPiece).join("")).join("\n");
}
