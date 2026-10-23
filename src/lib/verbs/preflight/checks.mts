import { existsSync, statSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import type { loadConfig } from "../../shared/config.mjs";
import { loadExtensions } from "../../shared/extensions.mjs";
import { hostPath, LEGACY_LOCATIONS, legacyPath } from "../../shared/paths.mts";
import { escalationAllowRules } from "../../shared/saved-rules.mjs";
import { listWorktrees } from "../../shared/sources/places.mts";
import { protectionScope, type ProtectionScope } from "../../shared/sources/protection.mts";
import type { Tooling } from "../../shared/tooling.mts";
import type { StateView, WorkSnapshot } from "../../shared/work/snapshot.mts";

export type Level = "ok" | "warn" | "fail";
export type Check = { name: string; level: Level; detail: string };
export type GitFacts = { repo: boolean; branch: string | null; dirty: string[] };
export type PreflightInput = {
  root: string;
  snapshot: WorkSnapshot;
  view: StateView;
  config: ReturnType<typeof loadConfig>;
  tooling: { tooling: Tooling; warnings: string[] };
  git: GitFacts;
  home: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
};
export type PreflightCheck = (input: PreflightInput) => Check | Check[] | null;

type ExtensionCheckKind = "path_exists" | "env_set" | "command_on_path";

const DIRTY_SHOWN = 5;
const DEFAULT_PATHEXT = ".COM;.EXE;.BAT;.CMD";

const check = (name: string, level: Level, detail: string): Check => ({ name, level, detail });

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function onPath(program: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): boolean {
  const pathVar = Object.entries(env).find(([key]) => key.toUpperCase() === "PATH")?.[1] ?? "";
  const extensions = platform === "win32" ? ["", ...(env.PATHEXT ?? DEFAULT_PATHEXT).split(";").filter(Boolean)] : [""];
  return pathVar
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => extensions.some((ext) => isFile(join(dir, program + ext)) || isFile(join(dir, program + ext.toLowerCase()))));
}

function scopeText({ kind, paths }: ProtectionScope): string {
  return kind === "folder"
    ? `it lies in this project's repository, so the guards protect that folder only (${paths[0]})`
    : `the guards protect its whole repository and worktrees: ${paths.join(", ")}`;
}

const workItemCheck: PreflightCheck = ({ view }) => check("work_item", "ok", `${view.lane} · ${view.status} · ${view.title}`);

const statusCheck: PreflightCheck = ({ view }) => {
  if (view.status === "blocked") return check("status", "fail", `blocked: ${view.blocked_reason}`);
  if (view.status !== "open") return check("status", "fail", `work item is ${view.status}`);
  return check("status", "ok", "open");
};

const artifactCheck: PreflightCheck = ({ view }) => {
  if (!view.artifact_expected) return null;
  if (!view.artifact) return check("artifact", "warn", `${view.artifact_expected} not written yet (next action will ask for it)`);
  if (view.phase_count) return check("artifact", "ok", `${view.phase_count} phase(s)`);
  return view.lane === "research" ? check("artifact", "ok", "report present") : check("artifact", "fail", "no ## Phase N headings");
};

const branchCheck: PreflightCheck = ({ git }) => {
  if (!git.repo) return check("git", "warn", "not a git repository; phase commits and diff-based checks are unavailable");
  return git.branch === "HEAD" ? check("branch", "warn", "detached HEAD") : check("branch", "ok", String(git.branch));
};

const treeCheck: PreflightCheck = ({ git }) => {
  if (!git.repo) return null;
  if (!git.dirty.length) return check("tree", "ok", "clean outside work/");
  const shown = git.dirty.slice(0, DIRTY_SHOWN).join(", ");
  return check("tree", "warn", `${git.dirty.length} uncommitted path(s) outside work/: ${shown}${git.dirty.length > DIRTY_SHOWN ? ", …" : ""}`);
};

const toolingCheck: PreflightCheck = ({ tooling: { tooling, warnings } }) => {
  const detail = tooling.test ? `test: ${tooling.test}${tooling.lint ? ` · lint: ${tooling.lint}` : ""}${tooling.run ? ` · run: ${tooling.run}` : ""}` : "no test command detected";
  return check("tooling", tooling.test && !warnings.length ? "ok" : "warn", [detail, ...warnings].join("; "));
};

const projectMapCheck: PreflightCheck = ({ root }) =>
  existsSync(hostPath(root, "PROJECT-MAP.md")) ? check("project_map", "ok", "present") : check("project_map", "warn", "absent; the analyst can write one");

const legacyCheck: PreflightCheck = ({ root }) => {
  const legacy = LEGACY_LOCATIONS.filter((rel) => existsSync(legacyPath(root, rel)));
  return legacy.length ? check("legacy_paths", "warn", `${legacy.join(", ")} still present; run picket migrate`) : null;
};

const savedRulesCheck: PreflightCheck = ({ root, home }) => {
  const savedRules = escalationAllowRules({ root, home });
  if (!savedRules.length) return check("saved_rules", "ok", "none");
  return check("saved_rules", "warn", savedRules.map(({ rule, file }) => `${rule} in ${file}`).join("; "));
};

const configCheck: PreflightCheck = ({ config }) => [
  ...(config.error ? [check("config", "warn", `${config.error}; using the default security paths and no sources`)] : []),
  ...(config.warnings.length ? [check("config", "warn", config.warnings.join("; "))] : []),
];

function sourceCheck(input: PreflightInput, source: PreflightInput["config"]["sources"][number]): Check {
  const name = `source:${source.name}`;
  if (!source.root) return check(name, "warn", `unreachable: ${source.reason}`);
  const trees = listWorktrees(source.root);
  if (!trees.length) return check(name, "warn", `unreachable: ${source.root} is not a git repository`);
  const scope = protectionScope(source.root, input.root, input.platform);
  if (!scope.topLevel) return check(name, "warn", `${source.root} is not a repository top level; ${scopeText(scope)}`);
  return check(name, "ok", `${source.root} · ${trees.length} worktree${trees.length === 1 ? "" : "s"}`);
}

const sourceChecks: PreflightCheck = (input) => input.config.sources.map((source) => sourceCheck(input, source));

const EXTENSION_CHECKS: Record<ExtensionCheckKind, (value: string, input: PreflightInput) => boolean> = {
  path_exists: (value, { root }) => existsSync(resolve(root, value)),
  env_set: (value, { env }) => Boolean(env[value]),
  command_on_path: (value, { env, platform }) => onPath(value, env, platform),
};

const extensionChecks: PreflightCheck = (input) => {
  const { enabled, refused } = loadExtensions(input.root);
  const checks = [check("extensions", "ok", enabled.length ? enabled.map((e) => `${e.name}@${e.version}`).join(", ") : "none")];
  for (const r of refused) checks.push(check(`ext:${r.name}`, "fail", `refused: ${r.reason}`));
  for (const e of enabled) {
    for (const declared of e.preflight) {
      const passed = EXTENSION_CHECKS[declared.kind as ExtensionCheckKind](declared.value, input);
      checks.push(check(`ext:${e.name}:${declared.id}`, passed ? "ok" : declared.level, passed ? `${declared.kind} ${declared.value}` : declared.message));
    }
  }
  return checks;
};

export const CHECKS: PreflightCheck[] = [
  workItemCheck,
  statusCheck,
  artifactCheck,
  branchCheck,
  treeCheck,
  toolingCheck,
  projectMapCheck,
  legacyCheck,
  savedRulesCheck,
  configCheck,
  sourceChecks,
  extensionChecks,
];
