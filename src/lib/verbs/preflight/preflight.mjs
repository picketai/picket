// Pre-flight without a model: are the inputs there, is the tree sane, what tooling exists.
// Each check is ok | warn | fail. One fail stops; warns are shown and work proceeds.
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { protectionScope } from "../../shared/sources/protection.mjs";
import { readSnapshot, stateView } from "../../shared/work/snapshot.mjs";
import { projectRoot } from "../../shared/paths.mjs";
import * as git from "../../shared/git.mjs";
import { loadConfig } from "../../shared/config.mjs";
import { listWorktrees } from "../../shared/sources/places.mjs";
import { LEGACY_LOCATIONS, hostPath, legacyPath } from "../../shared/paths.mjs";
import { loadExtensions } from "../../shared/extensions.mjs";
import { detectTooling } from "../../shared/tooling.mjs";
import { escalationAllowRules } from "../../shared/saved-rules.mjs";

/** What the guards protect for a root that is not a top level, so the user can see the effect. */
function scopeText({ kind, paths }) {
  return kind === "folder"
    ? `it lies in this project's repository, so the guards protect that folder only (${paths[0]})`
    : `the guards protect its whole repository and worktrees: ${paths.join(", ")}`;
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function onPath(program, env = process.env) {
  const pathVar = Object.entries(env).find(([key]) => key.toUpperCase() === "PATH")?.[1] ?? "";
  const extensions = process.platform === "win32" ? ["", ...(env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)] : [""];
  return pathVar.split(delimiter).filter(Boolean).some((dir) => extensions.some((ext) => isFile(join(dir, program + ext)) || isFile(join(dir, program + ext.toLowerCase()))));
}

const EXTENSION_CHECKS = {
  path_exists: (value, root) => existsSync(resolve(root, value)),
  env_set: (value) => Boolean(process.env[value]),
  command_on_path: (value) => onPath(value),
};

function addExtensionChecks(root, add) {
  const { enabled, refused } = loadExtensions(root);
  add("extensions", "ok", enabled.length ? enabled.map((e) => `${e.name}@${e.version}`).join(", ") : "none");
  for (const r of refused) add(`ext:${r.name}`, "fail", `refused: ${r.reason}`);
  for (const e of enabled) {
    for (const check of e.preflight) {
      const passed = EXTENSION_CHECKS[check.kind](check.value, root);
      add(`ext:${e.name}:${check.id}`, passed ? "ok" : check.level, passed ? `${check.kind} ${check.value}` : check.message);
    }
  }
}

export function preflight(id, root = projectRoot(), home = homedir()) {
  const checks = [];
  const add = (name, level, detail = "") => checks.push({ name, level, detail });

  let s = null;
  try {
    s = stateView(readSnapshot(root, id));
    add("work_item", "ok", `${s.lane} · ${s.status} · ${s.title}`);
  } catch (err) {
    add("work_item", "fail", err.message);
    return { ok: false, checks, tooling: null };
  }

  if (s.status === "blocked") add("status", "fail", `blocked: ${s.blocked_reason}`);
  else if (s.status !== "open") add("status", "fail", `work item is ${s.status}`);
  else add("status", "ok", "open");

  if (s.artifact_expected) {
    if (s.artifact) add("artifact", s.phase_count || s.lane === "research" ? "ok" : "fail", s.phase_count ? `${s.phase_count} phase(s)` : s.lane === "research" ? "report present" : "no ## Phase N headings");
    else add("artifact", "warn", `${s.artifact_expected} not written yet (next action will ask for it)`);
  }

  if (git.isRepo(root)) {
    const br = git.branch(root);
    add("branch", br === "HEAD" ? "warn" : "ok", br === "HEAD" ? "detached HEAD" : br);
    const dirty = git.dirtyPaths(root);
    if (dirty.length) add("tree", s.current_phase && s.current_phase > 1 ? "warn" : "warn", `${dirty.length} uncommitted path(s) outside work/: ${dirty.slice(0, 5).join(", ")}${dirty.length > 5 ? ", …" : ""}`);
    else add("tree", "ok", "clean outside work/");
  } else add("git", "warn", "not a git repository; phase commits and diff-based checks are unavailable");

  const tooling = detectTooling(root);
  add("tooling", tooling.test ? "ok" : "warn", tooling.test ? `test: ${tooling.test}${tooling.lint ? ` · lint: ${tooling.lint}` : ""}${tooling.run ? ` · run: ${tooling.run}` : ""}` : "no test command detected");

  const map = hostPath(root, "PROJECT-MAP.md");
  add("project_map", existsSync(map) ? "ok" : "warn", existsSync(map) ? "present" : "absent; the analyst can write one");

  const legacy = LEGACY_LOCATIONS.filter((rel) => existsSync(legacyPath(root, rel)));
  if (legacy.length) add("legacy_paths", "warn", `${legacy.join(", ")} still present; run picket migrate`);

  const savedRules = escalationAllowRules({ root, home });
  add("saved_rules", savedRules.length ? "warn" : "ok", savedRules.length ? savedRules.map(({ rule, file }) => `${rule} in ${file}`).join("; ") : "none");

  const config = loadConfig(root);
  if (config.error) add("config", "warn", `${config.error}; using the default security paths and no sources`);
  if (config.warnings.length) add("config", "warn", config.warnings.join("; "));
  for (const source of config.sources) {
    let scope;
    const trees = source.root ? listWorktrees(source.root) : [];
    if (!source.root) add(`source:${source.name}`, "warn", `unreachable: ${source.reason}`);
    else if (!trees.length) add(`source:${source.name}`, "warn", `unreachable: ${source.root} is not a git repository`);
    else if (!(scope = protectionScope(source.root, root, process.platform)).topLevel) add(`source:${source.name}`, "warn", `${source.root} is not a repository top level; ${scopeText(scope)}`);
    else add(`source:${source.name}`, "ok", `${source.root} · ${trees.length} worktree${trees.length === 1 ? "" : "s"}`);
  }

  addExtensionChecks(root, add);

  const ok = !checks.some((c) => c.level === "fail");
  return { ok, checks, tooling, state: s };
}
