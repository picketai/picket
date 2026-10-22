import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork, deriveState } from "../../dist/lib/work.mjs";
import { route, findVerdict } from "../../dist/lib/route.mjs";
import { saveBlock } from "../../dist/lib/packet.mjs";
import { bareAgentName } from "../../dist/lib/agent-name.mjs";
import { statePath, STATE_FILES } from "../../dist/lib/paths.mjs";

function setup() {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  mkdirSync(join(root, ".claude"));
  const s = createWork({ lane: "order", title: "Csv", root });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n\n## Phase 3: C\n\nt\n");
  return { root, id: s.id };
}

const PHASED_ORDER = "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.js, src/old.js]\n  - n: 2\n    files: [src/b.js]\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n";

function repoWithPhasedOrder() {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  mkdirSync(join(root, ".claude"));
  const git = (...a) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { encoding: "utf8" }).trim();
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "old.js"), "old\n");
  const s = createWork({ lane: "order", title: "Scoped", root });
  writeFileSync(join(root, "work", s.id, "order.md"), PHASED_ORDER);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id: s.id, git };
}

function stage(root, git, files) {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  git("add", "-A", "--", ...Object.keys(files));
}

const lines = (text) => text.split("\n").filter(Boolean).sort();

function acceptRows(root) {
  const path = statePath(root, STATE_FILES.ledger);
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "accept") : [];
}

