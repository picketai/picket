import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
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
