// Pre-flight without a model: are the inputs there, is the tree sane, what tooling exists.
// Each check is ok | warn | fail. One fail stops; warns are shown and work proceeds.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { deriveState, projectRoot } from "./work.mjs";
import * as git from "./git.mjs";
import { loadConfig } from "./config.mjs";
import { listWorktrees } from "./sources.mjs";

export function detectTooling(root) {
  const out = { test: null, lint: null, build: null, run: null, stack: null };
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    const scripts = JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {};
    out.stack = "node";
    if (scripts.test && !/no test specified/.test(scripts.test)) out.test = "npm test";
    if (scripts.lint) out.lint = "npm run lint";
    if (scripts.build) out.build = "npm run build";
    if (scripts.start) out.run = "npm start";
  }
  const sln = ["*.sln"].some(() => existsSync(join(root, "Directory.Build.props")) || existsSync(join(root, "global.json")));
  if (!out.stack && sln) {
    out.stack = "dotnet";
    out.test = "dotnet test";
    out.build = "dotnet build";
  }
  if (!out.stack && (existsSync(join(root, "pyproject.toml")) || existsSync(join(root, "pytest.ini")))) {
    out.stack = "python";
    out.test = "pytest";
  }
  return out;
}

/** Same location on disk, whatever the spelling (8.3 short names, slashes, case on Windows). */
function samePath(a, b) {
  const canon = (p) => {
    let real = resolve(p);
    try {
      real = realpathSync.native(real);
    } catch {}
    const out = real.replaceAll("\\", "/").replace(/\/+$/, "");
    return process.platform === "win32" ? out.toLowerCase() : out;
  };
  return canon(a) === canon(b);
}

export function preflight(id, root = projectRoot()) {
  const checks = [];
  const add = (name, level, detail = "") => checks.push({ name, level, detail });

  let s = null;
  try {
    s = deriveState(id, root);
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

  const map = join(root, ".claude", "PROJECT-MAP.md");
  add("project_map", existsSync(map) ? "ok" : "warn", existsSync(map) ? "present" : "absent; the analyst can write one");

  const config = loadConfig(root);
  if (config.error) add("config", "warn", `${config.error}; using the default security paths and no sources`);
  for (const source of config.sources) {
    const trees = source.root ? listWorktrees(source.root) : [];
    if (!source.root) add(`source:${source.name}`, "warn", `unreachable: ${source.reason}`);
    else if (!trees.length) add(`source:${source.name}`, "warn", `unreachable: ${source.root} is not a git repository`);
    else if (!trees.some((t) => samePath(t.path, source.root))) add(`source:${source.name}`, "warn", `${source.root} is inside a worktree, not its top level; set ${source.env} to the repository root (the guards protect the whole repository either way)`);
    else add(`source:${source.name}`, "ok", `${source.root} · ${trees.length} worktree${trees.length === 1 ? "" : "s"}`);
  }

  const ok = !checks.some((c) => c.level === "fail");
  return { ok, checks, tooling, state: s };
}
