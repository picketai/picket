import type { WorkingState } from "../../shared/git.mts";
import { displayWidth } from "../../util/text-width.mts";
import type { CacheFacts, Facts, Limit } from "./facts.mts";

export type ColorName = "claude" | "text" | "muted" | "dim" | "success" | "warning" | "error" | "dark" | "barText" | "barEmpty";
export type Piece = { text: string; color?: ColorName; bg?: ColorName; bold?: boolean };
export type Row = Piece[];
export type IconMode = "plain" | "nerd";
export type CacheLeft = { cold: true } | { minutes: string; color: ColorName };

type Glyphs = Record<"folder" | "fiveHour" | "sevenDay" | "reset" | "capLeft" | "capRight" | "cold", string | null> & Record<"branch" | "cache" | "clock", string>;
type Line = { left: Piece[]; right: Piece[] };

export const EDGE_COLUMNS = 2;
const DEFAULT_COLUMNS = 80;
const COMPACT_SHARE = 0.83;
const MINUTE = 60_000;
const INDENT = "  ";
const GAP = "   ";
const SEPARATOR: Piece = { text: " · ", color: "dim" };

const GIT_COLORS: Record<WorkingState["state"], ColorName> = { clean: "claude", unstaged: "warning", staged: "success", conflict: "error" };

const GLYPHS: Record<IconMode, Glyphs> = {
  plain: { folder: null, branch: "⎇", fiveHour: null, sevenDay: null, reset: null, capLeft: null, capRight: null, cache: "cache", clock: "◷", cold: null },
  nerd: {
    folder: "\u{F07B}",
    branch: "\u{F418}",
    fiveHour: "\u{F250}",
    sevenDay: "\u{F0A33}",
    reset: "\u{F0450}",
    capLeft: "\u{E0B6}",
    capRight: "\u{E0B4}",
    cache: "\u{F01BC}",
    clock: "\u{F0150}",
    cold: "\u{F0717}",
  },
};

