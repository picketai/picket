import { basename, resolve } from "node:path";
import { branch } from "./git.mjs";
import { readTail } from "./transcript.mjs";

export const EDGE_COLUMNS = 2;
const DEFAULT_COLUMNS = 80;
const GAP = 2;
const COMPACT_SHARE = 0.83;
const CONTEXT_BAR_WIDTH = 10;
const MINUTE = 60_000;
const PART_GAP = { text: "   " };
const DOT = { text: " · ", dim: true };
const BAR = { text: " │ ", color: "inactive" };
const SKILL_CALL = '"name":"Skill"';

const PALETTE = {
  claude: "38;2;249;120;43",
  text: "38;2;253;239;212",
  remember: "38;2;233;201;160",
  ide: "38;2;122;162;200",
  inactive: "38;2;140;128;114",
  success: "38;2;156;196;106",
  warning: "38;2;245;192;74",
  error: "38;2;229;72;77",
};
const DIM = "38;2;107;97;88";

const FAMILY = /^claude-(opus|sonnet|haiku|fable)-(\d+)-(\d+)/;

export function prettyModel(id) {
  const [, family, major, minor] = FAMILY.exec(id) ?? [];
  if (family === undefined) return id;
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
}

export function compactTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100_000 ? 1 : 0)}k`;
  return String(n);
}

export function untilReset(resetsAtMs, now) {
  if (resetsAtMs === null) return "?";
  const total = Math.max(0, Math.round((resetsAtMs - now) / MINUTE));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const rest = total % 60;
  if (days > 0) return `${days}d${hours}h`;
  return hours > 0 ? `${hours}h${rest}m` : `${rest}m`;
}

export function bar(percent, width) {
  const filled = Math.min(width, Math.round((percent / 100) * width));
  return "█".repeat(filled) + "░".repeat(width - filled);
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
  if (!cache.warm || left <= 0) return { text: "cold", color: "error", bold: true };
  const text = `◷ ${cache.ttl === null ? "~" : ""}${Math.ceil(left / MINUTE)}m`;
  return left < 5 * MINUTE ? { text, color: "warning" } : { text, dim: true };
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

export function workspaceDir(input) {
  return input.workspace?.current_dir ?? input.cwd ?? null;
}

export function factsOf(input, { now, skill, branch = null }) {
  const context = input.context_window ?? {};
  const dir = workspaceDir(input);
  return {
    folder: dir === null ? null : basename(resolve(dir)),
    branch,
    model: input.model?.id ?? null,
    effort: input.effort?.level ?? null,
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

function joined(parts, separator) {
  return parts.flatMap((part, index) => (index === 0 ? part : [separator, ...part]));
}

function limitPart(label, limit, now) {
  const head = { text: `${label} `, color: "inactive" };
  if (limit === null) return [head, { text: "n/a", color: "inactive" }];
  return [
    head,
    { text: `${limit.percent}%`, color: levelColor(limit.percent) },
    { text: ` (${untilReset(limit.resetsAt, now)})`, dim: true },
  ];
}

function contextPart(facts) {
  const { contextTokens: tokens, contextWindow: window, contextPercent: percent } = facts;
  const color = window === null ? levelColor(percent) : contextColor(tokens, COMPACT_SHARE * window);
  const size = window === null ? "?" : compactTokens(window);
  return [
    { text: "ctx ", color: "inactive" },
    { text: `[${bar(percent, CONTEXT_BAR_WIDTH)}]`, color },
    { text: ` ${compactTokens(tokens)}/${size} (${percent}%)` },
  ];
}

function cachePart(facts) {
  const left = cacheLeft(facts.cache, facts.now);
  return [
    { text: "cache ", color: "inactive" },
    { text: facts.cacheRead === null ? "n/a" : compactTokens(facts.cacheRead) },
    ...(left === null ? [] : [{ text: " " }, left]),
  ];
}

function costPart(facts) {
  return facts.cost === null ? [] : [{ text: `$${facts.cost.toFixed(2)}` }];
}

export function brandLine(facts) {
  const brand = [
    { text: "PICKET", color: "text", bold: true },
    { text: "AI", color: "claude", bold: true },
    { text: " >_", color: "claude" },
  ];
  const folder = facts.folder === null ? [] : [BAR, { text: facts.folder, color: "text" }];
  const branchName = facts.branch === null ? [] : [BAR, { text: facts.branch, color: "claude" }];
  return [...brand, ...folder, ...branchName];
}

export function sessionLine(facts) {
  const parts = [
    limitPart("5h", facts.limits.five_hour, facts.now),
    limitPart("7d", facts.limits.seven_day, facts.now),
    contextPart(facts),
    cachePart(facts),
    costPart(facts),
  ];
  return {
    left: [
      { text: "◆ ", color: "claude" },
      { text: facts.model === null ? "..." : prettyModel(facts.model), color: "claude", bold: true },
      DOT,
      { text: facts.effort ?? "default", color: "remember" },
      DOT,
      { text: facts.skill ?? "none", color: "ide" },
    ],
    right: joined(parts.filter((part) => part.length > 0), PART_GAP),
  };
}

export function widthOf(pieces) {
  return pieces.reduce((sum, piece) => sum + [...piece.text].length, 0);
}

export function rows(line, columns) {
  if (line.right.length === 0) return [line.left];
  const left = widthOf(line.left);
  const right = widthOf(line.right);
  if (left + GAP + right <= columns) {
    return [[...line.left, { text: " ".repeat(columns - left - right) }, ...line.right]];
  }
  return [line.left, line.right];
}

function codesOf(piece) {
  const color = piece.color ? PALETTE[piece.color] : piece.dim ? DIM : PALETTE.text;
  return [piece.bold ? "1" : null, color].filter((code) => code !== null);
}

export function paint(pieces) {
  return pieces.map((piece) => `\x1b[${codesOf(piece).join(";")}m${piece.text}\x1b[0m`).join("");
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

function layoutColumns(columns) {
  return (Number.isInteger(columns) && columns > 0 ? columns : DEFAULT_COLUMNS) - EDGE_COLUMNS;
}

export function renderStatusline(input, { now, columns }) {
  const dir = workspaceDir(input);
  const facts = factsOf(input, { now, skill: lastSkill(input.transcript_path), branch: dir === null ? null : branch(dir) });
  return [brandLine(facts), ...rows(sessionLine(facts), layoutColumns(columns))].map(paint).join("\n");
}
