import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fixedDateGit, listFiles } from "../lib/fixture.mjs";
import { loadTasks } from "../lib/tasks.mjs";
import { seedTesterTask } from "../lib/tester-seed.mjs";
import { readSnapshot } from "../../dist/lib/shared/work/snapshot.mjs";
import { nextStep } from "../../dist/lib/shared/work/next-step.mjs";

const SEEDS = resolve("bench", "seeds");
const COMPOSE = resolve("bench", "fixture", ".picket", "env", "compose.yaml");

function seededRepo(t, task) {
  const repo = mkdtempSync(join(tmpdir(), "bench-seed-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  mkdirSync(join(repo, ".picket", "env"), { recursive: true });
  cpSync(COMPOSE, join(repo, ".picket", "env", "compose.yaml"));
  const git = fixedDateGit(repo, "2026-01-01T00:00:00Z");
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
  const base = git("rev-parse", "HEAD");
  const sha = seedTesterTask({ repo, task, seedDir: join(SEEDS, task.id), base });
  return { repo, base, sha };
}

for (const task of loadTasks("kind:tester")) {
  test(`${task.id}: the seeded item is at the test stage with the fixture as base (T-1.3)`, (t) => {
    const { repo, base, sha } = seededRepo(t, task);
    const snap = readSnapshot(repo, task.item);
    assert.equal(nextStep(snap, []).action, "test_item");
    assert.equal(snap.state.base, base);
    assert.notEqual(sha, base);
  });

  test(`${task.id}: every implementation file is in the files of a seeded phase (T-1.4)`, (t) => {
    const { repo } = seededRepo(t, task);
    const planned = new Set(readSnapshot(repo, task.item).phases.flatMap((phase) => phase.entry?.files ?? []));
    const implemented = listFiles(join(SEEDS, task.id, "repo"));
    assert.ok(implemented.length > 0);
    assert.deepEqual(implemented.filter((file) => !planned.has(file)), []);
  });
}