test("an approval that commits appends one accept row naming the phase commit and its product lines (T-3.2)", () => {
  const { root, id } = setup();
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), Array.from({ length: 12 }, (_, i) => `export const a${i} = ${i};\n`).join(""));
    git("add", "--", "src/a.ts");
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const rows = acceptRows(root);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].commit, git("log", "-1", "--format=%h", "--", `work/${id}/phases/1.approved`));
    assert.deepEqual([rows[0].work_id, rows[0].phase, rows[0].lines_added, rows[0].session, rows[0].agent], [id, 1, 12, null, null]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a ledger write that fails after the phase commit leaves the commit line as the last applied entry", () => {
  const { root, id } = setup();
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    mkdirSync(statePath(root, STATE_FILES.ledger), { recursive: true });
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n");
    git("add", "--", "src/a.ts");
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const committed = r.applied.findIndex((line) => line.startsWith("committed "));
    assert.ok(committed >= 0, r.applied.join("; "));
    assert.ok(r.applied.slice(committed + 1).every((line) => !/EISDIR|EPERM|EACCES/.test(line)), r.applied.join("; "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an approval outside a git repository commits nothing and appends no accept row (T-3.3)", () => {
  const { root, id } = setup();
  try {
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    assert.ok(r.applied.includes("nothing staged to commit"), r.applied.join("; "));
    assert.deepEqual(acceptRows(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an approval commits the phase's files and work item, and leaves a foreign staged path staged (T-1.1)", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    writeFileSync(join(root, "README.md"), "foreign\n");
    stage(root, git, { "src/a.js": "a\n", "README.md": "foreign\n" });
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
    assert.ok(committed.includes("src/a.js"), committed.join(", "));
    assert.ok(committed.includes(`work/${id}/phases/1.approved`), committed.join(", "));
    assert.ok(!committed.includes("README.md"), committed.join(", "));
    assert.equal(git("diff", "--cached", "--name-only"), "README.md");
    assert.ok(r.applied.includes("left staged, not phase 1's: README.md"), r.applied.join(" | "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a staged path the block lists outside the plan rides along and is named; a staged deletion of a listed file lands (T-1.3)", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    stage(root, git, { "test/b.test.js": "t\n" });
    git("rm", "-q", "--", "src/old.js");
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    saveBlock(id, 1, "## Phase 1 of x: A\n\nDone.\n\nFiles: src/old.js (+1 more: test/b.test.js)\n\nPHASE DONE", root);
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
    assert.ok(committed.includes("test/b.test.js") && committed.includes("src/old.js"), committed.join(", "));
    assert.throws(() => git("cat-file", "-e", "HEAD:src/old.js"));
    assert.ok(r.applied.includes("committed outside phase 1's files: test/b.test.js"), r.applied.join(" | "));
    assert.equal(git("diff", "--cached", "--name-only"), "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a staged file only the block's full Files: line names is committed with the phase (T-1.2)", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    const extra = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`docs/n${i}.md`, `${i}\n`]));
    stage(root, git, { "src/a.js": "a\n", ...extra });
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    saveBlock(id, 1, `## Phase 1 of x: A\n\nDone.\n\nFiles: src/a.js, ${Object.keys(extra).join(", ")}\n\nPHASE DONE`, root);
    route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
    for (const path of ["src/a.js", ...Object.keys(extra)]) assert.ok(committed.includes(path), path);
    assert.equal(git("diff", "--cached", "--name-only"), "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a staged test path neither the plan nor the block lists stays staged, as another session's file", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    stage(root, git, { "src/a.js": "a\n", "test/foreign.test.js": "t\n" });
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    saveBlock(id, 1, "## Phase 1 of x: A\n\nDone.\n\nFiles: src/a.js\n\nPHASE DONE", root);
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
    assert.ok(committed.includes("src/a.js") && !committed.includes("test/foreign.test.js"), committed.join(", "));
    assert.equal(git("diff", "--cached", "--name-only"), "test/foreign.test.js");
    assert.ok(r.applied.includes("left staged, not phase 1's: test/foreign.test.js"), r.applied.join(" | "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a run-grant approval on PHASE DONE commits through the same phase predicate (T-1.4)", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    stage(root, git, { "src/a.js": "a\n" });
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    route({ id, verdict: "approved", agent: "user", phase: 1, through: 2, root });
    stage(root, git, { "src/b.js": "b\n", "src/a.js": "a2\n" });
    const r = route({ id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
    assert.ok(r.applied.some((a) => a.startsWith("committed ")), r.applied.join(" | "));
    const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
    assert.ok(committed.includes("src/b.js") && !committed.includes("src/a.js"), committed.join(", "));
    assert.equal(git("diff", "--cached", "--name-only"), "src/a.js");
    assert.ok(r.applied.includes("left staged, not phase 2's: src/a.js"), r.applied.join(" | "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a refused phase commit keeps HEAD, keeps every staged path staged and leaves no temporary index (T-1.6)", () => {
  const { root, id, git } = repoWithPhasedOrder();
  try {
    const hook = join(root, ".git", "hooks", "commit-msg");
    writeFileSync(hook, "#!/bin/sh\nexit 1\n");
    chmodSync(hook, 0o755);
    writeFileSync(join(root, "README.md"), "foreign\n");
    stage(root, git, { "src/a.js": "a\n", "README.md": "foreign\n" });
    const before = git("rev-parse", "HEAD");
    route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
    const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
    assert.ok(r.applied.some((a) => a.startsWith("git commit failed")), r.applied.join(" | "));
    assert.equal(git("rev-parse", "HEAD"), before);
    const staged = lines(git("diff", "--cached", "--name-only"));
    assert.ok(staged.includes("README.md") && staged.includes("src/a.js"), staged.join(", "));
    assert.equal(existsSync(join(root, ".git", "picket-commit.index")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a verdict routed by another session claims the item; the same session leaves state.yaml alone (T-2.4)", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  try {
    mkdirSync(join(root, ".claude"));
    const s = createWork({ lane: "order", title: "Claim", session: "s1", root });
    writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
    const stateFile = join(root, "work", s.id, "state.yaml");
    route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 1, session: "s2", root });
    assert.match(readFileSync(stateFile, "utf8"), /^session: s2$/m);
    const before = readFileSync(stateFile, "utf8");
    route({ id: s.id, verdict: "ALIGNED", agent: "reviewer", scope: "crosscheck", session: "s2", root });
    assert.equal(readFileSync(stateFile, "utf8"), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("findVerdict matches exact tokens at line start only", () => {
  assert.equal(findVerdict("summary\nAPPROVED\nmore"), "APPROVED");
  assert.equal(findVerdict("CHANGES   REQUIRED because"), "CHANGES REQUIRED");
  assert.equal(findVerdict("the reviewer said it was approved-ish"), null);
  assert.equal(findVerdict("LGTM"), null);
});

test("developer done, user approved with a run grant, reviewer cumulative, close", () => {
  const { root, id } = setup();
  let r = route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  assert.deepEqual([r.next.action, r.next.phase], ["approve_phase", 1]);

  assert.throws(() => route({ id, verdict: "approved", agent: "user", phase: 2, root }), /not done/);
  r = route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  assert.deepEqual([r.next.action, r.next.phase], ["implement_phase", 2]);
  assert.equal(deriveState(id, root).run_through, 3);

  // the grant covers phases 2 and 3: PHASE DONE approves them without another stop
  r = route({ id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  assert.ok(r.applied.some((a) => a.includes("2.approved (run grant")));
  assert.deepEqual([r.next.action, r.next.phase], ["implement_phase", 3]);
  r = route({ id, verdict: "PHASE DONE", agent: "developer", phase: 3, root });
  assert.equal(r.next.action, "review_cumulative");

  r = route({ id, verdict: "APPROVED", agent: "reviewer", scope: "cumulative", root });
  assert.equal(r.next.action, "close");
  assert.equal(deriveState(id, root).phases.every((p) => p.reviewed), true);
  rmSync(root, { recursive: true, force: true });
});

test("a run grant never crosses a security path or an irreversible step; that phase takes its own gate", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  mkdirSync(join(root, ".claude"));
  const s = createWork({ lane: "design", title: "Auth", root });
  writeFileSync(
    join(root, "work", s.id, "design.md"),
    "---\nlane: design\nphases:\n  - n: 1\n    files: [src/config.ts]\n  - n: 2\n    files: [src/auth/guard.ts]\n  - n: 3\n    files: [scripts/migrate.ts]\n---\n# D\n\n## Phase 1: Config\n\nt\n\n## Phase 2: Guard\n\nt\n\n## Phase 3: Migrate\n\n- **T-3.1** run the migration [IRREVERSIBLE]\n",
  );
  route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id: s.id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  let r = route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  assert.ok(r.applied.some((a) => a.includes("run grant stops here") && a.includes("security path")), r.applied.join(" | "));
  assert.deepEqual([r.next.action, r.next.phase], ["approve_phase", 2]);
  assert.equal(deriveState(s.id, root).run_through, undefined, "the grant is spent; the user re-grants if they want");
  route({ id: s.id, verdict: "approved", agent: "user", phase: 2, through: 3, root });
  r = route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 3, root });
  assert.ok(r.applied.some((a) => a.includes("irreversible")), r.applied.join(" | "));
  assert.deepEqual([r.next.action, r.next.phase], ["approve_phase", 3]);
  rmSync(root, { recursive: true, force: true });
});

test("a run grant stops at a phase the record marks security-sensitive", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  mkdirSync(join(root, ".claude"));
  const s = createWork({ lane: "design", title: "Tidy", root });
  writeFileSync(
    join(root, "work", s.id, "design.md"),
    "---\nlane: design\nphases:\n  - n: 1\n    files: [lib/a.mjs]\n    security: false\n  - n: 2\n    files: [lib/tidy.mjs]\n    security: true\n  - n: 3\n    files: [lib/c.mjs]\n    security: false\n---\n# D\n\n## Phase 1: A\n\nt\n\n## Phase 2: Tidy\n\nt\n\n## Phase 3: C\n\nt\n",
  );
  route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id: s.id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  const r = route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  assert.ok(r.applied.some((a) => a.includes("marked security-sensitive")), r.applied.join(" | "));
  assert.equal(existsSync(join(root, "work", s.id, "phases", "2.approved")), false);
  assert.equal(deriveState(s.id, root).run_through, undefined);
  assert.deepEqual([r.next.action, r.next.phase], ["approve_phase", 2]);
  rmSync(root, { recursive: true, force: true });
});

test("approval commits the staged phase with the developer's proposed message; rejection commits nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-route-"));
  mkdirSync(join(root, ".claude"));
  const git = (...a) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...a], { encoding: "utf8" }).trim();
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const s = createWork({ lane: "order", title: "Csv", root });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/csv.ts]\n---\n# O\n\n## Phase 1: Add csv\n\nt\n\n## Phase 2: Wire route\n\nt\n");
  git("add", "-A");
  git("commit", "-q", "-m", "order");

  // the developer stages phase 1 and proposes a message
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "csv.ts"), "export const csv = 1;\n");
  git("add", "-A", "--", "src/csv.ts");
  saveBlock(s.id, 1, `## Phase 1 of ${s.id}: Add csv\n\nCSV module in place.\n\nFiles: src/csv.ts\nTests: passed\nLint: passed\nVerified: no drivable surface: pure module\nDecisions: none\nCommit: feat(export): add the csv formatter\n\nPHASE DONE`, root);
  route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  assert.equal(git("log", "-1", "--format=%s"), "order", "PHASE DONE alone commits nothing");

  let r = route({ id: s.id, verdict: "rejected", agent: "user", phase: 1, reason: "rename it", root });
  assert.equal(git("log", "-1", "--format=%s"), "order", "rejection commits nothing");
  assert.equal(git("diff", "--cached", "--name-only"), "src/csv.ts", "the staged work stays for the fix");

  r = route({ id: s.id, verdict: "approved", agent: "user", phase: 1, root });
  assert.equal(git("log", "-1", "--format=%s"), "feat(export): add the csv formatter");
  assert.ok(r.applied.some((a) => a.startsWith("committed ")), r.applied.join(" | "));
  assert.equal(git("status", "--porcelain"), "", "tree clean after the approval: the work item's state rode along");
  assert.match(git("show", "--stat", "--format=", "HEAD"), /phases\/1\.approved/, "the phase commit carries the approval marker, so git log on that marker names the sha");
  assert.equal(git("log", "-1", "--format=%s", "--", `work/${s.id}/phases/1.approved`), "feat(export): add the csv formatter");

  // a phase with no saved block and no code staged still commits its state, under a plain message
  route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  r = route({ id: s.id, verdict: "approved", agent: "user", phase: 2, root });
  assert.ok(r.applied.some((a) => a.startsWith("committed ")), r.applied.join(" | "));
  assert.equal(git("log", "-1", "--format=%s"), `Wire route, phase 2 of ${s.id}`);
  assert.equal(git("status", "--porcelain"), "");
  rmSync(root, { recursive: true, force: true });
});

test("wrong owner is refused, rejection clears the run grant, drift blocks", () => {
  const { root, id } = setup();
  assert.throws(() => route({ id, verdict: "APPROVED", agent: "developer", root }), /may only come from reviewer/);
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 2, root });
  assert.equal(deriveState(id, root).run_through, undefined);
  const r = route({ id, verdict: "DRIFT DETECTED", agent: "reviewer", scope: "crosscheck", root });
  assert.equal(r.next.action, "resolve_block");
  assert.equal(deriveState(id, root).status, "blocked");
  rmSync(root, { recursive: true, force: true });
});

test("classes are stored on a CHANGES REQUIRED entry only (T-9.3)", () => {
  const { root, id } = setup();
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 1, classes: ["Ts4", "Cm1"], root });
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 1, classes: [], root });
  route({ id, verdict: "APPROVED", agent: "reviewer", phase: 1, classes: ["Ts4"], root });
  const entries = readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(entries.map((e) => e.classes ?? null), [["Ts4", "Cm1"], null, null]);
  rmSync(root, { recursive: true, force: true });
});

