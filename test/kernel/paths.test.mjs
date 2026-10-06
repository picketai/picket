import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import * as paths from "../../.claude/lib/paths.mjs";
import { codeLines, isPathsModule, kernelModules } from "./kernel-sources.mjs";

const { projectRoot } = paths;

const SELF_LOCATION = ["import.meta.url", "import.meta.dirname", "import.meta.filename", "__dirname", "__filename", "process.argv[1]"];

function selfLocationUses(text) {
  return SELF_LOCATION.filter((needle) => text.includes(needle));
}

test("the self-location ban flags every forbidden form", () => {
  for (const needle of SELF_LOCATION) {
    assert.deepEqual(selfLocationUses(`const here = ${needle};`), [needle]);
  }
  assert.deepEqual(selfLocationUses('const mod = await import("./vendor/x.mjs");'), []);
});

test("no kernel, hook or bin module builds a path from its own location (T-1.1)", () => {
  const offenders = kernelModules()
    .map((file) => ({ file, uses: selfLocationUses(readFileSync(file, "utf8")) }))
    .filter(({ uses }) => uses.length);
  assert.deepEqual(offenders, []);
});

function hostLiteralLines(text) {
  return codeLines(text).filter((line) => line.includes(paths.HOST_DIR));
}

test("the host-folder ban flags a code line and skips comment lines", () => {
  assert.deepEqual(hostLiteralLines('const dir = join(root, ".claude", "ledger");'), ['const dir = join(root, ".claude", "ledger");']);
  assert.deepEqual(hostLiteralLines(["// see .claude/hooks", "/* .claude */", " * .claude/x", "const a = 1;"].join("\n")), []);
});

test("only paths.mjs spells the host folder in kernel, hook and bin code (T-2.1)", () => {
  const offenders = kernelModules()
    .filter((file) => !isPathsModule(file))
    .flatMap((file) => hostLiteralLines(readFileSync(file, "utf8")).map((line) => `${file}: ${line.trim()}`));
  assert.deepEqual(offenders, []);
});

function setProjectDirEnv(value) {
  if (value === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = value;
}

function withProjectDirEnv(value, fn) {
  const saved = process.env.CLAUDE_PROJECT_DIR;
  setProjectDirEnv(value);
  try {
    return fn();
  } finally {
    setProjectDirEnv(saved);
  }
}

const withoutProjectDirEnv = (fn) => withProjectDirEnv(undefined, fn);

function hasMarkedAncestor(dir) {
  for (let d = dir; ; d = dirname(d)) {
    if ([paths.TETHER_DIR, paths.HOST_DIR].some((m) => existsSync(join(d, m)))) return true;
    if (dirname(d) === d) return false;
  }
}

function markerFreeBase() {
  for (const base of [tmpdir(), parse(tmpdir()).root]) {
    if (hasMarkedAncestor(base)) continue;
    try {
      return mkdtempSync(join(base, "harness-paths-"));
    } catch {}
  }
  return null;
}

test("projectRoot honours CLAUDE_PROJECT_DIR first (T-1.3)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-paths-"));
  try {
    assert.equal(withProjectDirEnv(root, () => projectRoot(tmpdir())), resolve(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const marker of [paths.TETHER_DIR, paths.HOST_DIR]) {
  test(`projectRoot returns the nearest ancestor holding ${marker} (T-1.3)`, () => {
    const root = mkdtempSync(join(tmpdir(), "harness-paths-"));
    try {
      mkdirSync(join(root, marker));
      const deep = join(root, "a", "b");
      mkdirSync(deep, { recursive: true });
      assert.equal(withoutProjectDirEnv(() => projectRoot(deep)), root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("projectRoot returns the start folder when no ancestor is marked (T-1.3)", (t) => {
  const base = markerFreeBase();
  if (!base) return t.skip("every writable temporary folder sits under a marked ancestor");
  try {
    const start = join(base, "x");
    mkdirSync(start);
    assert.equal(withoutProjectDirEnv(() => projectRoot(start)), start);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("paths exports locations only", () => {
  assert.deepEqual(Object.keys(paths).sort(), [
    "BOOKKEEPING_PREFIXES",
    "HOST_DIR",
    "STATE_FILES",
    "TETHER_DIR",
    "WORK_DIR",
    "branchingManifestPath",
    "configPath",
    "configRel",
    "hostPath",
    "hostRel",
    "projectRoot",
    "repoRelative",
    "stateDir",
    "statePath",
    "stateRel",
    "workRoot",
  ]);
});

test("relative locations read as POSIX paths and absolute ones sit under the root", () => {
  const root = resolve("some-root");
  assert.equal(paths.stateRel("ledger.jsonl"), ".claude/ledger/ledger.jsonl");
  assert.equal(paths.statePath(root, paths.STATE_FILES.ledger), join(root, ".claude", "ledger", "ledger.jsonl"));
  assert.equal(paths.configRel(), ".claude/harness.json");
  assert.equal(paths.configPath(root), join(root, ".claude", "harness.json"));
  assert.equal(paths.branchingManifestPath(root), join(root, ".claude", "branching", "manifest.yaml"));
  assert.equal(paths.hostRel("MEMORY.md"), ".claude/MEMORY.md");
  assert.equal(paths.hostPath(root, "MEMORY.md"), join(root, ".claude", "MEMORY.md"));
  assert.equal(paths.workRoot(root), join(root, "work"));
  assert.deepEqual([...paths.BOOKKEEPING_PREFIXES], ["work/", ".claude/", ".tether/"]);
});

test("repoRelative expresses a path from the project root and flags the outside", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-paths-"));
  try {
    const inside = withProjectDirEnv(root, () => paths.repoRelative({ cwd: join(root, "src") }, "a.ts"));
    assert.deepEqual([inside.rel, inside.outside], ["src/a.ts", false]);
    const beside = withProjectDirEnv(root, () => paths.repoRelative({ cwd: root }, join(dirname(root), "elsewhere.ts")));
    assert.equal(beside.outside, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
