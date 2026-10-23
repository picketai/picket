import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { MODS } from "../../mods.mts";
import { claudeBlockSpan, INSTALL, isHomeFolder, MARKETPLACE, pluginId, readTemplate } from "../../shared/install.mts";
import { HOST_DIR, hostPath, pluginRoot } from "../../shared/paths.mts";
import { programRunner } from "../../util/process.mts";

const { claudeMd, config, gitignore, settings: SETTINGS } = INSTALL;
const MOD_PLUGINS = Object.entries(MODS)
  .filter(([, { install }]) => install === "default")
  .map(([name, { plugin }]) => ({ name, id: pluginId(plugin) }));
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

export function initRoot({ root, cwd = process.cwd() } = {}) {
  const chosen = resolve(root ?? gitTopLevel(cwd) ?? cwd);
  if (isHomeFolder(chosen, homedir(), process.platform)) throw new InitRefused(`refusing to set up the home folder ${chosen}; run init inside a project or pass --root <path>`);
  return chosen;
}

function lf(text) {
  return text.replace(/\r\n/g, "\n");
}

function eolOf(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

export function mergeClaudeBlock(existing, template) {
  if (existing === null) return `${template}\n${claudeMd.projectFacts}\n`;
  const lines = lf(existing).split("\n");
  const span = claudeBlockSpan(lines, template);
  if (span === null) return `${lf(existing).replace(/\n*$/, "\n")}\n${template}`;
  const { start, end } = span;
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
  const path = join(root, claudeMd.file);
  const existing = readOrNull(path);
  const merged = mergeClaudeBlock(existing, readTemplate());
  const next = existing === null ? merged : merged.replaceAll("\n", eolOf(existing));
  return { name: "claude-md", path, result: writeIfChanged(path, existing, next) };
}

function configStep(root) {
  const path = join(root, config.file);
  if (existsSync(path)) return { name: "config", path, result: "unchanged" };
  return { name: "config", path, result: writeIfChanged(path, null, `${JSON.stringify(config.initial, null, 2)}\n`) };
}

function gitignoreStep(root) {
  const path = join(root, gitignore.file);
  const existing = readOrNull(path);
  if (existing !== null && lf(existing).split("\n").some((line) => line.trim() === gitignore.line)) return { name: "gitignore", path, result: "unchanged" };
  const eol = existing === null ? "\n" : eolOf(existing);
  const base = existing === null || existing === "" ? "" : existing.endsWith("\n") ? existing : existing + eol;
  return { name: "gitignore", path, result: writeIfChanged(path, existing, `${base}${gitignore.line}${eol}`) };
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
  const blocked = SETTINGS.allow.filter((rule) => denied.includes(rule));
  merged.env = { ...(merged.env ?? {}), ...SETTINGS.env };
  permissions.allow = union(permissions.allow, SETTINGS.allow.filter((rule) => !blocked.includes(rule)));
  permissions.ask = union(permissions.ask, SETTINGS.ask);
  merged.permissions = permissions;
  if (!("statusLine" in merged) && statusLineAt === null) merged.statusLine = SETTINGS.statusLine;
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
    if (statusLine !== undefined) return { path, ours: path === candidates[0] && isDeepStrictEqual(statusLine, SETTINGS.statusLine) };
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
    { name: "marketplace", args: [...ADD_MARKETPLACE.split(" "), market, "--scope", "project"], done: (s) => Boolean(s.extraKnownMarketplaces?.[MARKETPLACE]) },
    { name: "plugin", args: [...INSTALL_PLUGIN.split(" "), INSTALL.plugin, "--scope", "project"], done: (s) => Boolean(s.enabledPlugins?.[INSTALL.plugin]) },
    ...MOD_PLUGINS.map(({ name, id }) => ({ name, args: [...INSTALL_PLUGIN.split(" "), id, "--scope", "project"], done: (s) => id in (s.enabledPlugins ?? {}) })),
  ];
}

const INSTALL_STEP_NAMES = installCommands(null).map(({ name }) => name);

function byHand(market) {
  const commands = [`${ADD_MARKETPLACE} "${market}"`, `${INSTALL_PLUGIN} ${INSTALL.plugin}`, ...MOD_PLUGINS.map(({ id }) => `${INSTALL_PLUGIN} ${id}`)];
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

const STEPS = [
  ["claude-md", claudeMdStep],
  ["config", configStep],
  ["gitignore", gitignoreStep],
  ["settings", settingsStep],
];

export function init(root, { install = true, exec = programRunner(process.platform), market = marketplaceRoot(), home = homedir() } = {}) {
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
