import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { RETIRED_PLUGINS } from "../../mods.mts";
import { claudeBlockSpan, DATA_FOLDER_STATUS_LINE, INSTALL, isHomeFolder, isPicketStatusLine, LEGACY_STATUS_LINE, MARKETPLACE, pluginId, readTemplate } from "../../shared/install.mts";
import { HOST_DIR, hostPath } from "../../shared/paths.mts";
import { programRunner } from "../../util/process.mts";
import { shadowingPicket, shadowWarning } from "./shadow.mts";

const { claudeMd, config, gitignore, settings: SETTINGS } = INSTALL;
const INSTALL_ARGS = ["plugin", "install", INSTALL.plugin, "--scope", "project"];

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
  if (span === null) return existing === "" ? template : `${lf(existing)}\n${template}`;
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
  return { name: "gitignore", path, result: writeIfChanged(path, existing, withIgnoreLine(existing)) };
}

function withIgnoreLine(existing) {
  if (existing === null) return `${gitignore.line}\n`;
  if (existing === "") return gitignore.line;
  const eol = eolOf(existing);
  return existing.endsWith("\n") ? `${existing}${gitignore.line}${eol}` : `${existing}${eol}${gitignore.line}`;
}

function union(existing, wanted) {
  const list = Array.isArray(existing) ? [...existing] : [];
  for (const rule of wanted) if (!list.includes(rule)) list.push(rule);
  return list;
}

function statusLineChange(merged, { holder, statusline }) {
  if (isDeepStrictEqual(merged.statusLine, LEGACY_STATUS_LINE)) {
    if (statusline) merged.statusLine = SETTINGS.statusLine;
    else delete merged.statusLine;
    return `${statusline ? "replaced" : "removed"} the legacy statusLine "${LEGACY_STATUS_LINE.command}"`;
  }
  if (!statusline) return null;
  if (isDeepStrictEqual(merged.statusLine, DATA_FOLDER_STATUS_LINE)) {
    merged.statusLine = SETTINGS.statusLine;
    return "replaced the data folder statusLine with the project copy";
  }
  if (holder === null) {
    merged.statusLine = SETTINGS.statusLine;
    return null;
  }
  return holder.ours ? null : `statusLine already set in ${holder.path}`;
}

export function mergeSettings(settings, { holder = null, statusline = false } = {}) {
  const merged = structuredClone(settings);
  const permissions = { ...(merged.permissions ?? {}) };
  const denied = Array.isArray(permissions.deny) ? permissions.deny : [];
  const blocked = SETTINGS.allow.filter((rule) => denied.includes(rule));
  merged.env = { ...(merged.env ?? {}), ...SETTINGS.env };
  permissions.allow = union(permissions.allow, SETTINGS.allow.filter((rule) => !blocked.includes(rule)));
  permissions.ask = union(permissions.ask, SETTINGS.ask);
  merged.permissions = permissions;
  const statusNote = statusLineChange(merged, { holder, statusline });
  return { merged, blocked, statusNote };
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
    if (statusLine !== undefined) return { path, ours: path === candidates[0] && isPicketStatusLine(statusLine) };
  }
  return null;
}

function parsedSettings(existing) {
  try {
    return { settings: existing === null ? {} : JSON.parse(existing), error: null };
  } catch (err) {
    return { settings: null, error: `not valid JSON, left as is: ${err.message}` };
  }
}

function writeSettings(path, existing, settings) {
  return writeIfChanged(path, existing, `${JSON.stringify(settings, null, 2)}\n`);
}

function settingsStep(root, { home, statusline }) {
  const path = hostPath(root, "settings.json");
  const existing = readOrNull(path);
  const { settings, error } = parsedSettings(existing);
  if (error) return { name: "settings", path, result: "failed", detail: error };
  const { merged, blocked, statusNote } = mergeSettings(settings, { holder: statusLineHolder(root, home), statusline });
  const notes = [blocked.length ? `WARNING: permissions.deny holds ${blocked.join(", ")}, so init did not allow it` : null, statusNote].filter(Boolean);
  const changed = existing === null || JSON.stringify(merged) !== JSON.stringify(settings);
  const result = changed ? writeSettings(path, existing, merged) : "unchanged";
  return { name: "settings", path, result, ...(notes.length ? { detail: notes.join("; ") } : {}) };
}

