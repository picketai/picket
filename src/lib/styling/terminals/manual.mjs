import { ANSI, TERMINAL } from "../palette.mjs";

const STEPS = [
  "iTerm2: Settings > Profiles > Colors: enter the colours above; Text: pick the font",
  "WezTerm: add a color_schemes entry with these colours and set font = wezterm.font(\"<font>\")",
  "Kitty: set foreground, background, cursor, selection_background, color0 to color15 and font_family in kitty.conf",
  "Ghostty: set background, foreground, cursor-color, selection-background, palette = 0 to 15 and font-family",
  "Alacritty: set [colors.primary], [colors.cursor], [colors.normal], [colors.bright] and [font.normal] family",
];

export function paletteText(family) {
  const slots = Object.entries(ANSI).map(([slot, [normal, bright]]) => `  ${slot.padEnd(7)} ${normal}  bright ${bright}`);
  return [
    "PicketAI colours for your terminal:",
    `  foreground ${TERMINAL.foreground}, background ${TERMINAL.background}, cursor ${TERMINAL.cursor}, selection ${TERMINAL.selection}`,
    ...slots,
    `  font: ${family}`,
    ...STEPS.map((step) => `  ${step.replace("<font>", family)}`),
  ].join("\n");
}

export function manualWriter(family) {
  return {
    id: "other",
    name: "this terminal",
    plan: () => [{ id: "terminal-manual", summary: "no terminal Picket can configure was detected; set the colours by hand", manual: paletteText(family) }],
    unapply: () => ({ result: "removed" }),
  };
}
