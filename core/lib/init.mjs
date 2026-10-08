import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { configPath, hostPath, pluginRoot, stateRel } from "./paths.mjs";

const IGNORE_LINE = `${stateRel("")}/`;
const DEFAULT_CONFIG = { version: 1 };
const HEADING = /^#{1,6} /;
const SETTINGS_ENV = { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" };
const SETTINGS_ALLOW = ["Bash(tether *)", "PowerShell(tether *)"];
const SETTINGS_ASK = ["PowerShell(tether drive *)", "PowerShell(tether check *)"];

export class InitRefused extends Error {}

function gitTopLevel(cwd) {
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

function samePath(a, b) {
  const norm = (p) => resolve(p).replaceAll("\\", "/").replace(/\/$/, "");
  return process.platform === "win32" ? norm(a).toLowerCase() === norm(b).toLowerCase() : norm(a) === norm(b);
}

export function initRoot({ root, cwd = process.cwd() } = {}) {
  const chosen = resolve(root ?? gitTopLevel(cwd) ?? cwd);
  if (samePath(chosen, homedir())) throw new InitRefused(`refusing to set up the home folder ${chosen}; run init inside a project or pass --root <path>`);
  return chosen;
}

function lf(text) {
  return text.replace(/\r\n/g, "\n");
}

function eolOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function readTemplate() {
  return lf(readFileSync(join(pluginRoot(), "templates", "claude-block.md"), "utf8"));
}

function templateHeadings(template) {
  return new Set(template.split("\n").filter((line) => HEADING.test(line)));
}

export function mergeClaudeBlock(existing, template) {
  if (existing === null) return `${template}\n## Project facts\n`;
  const lines = lf(existing).split("\n");
  const start = lines.findIndex((line) => line === "# Tether");
  if (start === -1) return `${lf(existing).replace(/\n*$/, "\n")}\n${template}`;
  const own = templateHeadings(template);
  let end = start + 1;
  while (end < lines.length && !(HEADING.test(lines[end]) && !own.has(lines[end]))) end++;
  const before = lines.slice(0, start).join("\n");
  const after = lines.slice(end).join("\n");
  return `${before ? `${before}\n` : ""}${template}${end < lines.length ? `\n${after}` : ""}`;
}

function writeIfChanged(path, existing, next) {
  if (existing === next) return "unchanged";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  return existing === null ? "created" : "updated";
}

function readOrNull(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function claudeMdStep(root) {
  const path = join(root, "CLAUDE.md");
  const existing = readOrNull(path);
  const merged = mergeClaudeBlock(existing, readTemplate());
  const next = existing === null ? merged : merged.replaceAll("\n", eolOf(existing));
  return { name: "claude-md", path, result: writeIfChanged(path, existing, next) };
}

function configStep(root) {
  const path = configPath(root);
  if (existsSync(path)) return { name: "config", path, result: "unchanged" };
  return { name: "config", path, result: writeIfChanged(path, null, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`) };
}

function gitignoreStep(root) {
  const path = join(root, ".gitignore");
  const existing = readOrNull(path);
  if (existing !== null && lf(existing).split("\n").some((line) => line.trim() === IGNORE_LINE)) return { name: "gitignore", path, result: "unchanged" };
  const eol = existing === null ? "\n" : eolOf(existing);
  const base = existing === null || existing === "" ? "" : existing.endsWith("\n") ? existing : existing + eol;
  return { name: "gitignore", path, result: writeIfChanged(path, existing, `${base}${IGNORE_LINE}${eol}`) };
}

function union(existing, wanted) {
  const list = Array.isArray(existing) ? [...existing] : [];
  for (const rule of wanted) if (!list.includes(rule)) list.push(rule);
  return list;
}

export function mergeSettings(settings) {
  const merged = structuredClone(settings);
  const permissions = { ...(merged.permissions ?? {}) };
  const denied = Array.isArray(permissions.deny) ? permissions.deny : [];
  const blocked = SETTINGS_ALLOW.filter((rule) => denied.includes(rule));
  merged.env = { ...(merged.env ?? {}), ...SETTINGS_ENV };
  permissions.allow = union(permissions.allow, SETTINGS_ALLOW.filter((rule) => !blocked.includes(rule)));
  permissions.ask = union(permissions.ask, SETTINGS_ASK);
  merged.permissions = permissions;
  return { merged, blocked };
}

function settingsStep(root) {
  const path = hostPath(root, "settings.json");
  const existing = readOrNull(path);
  let settings;
  try {
    settings = existing === null ? {} : JSON.parse(existing);
  } catch (err) {
    return { name: "settings", path, result: "failed", detail: `not valid JSON, left as is: ${err.message}` };
  }
  const { merged, blocked } = mergeSettings(settings);
  const warning = blocked.length ? `WARNING: permissions.deny holds ${blocked.join(", ")}, so init did not allow it` : undefined;
  const changed = existing === null || JSON.stringify(merged) !== JSON.stringify(settings);
  const result = changed ? writeIfChanged(path, existing, `${JSON.stringify(merged, null, 2)}
`) : "unchanged";
  return { name: "settings", path, result, ...(warning ? { detail: warning } : {}) };
}

const STEPS = [
  ["claude-md", claudeMdStep],
  ["config", configStep],
  ["gitignore", gitignoreStep],
  ["settings", settingsStep],
];

export function init(root) {
  const steps = STEPS.map(([name, step]) => {
    try {
      return step(root);
    } catch (err) {
      return { name, path: null, result: "failed", detail: err.message };
    }
  });
  return { root, steps };
}

export function renderInit(report) {
  const lines = [`root: ${report.root}`];
  for (const s of report.steps) lines.push(`${s.name}: ${s.result}${s.path ? ` ${s.path}` : ""}${s.detail ? ` · ${s.detail}` : ""}`);
  return lines.join("\n");
}
