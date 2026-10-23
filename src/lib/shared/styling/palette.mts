export const BRAND = Object.freeze({
  orange: "#F9782B",
  shimmer: "#FFB27A",
  cream: "#FDEFD4",
  background: "#0D0A08",
  muted: "#8C8072",
  subtle: "#4A4038",
  border: "#6B6158",
  selection: "#5A3A22",
  success: "#9CC46A",
  error: "#E5484D",
  warning: "#F5C04A",
  barEmpty: "#2E2620",
  barText: "#E9C9A0",
});

export const ANSI = Object.freeze({
  black: ["#0D0A08", "#6B6158"],
  red: ["#E5484D", "#FF6B6E"],
  green: ["#9CC46A", "#B8DD88"],
  yellow: ["#F5C04A", "#FFDB8A"],
  blue: ["#7AA2C8", "#9DBFE0"],
  purple: ["#C79BD0", "#DDB8E4"],
  cyan: ["#7FC4B8", "#A3DCD2"],
  white: ["#FDEFD4", "#FFFFFF"],
});

export const TERMINAL = Object.freeze({
  foreground: BRAND.cream,
  background: BRAND.background,
  cursor: BRAND.orange,
  selection: BRAND.selection,
});

export function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 0xff, value & 0xff];
}
