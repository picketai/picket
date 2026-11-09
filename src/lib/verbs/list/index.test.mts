import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "../../util/args.mts";
import { writeLayout } from "../../shared/repos.mts";
import type { ListRowView } from "../../shared/views.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { setMarker } from "../../shared/work/markers.mts";
import { verb } from "./index.mts";
import { FIXED_NOW, fixedContext } from "#test/context.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";

const SESSION = "43b73270-9af6-4c2f-be1b-deb7965a4c6c";

test("list takes no arguments", () => {
  assert.deepEqual(verb.parse(parseArgs([])), {});
});

test("the human render of a row stays byte for byte (T-1.5)", () => {
  const row: ListRowView = {
    id: "20261102-stop-sync-write",
    lane: "order",
    status: "open",
    title: "Stop sync write",
    phases: "1/3",
    next: "approve_phase",
    phase: 2,
    actor: "user",
    detail: "phase 2 of 3 is done and awaits your decision",
    phases_approved: 1,
    phase_count: 3,
    attention: "needs-you",
    sessions: [SESSION],
    session: SESSION,
    branch: null,
    worktrees: [],
  };
  assert.equal(verb.render([row]), "20261102-stop-sync-write  order    open      1/3   approve_phase    Stop sync write");
});

test("the human render of no rows says so (T-1.5)", () => {
  assert.equal(verb.render([]), "(no work items)");
});

function itemAtApproval(t: TestContext): { root: string; id: WorkId } {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Stop sync write", session: SESSION });
  writeArtifact(root, id, "order.md", "---\nlane: order\n---\n# O\n\n## Phase 1: Stop the write\n\nt\n");
  setMarker(root, id, 1, "done", new Date(FIXED_NOW));
  return { root, id };
}

async function listedRows(root: string): Promise<ListRowView[]> {
  const outcome = await verb.run({}, fixedContext(root));
  assert.equal(outcome.status, "done");
  return outcome.status === "done" ? outcome.value : [];
}

test("an item at approve_phase whose session is not live needs you, in its state's session, with no branch (T-1.4)", async (t) => {
  const { root, id } = itemAtApproval(t);
  const [row] = await listedRows(root);
  assert.deepEqual(row, {
    id,
    lane: "order",
    status: "open",
    title: "Stop sync write",
    phases: "0/1",
    next: "approve_phase",
    phase: 1,
    actor: "user",
    detail: "phase 1 of 1 is done and awaits your decision",
    phases_approved: 0,
    phase_count: 1,
    attention: "needs-you",
    sessions: [SESSION],
    session: SESSION,
    branch: null,
    worktrees: [],
  });
});

function attentionWithRegistryCwd(t: TestContext, cwdOf: (root: string) => string): Promise<ListRowView[]> {
  const root = withProject(t, { host: true, picket: false });
  const config = withProject(t, { picket: false });
  openItem(root, { lane: "order", title: "Stop sync write", session: SESSION });
  mkdirSync(join(config, "sessions"));
  writeFileSync(join(config, "sessions", "101.json"), JSON.stringify({ pid: 101, sessionId: SESSION, cwd: cwdOf(root) }));
  return verb.run({}, fixedContext(root, { env: { CLAUDE_CONFIG_DIR: config } })).then((outcome) => (outcome.status === "done" ? outcome.value : []));
}

test("an open item is working when its session runs in the root, by the registry under CLAUDE_CONFIG_DIR (T-2.3)", async (t) => {
  const [row] = await attentionWithRegistryCwd(t, (root) => root);
  assert.equal(row?.attention, "working");
});

test("an open item is open when its session runs in a subfolder of the root (T-2.3)", async (t) => {
  const [row] = await attentionWithRegistryCwd(t, (root) => join(root, "src"));
  assert.equal(row?.attention, "open");
});

test("a recorded worktree is present when its folder exists under the root, and absent when not (T-1.4)", async (t) => {
  const { root, id } = itemAtApproval(t);
  writeLayout(root, id, {
    worktrees: null,
    repos: [
      { path: "svc", base: null, worktree: "svc/.worktrees/feat" },
      { path: "api", base: null, worktree: "api/.worktrees/gone" },
      { path: "web", base: null },
    ],
  });
  mkdirSync(join(root, "svc", ".worktrees", "feat"), { recursive: true });
  const [row] = await listedRows(root);
  assert.deepEqual(row?.worktrees, [
    { repo: "svc", path: "svc/.worktrees/feat", present: true },
    { repo: "api", path: "api/.worktrees/gone", present: false },
  ]);
});
