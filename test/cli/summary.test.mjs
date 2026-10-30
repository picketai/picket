import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { readBases } from "../../dist/lib/shared/repos.mjs";
import { runCli } from "#test/cli.mts";
import { gitIn, gitOut, gitRepo, umbrella, writeIn } from "#test/git.mts";
import { openItem, writeArtifact, writeConfig } from "#test/project.mts";

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const PLAN = "---\nlane: design\nphases:\n  - n: 1\n    files: [src/Orders/pricing.cs]\n---\n# D\n\n## Phase 1: Pricing\n";

function cli(root, ...args) {
  const r = runCli(root, [...args, "--root", root]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r.json;
}

function worktreeItem(t, config = null) {
  const { root, repos } = umbrella(t, { repos: ["Orders"] });
  if (config) writeConfig(root, config);
  const { id } = openItem(root, { lane: "design", title: "Orders pricing" });
  writeArtifact(root, id, "design.md", PLAN);
  cli(root, "worktree", id, "--record", "RMS-12");
  const created = cli(root, "worktree", id);
  return { root, id, orders: repos.Orders, base: created.repos[0].base };
}

test("picket open records each nested repo's HEAD in repos.yaml (T-3.4)", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "README.md": "umbrella\n" }, message: "root" });
  const orders = join(root, "src", "Orders");
  mkdirSync(orders, { recursive: true });
  gitIn(orders, "init", "-q", "-b", "main");
  writeIn(orders, "pricing.cs", "class Pricing {}\n");
  gitIn(orders, "add", "-A");
  gitIn(orders, "commit", "-q", "-m", "orders");
  const r = runCli(root, ["open", "--lane", "order", "--title", "x", "--root", root]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readBases(root, r.json.id), { "src/Orders": gitOut(orders, "rev-parse", "HEAD") });
});

test("the summary lists a worktree change by its physical path and names the worktree and its base (T-4.1)", (t) => {
  const { root, id, base } = worktreeItem(t);
  writeIn(root, `${WORKTREE}/pricing.cs`, "class Pricing { int Rate; }\n");
  const summary = cli(root, "summary", id);
  assert.deepEqual(summary.changed_files, [`${WORKTREE}/pricing.cs`]);
  assert.equal(summary.repos.length, 1);
  assert.match(summary.repos[0].worktree, /\/src\/Orders\/\.worktrees\/RMS-12$/);
  assert.equal(summary.repos[0].base, base);
});

test("a change in the main checkout is not listed while the worktree is recorded (T-4.2)", (t) => {
  const { root, id, orders } = worktreeItem(t);
  writeIn(orders, "pricing.cs", "class Pricing { int Main; }\n");
  writeIn(orders, "other.cs", "class Other {}\n");
  assert.deepEqual(cli(root, "summary", id).changed_files, []);
});

test("security paths are matched on the plan shape of a worktree change (T-4.3)", (t) => {
  const { root, id } = worktreeItem(t, { version: 1, security_paths: ["src/Orders/pricing/**"] });
  writeIn(root, `${WORKTREE}/pricing/rates.cs`, "class Rates {}\n");
  const summary = cli(root, "summary", id);
  assert.deepEqual(summary.changed_files, [`${WORKTREE}/pricing/rates.cs`]);
  assert.equal(summary.security_path, true);
});
