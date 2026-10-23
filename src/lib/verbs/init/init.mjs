import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { MODS } from "../../mods.mts";
import { HOST_DIR, configPath, hostPath, pluginRoot, stateRel } from "../../shared/paths.mts";
import { STATUS_LINE } from "../../shared/styling/statusline-setting.mjs";

const IGNORE_LINE = `${stateRel("")}/`;
const DEFAULT_CONFIG = { version: 1 };
const HEADING = /^#{1,6} /;
const MARKETPLACE_NAME = "picketai";
const SETTINGS_ENV = { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" };
const SETTINGS_ALLOW = ["Bash(picket *)", "PowerShell(picket *)", `Read(~/${HOST_DIR}/plugins/cache/${MARKETPLACE_NAME}/**)`];
const SETTINGS_ASK = ["PowerShell(picket drive *)", "PowerShell(picket check *)"];
const PLUGIN_ID = `picket@${MARKETPLACE_NAME}`;
const MOD_PLUGINS = Object.entries(MODS)
  .filter(([, { install }]) => install === "default")
  .map(([name, { plugin }]) => ({ name, id: `${plugin}@${MARKETPLACE_NAME}` }));
const ADD_MARKETPLACE = "plugin marketplace add";
const INSTALL_PLUGIN = "plugin install";

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
  const start = lines.findIndex((line) => line === "# Picket");
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

export function mergeSettings(settings, { statusLineAt = null } = {}) {
  const merged = structuredClone(settings);
  const permissions = { ...(merged.permissions ?? {}) };
  const denied = Array.isArray(permissions.deny) ? permissions.deny : [];
  const blocked = SETTINGS_ALLOW.filter((rule) => denied.includes(rule));
  merged.env = { ...(merged.env ?? {}), ...SETTINGS_ENV };
  permissions.allow = union(permissions.allow, SETTINGS_ALLOW.filter((rule) => !blocked.includes(rule)));
  permissions.ask = union(permissions.ask, SETTINGS_ASK);
  merged.permissions = permissions;
  if (!("statusLine" in merged) && statusLineAt === null) merged.statusLine = STATUS_LINE;
  return { merged, blocked };
}

function statusLineOf(path) {
  try {
    const settings = JSON.parse(readFileSync(path, "utf8"));
    return settings !== null && typeof settings === "object" && "statusLine" in settings ? settings.statusLine : undefined;
  } catch {
    return undefined;
  }
}

function statusLineHolder(root, home) {
  const candidates = [hostPath(root, "settings.json"), hostPath(root, "settings.local.json"), join(home, HOST_DIR, "settings.json")];
  for (const path of candidates) {
    const statusLine = statusLineOf(path);
    if (statusLine !== undefined) return { path, ours: path === candidates[0] && isDeepStrictEqual(statusLine, STATUS_LINE) };
  }
  return null;
}

function settingsStep(root, { home }) {
  const path = hostPath(root, "settings.json");
  const existing = readOrNull(path);
  let settings;
  try {
    settings = existing === null ? {} : JSON.parse(existing);
  } catch (err) {
    return { name: "settings", path, result: "failed", detail: `not valid JSON, left as is: ${err.message}` };
  }
  const holder = statusLineHolder(root, home);
  const { merged, blocked } = mergeSettings(settings, { statusLineAt: holder?.path ?? null });
  const notes = [
    blocked.length ? `WARNING: permissions.deny holds ${blocked.join(", ")}, so init did not allow it` : null,
    holder && !holder.ours ? `statusLine already set in ${holder.path}` : null,
  ].filter(Boolean);
  const changed = existing === null || JSON.stringify(merged) !== JSON.stringify(settings);
  const result = changed ? writeIfChanged(path, existing, `${JSON.stringify(merged, null, 2)}\n`) : "unchanged";
  return { name: "settings", path, result, ...(notes.length ? { detail: notes.join("; ") } : {}) };
}

export function marketplaceRoot() {
  const candidate = dirname(pluginRoot());
  return existsSync(join(candidate, `${HOST_DIR}-plugin`, "marketplace.json")) ? candidate : null;
}

function projectSettings(root) {
  try {
    return JSON.parse(readFileSync(hostPath(root, "settings.json"), "utf8"));
  } catch {
    return {};
  }
}

function installCommands(market) {
  return [
    { name: "marketplace", args: [...ADD_MARKETPLACE.split(" "), market, "--scope", "project"], done: (s) => Boolean(s.extraKnownMarketplaces?.[MARKETPLACE_NAME]) },
    { name: "plugin", args: [...INSTALL_PLUGIN.split(" "), PLUGIN_ID, "--scope", "project"], done: (s) => Boolean(s.enabledPlugins?.[PLUGIN_ID]) },
    ...MOD_PLUGINS.map(({ name, id }) => ({ name, args: [...INSTALL_PLUGIN.split(" "), id, "--scope", "project"], done: (s) => id in (s.enabledPlugins ?? {}) })),
  ];
}

const INSTALL_STEP_NAMES = installCommands(null).map(({ name }) => name);

function byHand(market) {
  const commands = [`${ADD_MARKETPLACE} "${market}"`, `${INSTALL_PLUGIN} ${PLUGIN_ID}`, ...MOD_PLUGINS.map(({ id }) => `${INSTALL_PLUGIN} ${id}`)];
  return `run by hand: ${commands.map((command) => `claude ${command} --scope project`).join(", then ")}`;
}

function lastLine(err) {
  const text = String(err.stderr || err.stdout || err.message || err).trim();
  return text.split(/\r?\n/).filter(Boolean).at(-1) ?? "failed";
}

function installSteps(root, { install, exec, market }) {
  const path = hostPath(root, "settings.json");
  if (!install) return INSTALL_STEP_NAMES.map((name) => ({ name, path, result: "skipped" }));
  return installCommands(market).map(({ name, args, done }) => {
    if (done(projectSettings(root))) return { name, path, result: "unchanged" };
    if (!market) return { name, path, result: "failed", detail: "no marketplace beside the plugin" };
    try {
      exec("claude", args, { cwd: root });
      return { name, path, result: "created" };
    } catch (err) {
      return { name, path, result: "failed", detail: `${lastLine(err)}; ${byHand(market)}` };
    }
  });
}

export function claudeRunner() {
  const windows = process.platform === "win32";
  return (command, args, { cwd }) =>
    execFileSync(command, windows ? args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)) : args, {
      cwd,
      shell: windows,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
}

const STEPS = [
  ["claude-md", claudeMdStep],
  ["config", configStep],
  ["gitignore", gitignoreStep],
  ["settings", settingsStep],
];

export function init(root, { install = true, exec = claudeRunner(), market = marketplaceRoot(), home = homedir() } = {}) {
  const steps = STEPS.map(([name, step]) => {
    try {
      return step(root, { home });
    } catch (err) {
      return { name, path: null, result: "failed", detail: err.message };
    }
  });
  return { root, steps: [...steps, ...installSteps(root, { install, exec, market })] };
}

export function renderInit(report) {
  const lines = [`root: ${report.root}`];
  for (const s of report.steps) lines.push(`${s.name}: ${s.result}${s.path ? ` ${s.path}` : ""}${s.detail ? ` · ${s.detail}` : ""}`);
  return lines.join("\n");
}
