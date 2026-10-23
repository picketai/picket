import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import * as paths from "./paths.mts";
import { withProject } from "#test/project.mts";

const { projectRoot } = paths;

function setProjectDirEnv(value: string | undefined) {
  if (value === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = value;
}

function withProjectDirEnv<T>(value: string | undefined, fn: () => T): T {
  const saved = process.env.CLAUDE_PROJECT_DIR;
  setProjectDirEnv(value);
  try {
    return fn();
  } finally {
    setProjectDirEnv(saved);
  }
}

const withoutProjectDirEnv = <T,>(fn: () => T) => withProjectDirEnv(undefined, fn);

function hasMarkedAncestor(dir: string): boolean {
  for (let d = dir; ; d = dirname(d)) {
    if ([paths.PICKET_DIR, paths.HOST_DIR].some((m) => existsSync(join(d, m)))) return true;
    if (dirname(d) === d) return false;
  }
}

function markerFreeBase(t: TestContext): string | null {
  for (const base of [tmpdir(), parse(tmpdir()).root]) {
    if (hasMarkedAncestor(base)) continue;
    try {
      return withProject(t, { picket: false, base });
    } catch {}
  }
  return null;
}

test("projectRoot honours CLAUDE_PROJECT_DIR first (T-1.3)", (t) => {
  const root = withProject(t, { picket: false });
  assert.equal(withProjectDirEnv(root, () => projectRoot(tmpdir())), resolve(root));
});

for (const marker of [paths.PICKET_DIR, paths.HOST_DIR]) {
  test(`projectRoot returns the nearest ancestor holding ${marker} (T-1.3)`, (t) => {
    const root = withProject(t, { picket: false });
    mkdirSync(join(root, marker));
    const deep = join(root, "a", "b");
    mkdirSync(deep, { recursive: true });
    assert.equal(withoutProjectDirEnv(() => projectRoot(deep)), root);
  });
}

test("projectRoot returns the start folder when no ancestor is marked (T-1.3)", (t) => {
  const base = markerFreeBase(t);
  if (!base) return t.skip("every writable temporary folder sits under a marked ancestor");
  const start = join(base, "x");
  mkdirSync(start);
  assert.equal(withoutProjectDirEnv(() => projectRoot(start)), start);
});

test("paths exports locations only", () => {
  assert.deepEqual(Object.keys(paths).sort(), [
    "BOOKKEEPING_PREFIXES",
    "HOST_DIR",
    "LEGACY",
    "LEGACY_LOCATIONS",
    "MODEL_WRITABLE_STATE_FILES",
    "PICKET_DIR",
    "STATE_FILES",
    "WORK_DIR",
    "branchingManifestPath",
    "configPath",
    "configRel",
    "hostPath",
    "hostRel",
    "legacyPath",
    "pluginManifestPath",
    "pluginRoot",
    "projectRoot",
    "repoRelative",
    "rulesDir",
    "sessionCostPath",
    "stateDir",
    "statePath",
    "stateRel",
    "userConfigPath",
    "workRoot",
    "workspaceRoot",
  ]);
});

test("sessionCostPath refuses ids that are not a plain file name", () => {
  for (const id of ["../x", "a/b", "a.b", "", "x".repeat(129), undefined, 42]) assert.equal(paths.sessionCostPath("/r", id as string), null, String(id));
  assert.ok(paths.sessionCostPath("/r", "abc-DEF_1")?.endsWith(join("sessions", "abc-DEF_1.json")));
});

test("userConfigPath names the Picket config under the user's home", () => {
  assert.equal(paths.userConfigPath("/h"), join("/h", ".picketai/config.json"));
});

test("workspaceRoot finds the marked project above a folder and falls back without one", (t) => {
  const root = withProject(t);
  const deep = join(root, "a", "b");
  mkdirSync(deep, { recursive: true });
  assert.equal(withoutProjectDirEnv(() => paths.workspaceRoot(deep, "/f")), root);
  assert.equal(paths.workspaceRoot(null, "/f"), "/f");
});

test("relative locations read as POSIX paths and absolute ones sit under the root", () => {
  const root = resolve("some-root");
  assert.equal(paths.stateRel("ledger.jsonl"), ".picket/state/ledger.jsonl");
  assert.equal(paths.statePath(root, paths.STATE_FILES.ledger), join(root, ".picket", "state", "ledger.jsonl"));
  assert.equal(paths.STATE_FILES.guardLog, "guard.log");
  assert.equal(paths.configRel(), ".picket/config.json");
  assert.equal(paths.configPath(root), join(root, ".picket", "config.json"));
  assert.equal(paths.branchingManifestPath(root), join(root, ".picket", "state", "branching.yaml"));
  assert.equal(paths.legacyPath(root, paths.LEGACY.branchingManifest), join(root, ".claude", "branching", "manifest.yaml"));
  assert.deepEqual([...paths.LEGACY_LOCATIONS], [".claude/ledger", ".claude/branching/manifest.yaml", ".claude/harness.json"]);
  assert.equal(paths.hostRel("MEMORY.md"), ".claude/MEMORY.md");
  assert.equal(paths.hostPath(root, "MEMORY.md"), join(root, ".claude", "MEMORY.md"));
  assert.equal(paths.workRoot(root), join(root, "work"));
  assert.deepEqual([...paths.BOOKKEEPING_PREFIXES], ["work/", ".claude/", ".picket/"]);
});

test("pluginRoot throws, naming the start folder, when no manifest sits above it (T-1.6)", (t) => {
  const start = withProject(t, { picket: false });
  assert.throws(() => paths.pluginRoot(start), (err) => err instanceof Error && err.message.includes(start));
});

test("repoRelative expresses a path from the project root and flags the outside", (t) => {
  const root = withProject(t, { picket: false });
  const inside = withProjectDirEnv(root, () => paths.repoRelative({ cwd: join(root, "src") }, "a.ts"));
  assert.deepEqual([inside.rel, inside.outside], ["src/a.ts", false]);
  const beside = withProjectDirEnv(root, () => paths.repoRelative({ cwd: root }, join(dirname(root), "elsewhere.ts")));
  assert.equal(beside.outside, true);
});
