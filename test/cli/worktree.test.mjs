import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readLayout } from "../../dist/lib/shared/repos.mjs";
import { runCli } from "#test/cli.mts";
import { gitIn, gitOut, umbrella } from "#test/git.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const FILE_PROTOCOL = { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "protocol.file.allow", GIT_CONFIG_VALUE_0: "always" };

const DESIGN = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [src/Orders/pricing.cs]",
  "---",
  "# Design",
  "",
  "## Phase 1: Pricing",
  "",
  "**Touch set:**",
  "- `src/Orders/pricing.cs`: why",
  "",
].join("\n");

function ordersItem(t) {
  const { root, repos } = umbrella(t, { repos: ["Orders", "Billing"] });
  const { id } = openItem(root, { lane: "design", title: "Orders pricing" });
  writeArtifact(root, id, "design.md", DESIGN);
  return { root, id, orders: repos.Orders };
}

function worktree(root, id, ...args) {
  return runCli(root, ["worktree", id, ...args, "--root", root], { env: { ...process.env, ...FILE_PROTOCOL, CLAUDE_PROJECT_DIR: root } });
}

function created(root, id, ...args) {
  const r = worktree(root, id, ...args);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return r;
}

function recordedBase(root, id) {
  return readFileSync(join(root, "work", id, "repos.yaml"), "utf8").match(/path: src\/Orders\n\s+base: (\w+)/)?.[1];
}

test("record then the bare form creates the worktree of only the touched repo, and a second call resumes it (T-2.1, T-2.2, T-2.5)", (t) => {
  const { root, id, orders } = ordersItem(t);
  created(root, id, "--record", "RMS-12");
  const first = created(root, id, "--human");
  assert.match(first.stdout, /^src\/Orders -> src\/Orders\/\.worktrees\/RMS-12 · created · base [0-9a-f]{8}$/m);
  assert.equal(gitOut(join(root, WORKTREE), "rev-parse", "--abbrev-ref", "HEAD"), "RMS-12");
  assert.equal(existsSync(join(root, "src", "Billing", ".worktrees")), false);
  assert.equal(gitOut(orders, "status", "--porcelain"), "");

  const second = created(root, id);
  assert.deepEqual(second.json.repos.map((r) => [r.repo, r.state, r.worktree]), [["src/Orders", "resumed", WORKTREE]]);
  assert.equal(recordedBase(root, id), gitOut(join(root, WORKTREE), "rev-parse", "HEAD"));
});

test("a local branch checked out nowhere becomes the worktree's branch, and its tip the recorded base (T-2.3)", (t) => {
  const { root, id, orders } = ordersItem(t);
  gitIn(orders, "switch", "-q", "-c", "RMS-12");
  gitIn(orders, "commit", "-q", "--allow-empty", "-m", "earlier work");
  const tip = gitOut(orders, "rev-parse", "HEAD");
  gitIn(orders, "switch", "-q", "main");
  created(root, id, "--record", "RMS-12");
  const r = created(root, id);
  assert.equal(r.json.repos[0].state, "created");
  assert.equal(gitOut(join(root, WORKTREE), "rev-parse", "HEAD"), tip);
  assert.equal(recordedBase(root, id), tip);
});

test("an uninitialised submodule is hydrated, and one ahead of its recorded commit is reported and kept (T-2.4)", (t) => {
  const { root, id, orders } = ordersItem(t);
  const lib = withProject(t, { picket: false });
  gitIn(lib, "init", "-q", "-b", "main");
  gitIn(lib, "commit", "-q", "--allow-empty", "-m", "lib");
  gitIn(orders, "-c", "protocol.file.allow=always", "submodule", "add", "-q", lib, "libs/lib");
  gitIn(orders, "commit", "-q", "-m", "add lib");
  created(root, id, "--record", "RMS-12");
  assert.deepEqual(created(root, id).json.repos[0].hydrated, ["libs/lib"]);

  const sub = join(root, WORKTREE, "libs", "lib");
  gitIn(sub, "commit", "-q", "--allow-empty", "-m", "ahead");
  const ahead = gitOut(sub, "rev-parse", "HEAD");
  const again = created(root, id).json.repos[0];
  assert.deepEqual([again.hydrated, again.reported], [[], ["libs/lib"]]);
  assert.equal(gitOut(sub, "rev-parse", "HEAD"), ahead);
});

test("a repo the plan gains after --record starts from its default branch and records its from and base (T-2.8)", (t) => {
  const { root, id } = ordersItem(t);
  created(root, id, "--record", "RMS-12");
  created(root, id);
  writeArtifact(root, id, "design.md", DESIGN.replace("files: [src/Orders/pricing.cs]", "files: [src/Orders/pricing.cs, src/Billing/pricing.cs]"));
  const r = created(root, id);
  const billingWorktree = join(root, "src", "Billing", ".worktrees", "RMS-12");
  assert.deepEqual(r.json.repos.map((repo) => [repo.repo, repo.state]), [["src/Billing", "created"], ["src/Orders", "resumed"]]);
  const billing = readLayout(root, id).repos.find((repo) => repo.path === "src/Billing");
  assert.deepEqual(billing, { path: "src/Billing", base: gitOut(billingWorktree, "rev-parse", "HEAD"), from: "main", worktree: "src/Billing/.worktrees/RMS-12" });
});

test("the bare form refuses with no branch recorded and creates nothing after --none (T-2.6)", (t) => {
  const { root, id } = ordersItem(t);
  const refused = worktree(root, id);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stdout + refused.stderr, /create_worktrees/);
  created(root, id, "--none");
  assert.match(created(root, id, "--human").stdout, /works in the main checkouts/);
  assert.equal(existsSync(join(root, "src", "Orders", ".worktrees")), false);
});