function marketplaceStep(root) {
  const path = hostPath(root, "settings.json");
  const existing = readOrNull(path);
  const { settings, error } = parsedSettings(existing);
  if (error) return { name: "marketplace", path, result: "failed", detail: error };
  const known = settings.extraKnownMarketplaces ?? {};
  const current = known[MARKETPLACE];
  if (isDeepStrictEqual(current, INSTALL.marketplace)) return { name: "marketplace", path, result: "unchanged" };
  writeSettings(path, existing, { ...settings, extraKnownMarketplaces: { ...known, [MARKETPLACE]: INSTALL.marketplace } });
  if (current === undefined) return { name: "marketplace", path, result: "created" };
  return { name: "marketplace", path, result: "updated", detail: `replaced the old source ${JSON.stringify(current?.source ?? current)}` };
}

function projectSettings(root) {
  try {
    return JSON.parse(readFileSync(hostPath(root, "settings.json"), "utf8"));
  } catch {
    return {};
  }
}

function lastLine(err) {
  const text = String(err.stderr || err.stdout || err.message || err).trim();
  return text.split(/\r?\n/).filter(Boolean).at(-1) ?? "failed";
}

function claudeStep(root, exec, { name, args, result }) {
  const path = hostPath(root, "settings.json");
  try {
    exec("claude", args, { cwd: root });
    return { name, path, result };
  } catch (err) {
    return { name, path, result: "failed", detail: `${lastLine(err)}; run by hand: claude ${args.join(" ")}` };
  }
}

function retiredIds(root) {
  const enabled = projectSettings(root).enabledPlugins ?? {};
  return RETIRED_PLUGINS.map(pluginId).filter((id) => id in enabled);
}

function retireSteps(root, { install, exec }) {
  return retiredIds(root).map((id) => {
    const name = `retire ${id}`;
    if (!install) return { name, path: hostPath(root, "settings.json"), result: "skipped" };
    return claudeStep(root, exec, { name, args: ["plugin", "uninstall", id, "--scope", "project"], result: "removed" });
  });
}

function pluginStep(root, { install, exec }) {
  const path = hostPath(root, "settings.json");
  if (!install) return { name: "plugin", path, result: "skipped" };
  if (projectSettings(root).enabledPlugins?.[INSTALL.plugin]) return { name: "plugin", path, result: "unchanged" };
  return claudeStep(root, exec, { name: "plugin", args: INSTALL_ARGS, result: "created" });
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function initWarnings({ env, home, platform }) {
  if (env.PICKET_CHECKOUT) return [];
  const pathEnv = env.PATH ?? env.Path ?? "";
  const shadow = shadowingPicket({ pathEnv, platform, home, configDir: env.CLAUDE_CONFIG_DIR || null, realpath: realpathSync, isFile });
  return shadow === null ? [] : [shadowWarning(shadow)];
}

const STEPS = [
  ["claude-md", claudeMdStep],
  ["config", configStep],
  ["gitignore", gitignoreStep],
  ["settings", settingsStep],
];

function safely(name, step) {
  try {
    return step();
  } catch (err) {
    return { name, path: null, result: "failed", detail: err.message };
  }
}

export function init(root, { install = true, exec = programRunner(process.platform), home = homedir(), env = process.env, platform = process.platform, statusline = false } = {}) {
  const fileSteps = STEPS.map(([name, step]) => safely(name, () => step(root, { home, statusline })));
  const retired = retireSteps(root, { install, exec });
  const marketplace = safely("marketplace", () => marketplaceStep(root));
  const plugin = safely("plugin", () => pluginStep(root, { install, exec }));
  return { root, steps: [...fileSteps, ...retired, marketplace, plugin], warnings: initWarnings({ env, home, platform }) };
}

export function renderInit(report) {
  const lines = [`root: ${report.root}`];
  for (const s of report.steps) lines.push(`${s.name}: ${s.result}${s.path ? ` ${s.path}` : ""}${s.detail ? ` · ${s.detail}` : ""}`);
  for (const warning of report.warnings ?? []) lines.push(`WARNING: ${warning}`);
  return lines.join("\n");
}
