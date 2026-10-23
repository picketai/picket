import { existsSync, lstatSync, readdirSync, readFileSync, rmdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { join } from "node:path";
import { MODS } from "../../mods.mts";
import { extensionsDir } from "../../shared/extensions.mjs";
import { claudeBlockSpan, INSTALL, MARKETPLACE, pluginId, readTemplate } from "../../shared/install.mts";
import { configPath, hostPath, PICKET_DIR, stateDir, workRoot } from "../../shared/paths.mts";
import type { ProgramRunner } from "../../util/process.mts";
import type { Prompt } from "../../util/prompt.mts";

export const UNINSTALL_GROUPS = ["plugins", "settings", "claude-md", "gitignore", "config", "state", "work"] as const;
export type GroupId = (typeof UNINSTALL_GROUPS)[number];
export type PlannedGroup = { id: GroupId; summary: string; steps: string[]; chosen: boolean; note?: string };
export type UninstallResult = "planned" | "declined" | "kept" | "removed" | "failed";
export type UninstallChange = { id: GroupId; summary: string; result: UninstallResult; detail?: string };
export type UninstallReport = { root: string; changes: UninstallChange[]; manual: string[] };
export type UninstallInput = { dryRun: boolean; yes: boolean; removeWork: boolean };
export type UninstallDeps = { exec: ProgramRunner; prompt: Prompt };

type Settings = Record<string, unknown>;
type Planner = (root: string, options: { removeWork: boolean }) => PlannedGroup | null;
type Remover = (root: string, deps: UninstallDeps) => void;

const { claudeMd, gitignore, settings: SETTINGS } = INSTALL;
const NOT_INTERACTIVE = "nothing was changed: run this in a terminal or pass --yes to remove the chosen groups";
const YES_NO = ["yes", "no"];

function lf(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function eolOf(text: string): string {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function readOrNull(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function removeInside(path: string): void {
  rmSync(path, { recursive: !isLink(path), force: true });
}

function isLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function removeIfEmpty(dir: string): void {
  if (existsSync(dir) && !isLink(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
}

function settingsPath(root: string): string {
  return hostPath(root, "settings.json");
}

function readSettings(root: string): Settings | null {
  const text = readOrNull(settingsPath(root));
  if (text === null) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function record(value: unknown): Settings {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Settings) : {};
}

function pluginIdsIn(settings: Settings): string[] {
  const enabled = record(settings.enabledPlugins);
  const ids = [...Object.values(MODS).map(({ plugin }) => pluginId(plugin)), INSTALL.plugin];
  return ids.filter((id) => id in enabled);
}

function hasMarketplace(settings: Settings): boolean {
  return MARKETPLACE in record(settings.extraKnownMarketplaces);
}

function pluginCommands(settings: Settings): string[][] {
  const uninstalls = pluginIdsIn(settings).map((id) => ["plugin", "uninstall", id, "--scope", "project"]);
  return hasMarketplace(settings) ? [...uninstalls, ["plugin", "marketplace", "remove", MARKETPLACE, "--scope", "project"]] : uninstalls;
}

function shown(args: string[]): string {
  return `claude ${args.join(" ")}`;
}

const planPlugins: Planner = (root) => {
  const settings = readSettings(root);
  if (settings === null) return null;
  const commands = pluginCommands(settings);
  if (commands.length === 0) return null;
  return { id: "plugins", summary: "uninstall Picket's plugins and marketplace from the project scope", steps: commands.map(shown), chosen: true };
};

function lastLine(err: unknown): string {
  const failure = err as { stderr?: unknown; stdout?: unknown; message?: unknown };
  const text = String(failure.stderr || failure.stdout || failure.message || err).trim();
  return text.split(/\r?\n/).filter(Boolean).at(-1) ?? "failed";
}

const removePlugins: Remover = (root, { exec }) => {
  const commands = pluginCommands(readSettings(root) ?? {});
  commands.forEach((args, at) => {
    try {
      exec("claude", args, { cwd: root });
    } catch (err) {
      const left = commands.slice(at).map(shown).join(", then ");
      throw new Error(`${lastLine(err)}; run by hand: ${left}`);
    }
  });
};

function withoutValues(list: unknown, values: readonly string[]): unknown[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.filter((rule) => !values.includes(rule));
}

function picketEntries(settings: Settings): string[] {
  const permissions = record(settings.permissions);
  const env = record(settings.env);
  const listed = (key: "allow" | "ask") => SETTINGS[key].filter((rule) => Array.isArray(permissions[key]) && (permissions[key] as unknown[]).includes(rule)).map((rule) => `permissions.${key} "${rule}"`);
  const envKeys = Object.entries(SETTINGS.env).filter(([key, value]) => env[key] === value).map(([key]) => `env.${key}`);
  const statusLine = isDeepStrictEqual(settings.statusLine, SETTINGS.statusLine) ? ["statusLine"] : [];
  return [...listed("allow"), ...listed("ask"), ...envKeys, ...statusLine];
}

function setOrDrop(target: Settings, key: string, value: unknown[] | Settings | undefined): void {
  const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0);
  if (empty) delete target[key];
  else target[key] = value;
}

export function withoutPicket(settings: Settings): Settings {
  const next: Settings = { ...settings };
  if ("permissions" in settings) {
    const permissions: Settings = { ...record(settings.permissions) };
    for (const key of ["allow", "ask"] as const) if (key in permissions) setOrDrop(permissions, key, withoutValues(permissions[key], SETTINGS[key]));
    setOrDrop(next, "permissions", permissions);
  }
  if ("env" in settings) {
    const env = Object.fromEntries(Object.entries(record(settings.env)).filter(([key, value]) => (SETTINGS.env as Record<string, string>)[key] !== value));
    setOrDrop(next, "env", env);
  }
  if (isDeepStrictEqual(settings.statusLine, SETTINGS.statusLine)) delete next.statusLine;
  return next;
}

const planSettings: Planner = (root) => {
  const settings = readSettings(root);
  if (settings === null) return { id: "settings", summary: `${settingsPath(root)} is not valid JSON`, steps: [], chosen: false, note: "left as is; remove Picket's entries and plugins by hand" };
  const entries = picketEntries(settings);
  if (entries.length === 0) return null;
  return { id: "settings", summary: `remove Picket's entries from ${settingsPath(root)}`, steps: entries.map((entry) => `remove ${entry}`), chosen: true };
};

const removeSettings: Remover = (root) => {
  const settings = readSettings(root);
  if (settings === null) throw new Error(`${settingsPath(root)} is not valid JSON, left as is`);
  const next = withoutPicket(settings);
  if (Object.keys(next).length > 0) {
    writeFileSync(settingsPath(root), `${JSON.stringify(next, null, 2)}\n`);
    return;
  }
  unlinkSync(settingsPath(root));
  removeIfEmpty(hostPath(root));
};

function claudeMdPath(root: string): string {
  return join(root, claudeMd.file);
}

export function withoutClaudeBlock(text: string, template: string): string | null {
  const lines = lf(text).split("\n");
  const span = claudeBlockSpan(lines, template);
  if (span === null) return null;
  const before = lines.slice(0, span.start);
  if (before.at(-1) === "") before.pop();
  const after = lines.slice(span.end);
  const kept = [...before, ...after];
  if (span.end === lines.length && lines.at(-1) === "") kept.push("");
  return kept.join(eolOf(text));
}

function onlyEmptyFacts(text: string): boolean {
  const content = lf(text).split("\n").filter((line) => line.trim() !== "");
  return content.length === 0 || (content.length === 1 && content[0] === claudeMd.projectFacts);
}

const planClaudeMd: Planner = (root) => {
  const text = readOrNull(claudeMdPath(root));
  if (text === null || withoutClaudeBlock(text, readTemplate()) === null) return null;
  return { id: "claude-md", summary: `remove the Picket block from ${claudeMdPath(root)}`, steps: [`remove the ${claudeMd.start} block, up to the next heading it does not own`], chosen: true };
};

const removeClaudeMd: Remover = (root) => {
  const path = claudeMdPath(root);
  const next = withoutClaudeBlock(readFileSync(path, "utf8"), readTemplate());
  if (next === null) return;
  if (onlyEmptyFacts(next)) unlinkSync(path);
  else writeFileSync(path, next);
};

function gitignorePath(root: string): string {
  return join(root, gitignore.file);
}

const planGitignore: Planner = (root) => {
  const text = readOrNull(gitignorePath(root));
  if (text === null || !lf(text).split("\n").some((line) => line.trim() === gitignore.line)) return null;
  return { id: "gitignore", summary: `remove "${gitignore.line}" from ${gitignorePath(root)}`, steps: [`remove the line ${gitignore.line}`], chosen: true };
};

const removeGitignore: Remover = (root) => {
  const path = gitignorePath(root);
  const text = readFileSync(path, "utf8");
  const next = lf(text).split("\n").filter((line) => line.trim() !== gitignore.line).join(eolOf(text));
  if (next.trim() === "") unlinkSync(path);
  else writeFileSync(path, next);
};

function holdsExtension(root: string): boolean {
  const dir = extensionsDir(root);
  return existsSync(dir) && readdirSync(dir).length > 0;
}

const planConfig: Planner = (root) => {
  if (!existsSync(configPath(root))) return null;
  const extension = holdsExtension(root);
  const steps = [`remove ${configPath(root)}`, ...(extension ? [`remove ${extensionsDir(root)}`] : [])];
  const note = extension ? `${extensionsDir(root)} holds an extension, so this group is not chosen unless you choose it` : undefined;
  return { id: "config", summary: "remove the project's Picket config", steps, chosen: !extension, ...(note ? { note } : {}) };
};

const removeConfig: Remover = (root) => {
  removeInside(configPath(root));
  removeInside(extensionsDir(root));
};

function folderPlanner(id: GroupId, path: (root: string) => string, summary: string, chosen: (removeWork: boolean) => boolean): Planner {
  return (root, { removeWork }) => {
    if (!existsSync(path(root)) && !isLink(path(root))) return null;
    return { id, summary: `${summary} ${path(root)}`, steps: [`remove ${path(root)}`], chosen: chosen(removeWork) };
  };
}

const PLANNERS: Record<GroupId, Planner> = {
  plugins: planPlugins,
  settings: planSettings,
  "claude-md": planClaudeMd,
  gitignore: planGitignore,
  config: planConfig,
  state: folderPlanner("state", stateDir, "remove Picket's state folder", () => true),
  work: folderPlanner("work", workRoot, "remove the work items in", (removeWork) => removeWork),
};

const REMOVERS: Record<GroupId, Remover> = {
  plugins: removePlugins,
  settings: removeSettings,
  "claude-md": removeClaudeMd,
  gitignore: removeGitignore,
  config: removeConfig,
  state: (root) => removeInside(stateDir(root)),
  work: (root) => removeInside(workRoot(root)),
};

export function planUninstall(root: string, { removeWork }: { removeWork: boolean }): PlannedGroup[] {
  return UNINSTALL_GROUPS.flatMap((id) => PLANNERS[id](root, { removeWork }) ?? []);
}

function change(group: PlannedGroup, result: UninstallResult, detail?: string): UninstallChange {
  return { id: group.id, summary: group.summary, result, ...(detail ? { detail } : {}) };
}

function question(group: PlannedGroup): string {
  return [group.summary, ...group.steps.map((step) => `  - ${step}`), ...(group.note ? [`  (${group.note})`] : []), "Remove this group?"].join("\n");
}

async function wanted(group: PlannedGroup, { yes }: UninstallInput, prompt: Prompt): Promise<boolean> {
  if (yes) return group.chosen;
  return (await prompt.ask(question(group), { choices: YES_NO, fallback: group.chosen ? "yes" : "no" })) === "yes";
}

async function applyGroup(root: string, group: PlannedGroup, input: UninstallInput, deps: UninstallDeps): Promise<UninstallChange> {
  if (group.steps.length === 0) return change(group, "kept", group.note);
  if (!(await wanted(group, input, deps.prompt))) return change(group, "kept", group.note);
  try {
    REMOVERS[group.id](root, deps);
    return change(group, "removed");
  } catch (err) {
    return change(group, "failed", (err as Error).message);
  }
}

export async function runUninstall(root: string, input: UninstallInput, deps: UninstallDeps): Promise<UninstallReport> {
  const groups = planUninstall(root, { removeWork: input.removeWork });
  if (input.dryRun) return { root, changes: groups.map((group) => change(group, "planned", group.steps.join("; "))), manual: [] };
  if (!input.yes && !deps.prompt.interactive) return { root, changes: groups.map((group) => change(group, "declined")), manual: [NOT_INTERACTIVE] };
  const changes: UninstallChange[] = [];
  for (const group of groups) changes.push(await applyGroup(root, group, input, deps));
  removeIfEmpty(join(root, PICKET_DIR));
  return { root, changes, manual: [] };
}
