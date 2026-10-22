import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { workingState } from "./git.mjs";
import { PICKET_DIR, sessionCostPath } from "./paths.mjs";
import { BRAND, rgb } from "./styling/palette.mjs";
import { readTail } from "./transcript.mjs";

export const EDGE_COLUMNS = 2;
const DEFAULT_COLUMNS = 80;
const COMPACT_SHARE = 0.83;
const MINUTE = 60_000;
const GIT_REUSE_MS = 5_000;
const INDENT = "  ";
const GAP = "   ";
const SEPARATOR = { text: " · ", color: "dim" };
const SKILL_CALL = '"name":"Skill"';
const USER_CONFIG = ".picketai/config.json";

const COLORS = {
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

const GIT_COLORS = { clean: "claude", unstaged: "warning", staged: "success", conflict: "error" };

const GLYPHS = {
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

const ZERO_WIDTH = /[\p{Mn}\p{Me}‍︀-️\u{E0100}-\u{E01EF}]/u;
const EMOJI = /\p{Emoji_Presentation}/u;
const EAST_ASIAN_WIDE = [
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

const FAMILY = /^claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/;

export function prettyModel(id) {
  const [, family, major, minor] = FAMILY.exec(id) ?? [];
  if (family === undefined) return id;
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
}

export function compactTokens(n) {
  if (n < 1000) return String(n);
  const thousands = Math.round(n / 1000);
  if (thousands < 100) return `${thousands}k`;
  const tenths = Math.round(n / 100) / 10;
  if (tenths < 1000) return `${tenths.toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function untilReset(resetsAtMs, now) {
  if (resetsAtMs === null) return null;
  const total = Math.max(0, Math.round((resetsAtMs - now) / MINUTE));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const rest = total % 60;
  if (days > 0) return `${days}d${hours}h`;
  return hours > 0 ? `${hours}h${rest}m` : `${rest}m`;
}

export function levelColor(percent) {
  return percent >= 90 ? "error" : percent >= 70 ? "warning" : "success";
}

export function contextColor(tokens, compactAt) {
  const share = tokens / compactAt;
  return share >= 0.85 ? "error" : share >= 0.65 ? "warning" : "success";
}

export function cacheLeft(cache, now) {
  if (cache === null || !cache.observed) return null;
  const left = cache.expiresAt === null ? 0 : cache.expiresAt - now;
  if (!cache.warm || left <= 0) return { cold: true };
  const minutes = `${cache.ttl === null ? "~" : ""}${Math.ceil(left / MINUTE)}m`;
  return { minutes, color: left < 5 * MINUTE ? "warning" : "dim" };
}

function secondsToMs(seconds) {
  return typeof seconds === "number" ? seconds * 1000 : null;
}

function limitOf(window) {
  if (!window) return null;
  return { percent: Math.round(window.used_percentage ?? 0), resetsAt: secondsToMs(window.resets_at) };
}

function cacheOf(promptCache) {
  if (!promptCache) return null;
  return {
    observed: promptCache.caching_observed === true,
    warm: promptCache.warm === true,
    ttl: promptCache.ttl ?? null,
    expiresAt: secondsToMs(promptCache.expires_at),
  };
}

function modelName(model) {
  if (model?.display_name) return model.display_name;
  return model?.id ? prettyModel(model.id) : null;
}

export function workspaceDir(input) {
  return input.workspace?.current_dir ?? input.cwd ?? null;
}

export function factsOf(input, { now, skill, git = null }) {
  const context = input.context_window ?? {};
  const dir = workspaceDir(input);
  return {
    folder: dir === null ? null : basename(resolve(dir)),
    git,
    model: modelName(input.model),
    effort: input.effort?.level ?? "default",
    skill,
    limits: { five_hour: limitOf(input.rate_limits?.five_hour), seven_day: limitOf(input.rate_limits?.seven_day) },
    contextTokens: context.total_input_tokens ?? 0,
    contextWindow: context.context_window_size ?? null,
    contextPercent: Math.round(context.used_percentage ?? 0),
    cacheRead: context.current_usage?.cache_read_input_tokens ?? null,
    cache: cacheOf(input.prompt_cache),
    cost: input.cost?.total_cost_usd ?? null,
    now,
  };
}

function charWidth(char) {
  if (ZERO_WIDTH.test(char)) return 0;
  const code = char.codePointAt(0);
  if (EMOJI.test(char) || EAST_ASIAN_WIDE.some(([from, to]) => code >= from && code <= to)) return 2;
  return 1;
}

export function displayWidth(text) {
  let width = 0;
  for (const char of text) width += charWidth(char);
  return width;
}

function groupWidth(pieces) {
  return pieces.reduce((sum, piece) => sum + displayWidth(piece.text), 0);
}

function withIcon(icon, text) {
  return icon === null ? text : `${icon} ${text}`;
}

function joinWith(separator, groups) {
  return groups.filter((group) => group.length > 0).flatMap((group, i) => (i === 0 ? group : [separator, ...group]));
}

function joinFields(fields) {
  return joinWith(SEPARATOR, fields);
}

function joinGroups(groups) {
  return joinWith({ text: GAP }, groups);
}

function brandGroup() {
  return [
    { text: "PICKET", color: "text", bold: true },
    { text: "AI", color: "claude", bold: true },
    { text: " >_", color: "claude" },
  ];
}

function placeGroup(facts, glyph) {
  const folderIcon = glyph.folder === null ? [] : [{ text: `${glyph.folder} `, color: "muted" }];
  const folder = facts.folder === null ? [] : [...folderIcon, { text: facts.folder, color: "text" }];
  const branch = facts.git === null ? [] : [{ text: withIcon(glyph.branch, facts.git.branch), color: GIT_COLORS[facts.git.state] }];
  return joinFields([folder, branch]);
}

function modelGroup(facts) {
  const model = facts.model === null ? [] : [{ text: facts.model, color: "claude", bold: true }];
  const skill = facts.skill === null ? { text: "none", color: "muted" } : { text: facts.skill, color: "claude" };
  return joinFields([model, [{ text: facts.effort, color: "text" }], [skill]]);
}

function limitGroup(label, icon, limit, now, glyph) {
  if (limit === null) return [];
  const reset = untilReset(limit.resetsAt, now);
  return [
    { text: withIcon(icon, label), color: "muted" },
    { text: " " },
    { text: `${limit.percent}%`, color: levelColor(limit.percent) },
    ...(reset === null ? [] : [{ text: " " }, { text: resetText(reset, glyph), color: "dim" }]),
  ];
}

function resetText(reset, glyph) {
  return glyph.reset === null ? `(${reset})` : `${glyph.reset} ${reset}`;
}

function contextGroup(facts, glyph) {
  const { contextTokens: tokens, contextWindow: window, contextPercent: percent } = facts;
  if (window === null) return [];
  const fill = contextColor(tokens, COMPACT_SHARE * window);
  const chars = [...` ${compactTokens(tokens)}/${compactTokens(window)} ${percent}% `];
  const filled = Math.min(chars.length, Math.max(0, Math.round((percent / 100) * chars.length)));
  const bar = [
    { text: chars.slice(0, filled).join(""), color: "dark", bg: fill, bold: fill === "error" },
    { text: chars.slice(filled).join(""), color: "barText", bg: "barEmpty" },
  ].filter((piece) => piece.text !== "");
  if (glyph.capLeft === null) return bar;
  const rightCap = filled === chars.length ? fill : "barEmpty";
  return [{ text: glyph.capLeft, color: fill }, ...bar, { text: glyph.capRight, color: rightCap }];
}

function ttlPiece(left, glyph) {
  if (left.cold) return { text: withIcon(glyph.cold, "cold"), color: "error", bold: true };
  return { text: `${glyph.clock} ${left.minutes}`, color: left.color };
}

function cacheGroup(facts, glyph) {
  const left = cacheLeft(facts.cache, facts.now);
  if (facts.cacheRead === null && left === null) return [];
  return [
    { text: glyph.cache, color: "muted" },
    ...(facts.cacheRead === null ? [] : [{ text: " " }, { text: compactTokens(facts.cacheRead), color: "text" }]),
    ...(left === null ? [] : [{ text: " " }, ttlPiece(left, glyph)]),
  ];
}

function costGroup(facts) {
  return facts.cost === null ? [] : [{ text: `$${facts.cost.toFixed(2)}`, color: "text" }];
}

function knownColumns(columns) {
  return Number.isInteger(columns) && columns > 0;
}

function layoutWidth(columns) {
  return (knownColumns(columns) ? columns : DEFAULT_COLUMNS) - EDGE_COLUMNS;
}

function rowWidth(row) {
  const right = row.right.length === 0 ? 0 : GAP.length + groupWidth(row.right);
  return INDENT.length + groupWidth(row.left) + right;
}

export function layout(facts, { columns, icons = "plain" }) {
  const glyph = GLYPHS[icons] ?? GLYPHS.plain;
  const place = { left: brandGroup(), right: placeGroup(facts, glyph) };
  const model = modelGroup(facts);
  const fiveHour = limitGroup("5h", glyph.fiveHour, facts.limits.five_hour, facts.now, glyph);
  const sevenDay = limitGroup("7d", glyph.sevenDay, facts.limits.seven_day, facts.now, glyph);
  const context = contextGroup(facts, glyph);
  const cache = cacheGroup(facts, glyph);
  const cost = costGroup(facts);
  const wide = [place, { left: model, right: joinGroups([fiveHour, sevenDay, context, cache, cost]) }];
  const narrow = [place, { left: model, right: joinGroups([fiveHour, sevenDay]) }, { left: context, right: joinGroups([cache, cost]) }];
  const fitsWide = knownColumns(columns) && wide.every((row) => rowWidth(row) <= layoutWidth(columns));
  return (fitsWide ? wide : narrow).filter((row) => row.left.length > 0 || row.right.length > 0);
}

function placed(row, width) {
  const indent = { text: INDENT };
  if (row.right.length === 0) return [indent, ...row.left];
  const padding = Math.max(GAP.length, width - INDENT.length - groupWidth(row.left) - groupWidth(row.right));
  return [indent, ...row.left, { text: " ".repeat(padding) }, ...row.right];
}

function codesOf(piece) {
  const codes = piece.bold ? ["1"] : [];
  if (piece.color) codes.push(`38;2;${rgb(COLORS[piece.color]).join(";")}`);
  if (piece.bg) codes.push(`48;2;${rgb(COLORS[piece.bg]).join(";")}`);
  return codes;
}

export function paint(pieces) {
  return pieces
    .map((piece) => {
      const codes = codesOf(piece);
      return codes.length === 0 ? piece.text : `\x1b[${codes.join(";")}m${piece.text}\x1b[0m`;
    })
    .join("");
}

function skillCalled(line) {
  try {
    const entry = JSON.parse(line);
    if (entry?.type !== "assistant" || !Array.isArray(entry.message?.content)) return null;
    const calls = entry.message.content.filter((c) => c?.type === "tool_use" && c.name === "Skill");
    return calls.at(-1)?.input?.skill ?? null;
  } catch {
    return null;
  }
}

export function lastSkill(path, maxBytes) {
  const lines = readTail(path, maxBytes).split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes(SKILL_CALL)) continue;
    const skill = skillCalled(lines[i]);
    if (skill !== null) return skill;
  }
  return null;
}

export function iconsMode(home) {
  try {
    const config = JSON.parse(readFileSync(join(home, USER_CONFIG), "utf8"));
    return config?.statusline?.icons === "nerd" ? "nerd" : "plain";
  } catch {
    return "plain";
  }
}

function cacheFile(cacheDir, kind, key) {
  return join(cacheDir, `${kind}-${createHash("sha1").update(key).digest("hex").slice(0, 16)}.json`);
}

function readCache(file) {
  try {
    const cached = JSON.parse(readFileSync(file, "utf8"));
    return cached !== null && typeof cached === "object" && "value" in cached ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(file, cached) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(cached));
  } catch {}
}

function sizeOf(path) {
  try {
    return typeof path === "string" ? statSync(path).size : null;
  } catch {
    return null;
  }
}

export function liveProbe({ cacheDir, now, readGit = workingState, readSkill = lastSkill }) {
  return {
    git(dir) {
      const file = cacheFile(cacheDir, "git", resolve(dir));
      const cached = readCache(file);
      const age = cached === null ? -1 : now - cached.at;
      if (age >= 0 && age < GIT_REUSE_MS) return cached.value;
      const value = readGit(dir);
      writeCache(file, { at: now, value });
      return value;
    },
    skill(path) {
      const size = sizeOf(path);
      if (size === null) return null;
      const file = cacheFile(cacheDir, "skill", resolve(path));
      const cached = readCache(file);
      if (cached !== null && cached.size === size) return cached.value;
      const value = readSkill(path);
      writeCache(file, { size, value });
      return value;
    },
  };
}

export function recordSessionCost(input, { root }) {
  try {
    const cost = input.cost?.total_cost_usd;
    const file = sessionCostPath(root, input.session_id);
    if (file === null || !Number.isFinite(cost) || !existsSync(join(root, PICKET_DIR))) return;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ session: input.session_id, cost_usd: cost, ts: new Date().toISOString() }));
  } catch {}
}

const DIRECT_PROBE = { git: workingState, skill: (path) => lastSkill(path) };

export function renderStatusline(input, { now, columns, icons = "plain", probe = DIRECT_PROBE }) {
  const dir = workspaceDir(input);
  const facts = factsOf(input, { now, skill: probe.skill(input.transcript_path), git: dir === null ? null : probe.git(dir) });
  const width = layoutWidth(columns);
  return layout(facts, { columns, icons })
    .map((row) => paint(placed(row, width)))
    .join("\n");
}
