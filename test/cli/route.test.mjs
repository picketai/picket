import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { saveBlock } from "../../dist/lib/shared/work/block.mjs";
import { runCli } from "#test/cli.mts";
import { gitAt } from "#test/git.mts";
import { openItem, withProject } from "#test/project.mts";

const IDENTITY = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function route(root, id, ...args) {
  const r = runCli(root, ["route", id, ...args, "--root", root], { env: { ...process.env, ...IDENTITY, CLAUDE_PROJECT_DIR: root } });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

test("approval commits the staged phase with the developer's proposed message; rejection commits nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const git = gitAt(root);
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const s = openItem(root, { lane: "order", title: "Csv" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/csv.ts]\n---\n# O\n\n## Phase 1: Add csv\n\nt\n\n## Phase 2: Wire route\n\nt\n");
  git("add", "-A");
  git("commit", "-q", "-m", "order");

  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "csv.ts"), "export const csv = 1;\n");
  git("add", "-A", "--", "src/csv.ts");
  saveBlock(root, s.id, 1, `## Phase 1 of ${s.id}: Add csv\n\nCSV module in place.\n\nFiles: src/csv.ts\nTests: passed\nLint: passed\nVerified: no drivable surface: pure module\nDecisions: none\nCommit: feat(export): add the csv formatter\n\nPHASE DONE`);
  route(root, s.id, "--verdict", "PHASE DONE", "--agent", "developer", "--phase", "1");
  assert.equal(git("log", "-1", "--format=%s"), "order", "PHASE DONE alone commits nothing");

  let r = route(root, s.id, "--verdict", "rejected", "--agent", "user", "--phase", "1", "--reason", "rename it");
  assert.equal(git("log", "-1", "--format=%s"), "order", "rejection commits nothing");
  assert.equal(git("diff", "--cached", "--name-only"), "src/csv.ts", "the staged work stays for the fix");

  r = route(root, s.id, "--verdict", "approved", "--agent", "user", "--phase", "1");
  assert.equal(git("log", "-1", "--format=%s"), "feat(export): add the csv formatter");
  assert.ok(r.applied.some((a) => a.startsWith("committed ")), r.applied.join(" | "));
  assert.equal(git("status", "--porcelain"), "", "tree clean after the approval: the work item's state rode along");
  assert.match(git("show", "--stat", "--format=", "HEAD"), /phases\/1\.approved/, "the phase commit carries the approval marker, so git log on that marker names the sha");
  assert.equal(git("log", "-1", "--format=%s", "--", `work/${s.id}/phases/1.approved`), "feat(export): add the csv formatter");

  route(root, s.id, "--verdict", "PHASE DONE", "--agent", "developer", "--phase", "2");
  r = route(root, s.id, "--verdict", "approved", "--agent", "user", "--phase", "2");
  assert.ok(r.applied.some((a) => a.startsWith("committed ")), r.applied.join(" | "));
  assert.equal(git("log", "-1", "--format=%s"), `Wire route, phase 2 of ${s.id}`);
  assert.equal(git("status", "--porcelain"), "");
});

const REPORT = "---\nkind: report\nconfidence: high\n---\n# Report: Pricing rules\n";
const PUBLISHED = join("artifacts", "reports", "pricing-rules.md");

function researchItem(t) {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "research", title: "Pricing rules" });
  writeFileSync(join(root, "work", id, "research.md"), REPORT);
  return { root, id };
}

function routeOutcome(root, id, ...args) {
  return runCli(root, ["route", id, ...args, "--root", root]);
}

function verdictRows(root, id) {
  return readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("approved --publish copies a research item's report to its artifacts/reports path and records it (T-3.1)", (t) => {
  const { root, id } = researchItem(t);
  const r = route(root, id, "--verdict", "approved", "--agent", "user", "--publish");
  assert.deepEqual(r.applied, [`published work/${id}/research.md to artifacts/reports/pricing-rules.md`]);
  assert.equal(readFileSync(join(root, PUBLISHED), "utf8"), REPORT);
  assert.equal(verdictRows(root, id).at(-1).published, "artifacts/reports/pricing-rules.md");
});

test("publish refuses a target with other bytes and writes nothing; identical bytes pass (T-3.2)", (t) => {
  const { root, id } = researchItem(t);
  mkdirSync(join(root, "artifacts", "reports"), { recursive: true });
  writeFileSync(join(root, PUBLISHED), "# An older report\n");
  const refused = routeOutcome(root, id, "--verdict", "approved", "--agent", "user", "--publish");
  assert.equal(refused.status, 2, refused.stdout);
  assert.match(refused.json.error, /artifacts\/reports\/pricing-rules\.md already holds a different report/);
  assert.equal(readFileSync(join(root, PUBLISHED), "utf8"), "# An older report\n");
  assert.equal(existsSync(join(root, "work", id, "verdicts.jsonl")), false);

  writeFileSync(join(root, PUBLISHED), REPORT);
  const r = route(root, id, "--verdict", "approved", "--agent", "user", "--publish");
  assert.deepEqual(r.applied, ["already published to artifacts/reports/pricing-rules.md"]);
});

test("--publish is refused off a research item and with another verdict (T-3.3)", (t) => {
  const { root, id } = researchItem(t);
  const rejected = routeOutcome(root, id, "--verdict", "rejected", "--agent", "user", "--publish");
  assert.equal(rejected.status, 2, rejected.stdout);
  assert.match(rejected.json.error, /--publish goes with --verdict approved, not rejected/);

  const { id: order } = openItem(root, { lane: "order", title: "Csv" });
  const misplaced = routeOutcome(root, order, "--verdict", "approved", "--agent", "user", "--phase", "1", "--publish");
  assert.equal(misplaced.status, 2, misplaced.stdout);
  assert.match(misplaced.json.error, /--publish is for a research item; .* is in the order lane/);
});

test("approved without --publish on a research item records the verdict and writes no copy and no marker (T-3.3)", (t) => {
  const { root, id } = researchItem(t);
  const r = route(root, id, "--verdict", "approved", "--agent", "user");
  assert.deepEqual(r.applied, []);
  assert.equal(verdictRows(root, id).at(-1).verdict, "approved");
  assert.equal(existsSync(join(root, "artifacts")), false);
  assert.deepEqual(readdirSync(join(root, "work", id, "phases")), []);
});