test("bareAgentName strips only the exact picket: prefix", () => {
  assert.equal(bareAgentName("picket:analyst"), "analyst");
  assert.equal(bareAgentName("analyst"), "analyst");
  assert.equal(bareAgentName("other:developer"), "other:developer");
  assert.equal(bareAgentName("picketx:developer"), "picketx:developer");
  assert.equal(bareAgentName(undefined), null);
  assert.equal(bareAgentName(""), null);
});

test("bareAgentName resolves a teammate instance name to the role it ends in", () => {
  assert.equal(bareAgentName("cumulative-reviewer-4"), "reviewer");
  assert.equal(bareAgentName("cumulative-reviewer"), "reviewer");
  assert.equal(bareAgentName("reviewer-2"), "reviewer");
  assert.equal(bareAgentName("picket:developer"), "developer");
  assert.equal(bareAgentName("general-purpose"), "general-purpose");
  assert.equal(bareAgentName("lead"), "lead");
  assert.equal(bareAgentName("reviewer-x"), "reviewer-x");
  assert.equal(bareAgentName("other:cumulative-reviewer"), "other:cumulative-reviewer");
});

test("route accepts APPROVED from a continued cumulative reviewer known by its instance name", () => {
  const { root, id } = setup();
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 3, root });
  const r = route({ id, verdict: "APPROVED", agent: "cumulative-reviewer-4", scope: "cumulative", root });
  assert.equal(r.next.action, "close");
  rmSync(root, { recursive: true, force: true });
});

test("a picket:developer may route PHASE DONE and is recorded as developer", () => {
  const { root, id } = setup();
  route({ id, verdict: "PHASE DONE", agent: "picket:developer", phase: 1, root });
  assert.equal(existsSync(join(root, "work", id, "phases", "1.done")), true);
  assert.equal(deriveState(id, root).verdicts.at(-1).agent, "developer");
  rmSync(root, { recursive: true, force: true });
});

test("another plugin's developer may not route PHASE DONE", () => {
  const { root, id } = setup();
  assert.throws(() => route({ id, verdict: "PHASE DONE", agent: "other:developer", phase: 1, root }), /not other:developer/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.done")), false);
  rmSync(root, { recursive: true, force: true });
});