export function compactTokens(n: number): string {
  if (n < 1000) return String(n);
  const thousands = Math.round(n / 1000);
  if (thousands < 100) return `${thousands}k`;
  const tenths = Math.round(n / 100) / 10;
  if (tenths < 1000) return `${tenths.toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function untilReset(resetsAtMs: number | null, now: number): string | null {
  if (resetsAtMs === null) return null;
  const total = Math.max(0, Math.round((resetsAtMs - now) / MINUTE));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const rest = total % 60;
  if (days > 0) return `${days}d${hours}h`;
  return hours > 0 ? `${hours}h${rest}m` : `${rest}m`;
}

export function levelColor(percent: number): ColorName {
  return percent >= 90 ? "error" : percent >= 70 ? "warning" : "success";
}

export function contextColor(tokens: number, compactAt: number): ColorName {
  const share = tokens / compactAt;
  return share >= 0.85 ? "error" : share >= 0.65 ? "warning" : "success";
}

export function cacheLeft(cache: CacheFacts | null, now: number): CacheLeft | null {
  if (cache === null || !cache.observed) return null;
  const left = cache.expiresAt === null ? 0 : cache.expiresAt - now;
  if (!cache.warm || left <= 0) return { cold: true };
  const minutes = `${cache.ttl === null ? "~" : ""}${Math.ceil(left / MINUTE)}m`;
  return { minutes, color: left < 5 * MINUTE ? "warning" : "dim" };
}

function groupWidth(pieces: Piece[]): number {
  return pieces.reduce((sum, piece) => sum + displayWidth(piece.text), 0);
}

function withIcon(icon: string | null, text: string): string {
  return icon === null ? text : `${icon} ${text}`;
}

function joinWith(separator: Piece, groups: Piece[][]): Piece[] {
  return groups.filter((group) => group.length > 0).flatMap((group, i) => (i === 0 ? group : [separator, ...group]));
}

function joinFields(fields: Piece[][]): Piece[] {
  return joinWith(SEPARATOR, fields);
}

function joinGroups(groups: Piece[][]): Piece[] {
  return joinWith({ text: GAP }, groups);
}

function brandGroup(): Piece[] {
  return [
    { text: "PICKET", color: "text", bold: true },
    { text: "AI", color: "claude", bold: true },
    { text: " >_", color: "claude" },
  ];
}

function placeGroup(facts: Facts, glyph: Glyphs): Piece[] {
  const folderIcon: Piece[] = glyph.folder === null ? [] : [{ text: `${glyph.folder} `, color: "muted" }];
  const folder: Piece[] = facts.folder === null ? [] : [...folderIcon, { text: facts.folder, color: "text" }];
  const branch: Piece[] = facts.git === null ? [] : [{ text: withIcon(glyph.branch, String(facts.git.branch)), color: GIT_COLORS[facts.git.state] }];
  return joinFields([folder, branch]);
}

function modelGroup(facts: Facts): Piece[] {
  const model: Piece[] = facts.model === null ? [] : [{ text: facts.model, color: "claude", bold: true }];
  const skill: Piece = facts.skill === null ? { text: "none", color: "muted" } : { text: facts.skill, color: "claude" };
  return joinFields([model, [{ text: facts.effort, color: "text" }], [skill]]);
}

function resetText(reset: string, glyph: Glyphs): string {
  return glyph.reset === null ? `(${reset})` : `${glyph.reset} ${reset}`;
}

function limitGroup(label: string, icon: string | null, limit: Limit | null, now: number, glyph: Glyphs): Piece[] {
  if (limit === null) return [];
  const reset = untilReset(limit.resetsAt, now);
  return [
    { text: withIcon(icon, label), color: "muted" },
    { text: " " },
    { text: `${limit.percent}%`, color: levelColor(limit.percent) },
    ...(reset === null ? [] : [{ text: " " }, { text: resetText(reset, glyph), color: "dim" as const }]),
  ];
}

function contextGroup(facts: Facts, glyph: Glyphs): Piece[] {
  const { contextTokens: tokens, contextWindow: window, contextPercent: percent } = facts;
  if (window === null) return [];
  const fill = contextColor(tokens, COMPACT_SHARE * window);
  const chars = [...` ${compactTokens(tokens)}/${compactTokens(window)} ${percent}% `];
  const filled = Math.min(chars.length, Math.max(0, Math.round((percent / 100) * chars.length)));
  const bar: Piece[] = [
    { text: chars.slice(0, filled).join(""), color: "dark", bg: fill, bold: fill === "error" },
    { text: chars.slice(filled).join(""), color: "barText", bg: "barEmpty" },
  ];
  const shown = bar.filter((piece) => piece.text !== "");
  if (glyph.capLeft === null || glyph.capRight === null) return shown;
  const rightCap: ColorName = filled === chars.length ? fill : "barEmpty";
  return [{ text: glyph.capLeft, color: fill }, ...shown, { text: glyph.capRight, color: rightCap }];
}

function ttlPiece(left: CacheLeft, glyph: Glyphs): Piece {
  if ("cold" in left) return { text: withIcon(glyph.cold, "cold"), color: "error", bold: true };
  return { text: `${glyph.clock} ${left.minutes}`, color: left.color };
}

function cacheGroup(facts: Facts, glyph: Glyphs): Piece[] {
  const left = cacheLeft(facts.cache, facts.now);
  if (facts.cacheRead === null && left === null) return [];
  return [
    { text: glyph.cache, color: "muted" },
    ...(facts.cacheRead === null ? [] : [{ text: " " }, { text: compactTokens(facts.cacheRead), color: "text" as const }]),
    ...(left === null ? [] : [{ text: " " }, ttlPiece(left, glyph)]),
  ];
}

function costGroup(facts: Facts): Piece[] {
  return facts.cost === null ? [] : [{ text: `$${facts.cost.toFixed(2)}`, color: "text" }];
}

function knownColumns(columns: number | undefined): columns is number {
  return Number.isInteger(columns) && (columns as number) > 0;
}

function layoutWidth(columns: number | undefined): number {
  return (knownColumns(columns) ? columns : DEFAULT_COLUMNS) - EDGE_COLUMNS;
}

function lineWidth(line: Line): number {
  const right = line.right.length === 0 ? 0 : GAP.length + groupWidth(line.right);
  return INDENT.length + groupWidth(line.left) + right;
}

function placed(line: Line, width: number): Row {
  const indent = { text: INDENT };
  if (line.right.length === 0) return [indent, ...line.left];
  const padding = Math.max(GAP.length, width - INDENT.length - groupWidth(line.left) - groupWidth(line.right));
  return [indent, ...line.left, { text: " ".repeat(padding) }, ...line.right];
}

export function layout(facts: Facts, { columns, icons = "plain" }: { columns: number | undefined; icons?: string }): Row[] {
  const glyph = GLYPHS[icons as IconMode] ?? GLYPHS.plain;
  const place: Line = { left: brandGroup(), right: placeGroup(facts, glyph) };
  const model = modelGroup(facts);
  const fiveHour = limitGroup("5h", glyph.fiveHour, facts.limits.five_hour, facts.now, glyph);
  const sevenDay = limitGroup("7d", glyph.sevenDay, facts.limits.seven_day, facts.now, glyph);
  const context = contextGroup(facts, glyph);
  const cache = cacheGroup(facts, glyph);
  const cost = costGroup(facts);
  const wide: Line[] = [place, { left: model, right: joinGroups([fiveHour, sevenDay, context, cache, cost]) }];
  const narrow: Line[] = [place, { left: model, right: joinGroups([fiveHour, sevenDay]) }, { left: context, right: joinGroups([cache, cost]) }];
  const fitsWide = knownColumns(columns) && wide.every((line) => lineWidth(line) <= layoutWidth(columns));
  const width = layoutWidth(columns);
  return (fitsWide ? wide : narrow).filter((line) => line.left.length > 0 || line.right.length > 0).map((line) => placed(line, width));
}
