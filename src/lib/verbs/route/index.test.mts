import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import fs, { chmodSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, join } from "node:path";
import { route as routeAt, verb, type RouteInput } from "./index.mts";
import { findVerdict } from "../../shared/verdicts.mjs";
import { bareAgentName } from "../../shared/agent-name.mts";
import { statePath, STATE_FILES } from "../../shared/paths.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { readSnapshot, stateView } from "../../shared/work/snapshot.mts";
import { saveBlock } from "../../shared/work/block.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { fixedContext } from "#test/context.mts";
import { gitAt } from "#test/git.mts";
import { openItem, withProject } from "#test/project.mts";

type Routed = Partial<RouteInput> & { id: WorkId; verdict: string; agent: string; root: string; classes?: string[] };

function route({ root, ...input }: Routed) {
  return routeAt(input as RouteInput, fixedContext(root, { env: process.env, now: new Date(), cwd: process.cwd() }));
}

const deriveState = (id: WorkId, root: string) => stateView(readSnapshot(root, id));

function hostRoot(t: TestContext): string {
  return withProject(t, { host: true, picket: false });
}

function setup(t: TestContext) {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "order", title: "Csv" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n\n## Phase 3: C\n\nt\n");
  return { root, id: s.id };
}

const PHASED_ORDER = "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.js, src/old.js]\n  - n: 2\n    files: [src/b.js]\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n";

function repoWithPhasedOrder(t: TestContext) {
  const root = hostRoot(t);
  const git = gitAt(root);
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "old.js"), "old\n");
  const s = openItem(root, { lane: "order", title: "Scoped" });
  writeFileSync(join(root, "work", s.id, "order.md"), PHASED_ORDER);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id: s.id, git };
}

function stage(root: string, git: (...a: string[]) => string, files: Record<string, string>) {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  git("add", "-A", "--", ...Object.keys(files));
}

const lines = (text: string) => text.split("\n").filter(Boolean).sort();

function acceptRows(root: string) {
  const path = statePath(root, STATE_FILES.ledger);
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "accept") : [];
}

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("route needs a verdict and an agent and reads its numbers as whole numbers (T-5.4)", () => {
  const input = parse([ID, "--verdict", "approved", "--agent", "user", "--phase", "2", "--through", "4"]);
  assert.deepEqual(input, { id: ID, verdict: "approved", agent: "user", phase: 2, scope: undefined, through: 4, reason: undefined, session: undefined });
  assert.throws(() => parse([ID, "--verdict", "approved", "--agent", "user", "--phase", "x"]), UsageError);
  assert.throws(() => parse([ID, "--verdict", "approved"]), (err) => err instanceof UsageError && err.message.includes("--agent"));
});

test("an approval that commits appends one accept row naming the phase commit and its product lines (T-3.2)", (t) => {
  const { root, id } = setup(t);
  const git = gitAt(root);
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
});

test("a ledger write that fails after the phase commit leaves the commit line as the last applied entry", (t) => {
  const { root, id } = setup(t);
  const git = gitAt(root);
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
});

test("an approval outside a git repository commits nothing and appends no accept row (T-3.3)", (t) => {
  const { root, id } = setup(t);
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
  assert.ok(r.applied.includes("nothing staged to commit"), r.applied.join("; "));
  assert.deepEqual(acceptRows(root), []);
});

test("an approval commits the phase's files and work item, and leaves a foreign staged path staged (T-1.1)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
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
});

test("a staged path the block lists outside the plan rides along and is named; a staged deletion of a listed file lands (T-1.3)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
  stage(root, git, { "test/b.test.js": "t\n" });
  git("rm", "-q", "--", "src/old.js");
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  saveBlock(root, id, 1, "## Phase 1 of x: A\n\nDone.\n\nFiles: src/old.js (+1 more: test/b.test.js)\n\nPHASE DONE");
  const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
  const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
  assert.ok(committed.includes("test/b.test.js") && committed.includes("src/old.js"), committed.join(", "));
  assert.throws(() => git("cat-file", "-e", "HEAD:src/old.js"));
  assert.ok(r.applied.includes("committed outside phase 1's files: test/b.test.js"), r.applied.join(" | "));
  assert.equal(git("diff", "--cached", "--name-only"), "");
});

test("a staged file only the block's full Files: line names is committed with the phase (T-1.2)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
  const extra = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`docs/n${i}.md`, `${i}\n`]));
  stage(root, git, { "src/a.js": "a\n", ...extra });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  saveBlock(root, id, 1, `## Phase 1 of x: A\n\nDone.\n\nFiles: src/a.js, ${Object.keys(extra).join(", ")}\n\nPHASE DONE`);
  route({ id, verdict: "approved", agent: "user", phase: 1, root });
  const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
  for (const path of ["src/a.js", ...Object.keys(extra)]) assert.ok(committed.includes(path), path);
  assert.equal(git("diff", "--cached", "--name-only"), "");
});

test("a staged dot-file the block lists is committed with the phase (B11, T-3.3)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
  stage(root, git, { "src/a.js": "a\n", ".gitattributes": "* text=auto\n" });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  saveBlock(root, id, 1, "## Phase 1 of x: A\n\nDone.\n\nFiles: src/a.js, .gitattributes\n\nPHASE DONE");
  route({ id, verdict: "approved", agent: "user", phase: 1, root });
  const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
  assert.ok(committed.includes(".gitattributes"), committed.join(", "));
  assert.equal(git("diff", "--cached", "--name-only"), "");
});

test("a staged test path neither the plan nor the block lists stays staged, as another session's file", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
  stage(root, git, { "src/a.js": "a\n", "test/foreign.test.js": "t\n" });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  saveBlock(root, id, 1, "## Phase 1 of x: A\n\nDone.\n\nFiles: src/a.js\n\nPHASE DONE");
  const r = route({ id, verdict: "approved", agent: "user", phase: 1, root });
  const committed = lines(git("show", "--name-only", "--format=", "HEAD"));
  assert.ok(committed.includes("src/a.js") && !committed.includes("test/foreign.test.js"), committed.join(", "));
  assert.equal(git("diff", "--cached", "--name-only"), "test/foreign.test.js");
  assert.ok(r.applied.includes("left staged, not phase 1's: test/foreign.test.js"), r.applied.join(" | "));
});

test("a run-grant approval on PHASE DONE commits through the same phase predicate (T-1.4)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
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
});

test("a refused phase commit keeps HEAD, keeps every staged path staged and leaves no temporary index (T-1.6)", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
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
});

test("a verdict routed by another session claims the item; the same session leaves state.yaml alone (T-2.4)", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "order", title: "Claim", session: "s1" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  const stateFile = join(root, "work", s.id, "state.yaml");
  route({ id: s.id, verdict: "PHASE DONE", agent: "developer", phase: 1, session: "s2", root });
  assert.match(readFileSync(stateFile, "utf8"), /^session: s2$/m);
  const before = readFileSync(stateFile, "utf8");
  route({ id: s.id, verdict: "ALIGNED", agent: "reviewer", scope: "crosscheck", session: "s2", root });
  assert.equal(readFileSync(stateFile, "utf8"), before);
});

test("findVerdict matches exact tokens at line start only", () => {
  assert.equal(findVerdict("summary\nAPPROVED\nmore"), "APPROVED");
  assert.equal(findVerdict("CHANGES   REQUIRED because"), "CHANGES REQUIRED");
  assert.equal(findVerdict("the reviewer said it was approved-ish"), null);
  assert.equal(findVerdict("LGTM"), null);
});

test("developer done, user approved with a run grant, reviewer cumulative, close", (t) => {
  const { root, id } = setup(t);
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
});

test("a run grant never crosses a security path or an irreversible step; that phase takes its own gate", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "design", title: "Auth" });
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
});

test("a run grant stops at a phase the record marks security-sensitive", (t) => {
  const root = hostRoot(t);
  const s = openItem(root, { lane: "design", title: "Tidy" });
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
});

test("wrong owner is refused, rejection clears the run grant, drift blocks", (t) => {
  const { root, id } = setup(t);
  assert.throws(() => route({ id, verdict: "APPROVED", agent: "developer", root }), /may only come from reviewer/);
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 2, root });
  assert.equal(deriveState(id, root).run_through, undefined);
  const r = route({ id, verdict: "DRIFT DETECTED", agent: "reviewer", scope: "crosscheck", root });
  assert.equal(r.next.action, "resolve_block");
  assert.equal(deriveState(id, root).status, "blocked");
});

test("classes are stored on a CHANGES REQUIRED entry only (T-9.3)", (t) => {
  const { root, id } = setup(t);
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 1, classes: ["Ts4", "Cm1"], root });
  route({ id, verdict: "CHANGES REQUIRED", agent: "reviewer", phase: 1, classes: [], root });
  route({ id, verdict: "APPROVED", agent: "reviewer", phase: 1, classes: ["Ts4"], root });
  const entries = readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(entries.map((e) => e.classes ?? null), [["Ts4", "Cm1"], null, null]);
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

test("route accepts APPROVED from a continued cumulative reviewer known by its instance name", (t) => {
  const { root, id } = setup(t);
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, root });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 2, root });
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 3, root });
  const r = route({ id, verdict: "APPROVED", agent: "cumulative-reviewer-4", scope: "cumulative", root });
  assert.equal(r.next.action, "close");
});

test("a picket:developer may route PHASE DONE and is recorded as developer", (t) => {
  const { root, id } = setup(t);
  route({ id, verdict: "PHASE DONE", agent: "picket:developer", phase: 1, root });
  assert.equal(existsSync(join(root, "work", id, "phases", "1.done")), true);
  assert.equal(readSnapshot(root, id).verdicts.at(-1)?.agent, "developer");
});

test("another plugin's developer may not route PHASE DONE", (t) => {
  const { root, id } = setup(t);
  assert.throws(() => route({ id, verdict: "PHASE DONE", agent: "other:developer", phase: 1, root }), /not other:developer/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.done")), false);
});

test("approved trusts the done marker on disk for a phase the record has no heading for", (t) => {
  const { root, id } = setup(t);
  writeFileSync(join(root, "work", id, "phases", "5.done"), "2026-10-23T10:00:00.000Z\n");
  const r = route({ id, verdict: "approved", agent: "user", phase: 5, root });
  assert.equal(r.applied[0], "phases/5.approved");
  assert.equal(existsSync(join(root, "work", id, "phases", "5.approved")), true);
});

function countingCalls<T>(name: "readFileSync" | "writeFileSync", run: () => T): { result: T; counts: Record<string, number> } {
  const mutable = fs as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = mutable[name];
  const counts: Record<string, number> = {};
  mutable[name] = function (this: unknown, path: unknown, ...rest: unknown[]) {
    const file = basename(String(path));
    counts[file] = (counts[file] ?? 0) + 1;
    return original.call(this, path, ...rest);
  };
  syncBuiltinESMExports();
  try {
    return { result: run(), counts };
  } finally {
    mutable[name] = original;
    syncBuiltinESMExports();
  }
}

test("one PHASE DONE under a run grant reads state.yaml and order.md at most twice each", (t) => {
  const { root, id, git } = repoWithPhasedOrder(t);
  writeState(root, { ...readState(root, id), run_through: 2 }, new Date());
  stage(root, git, { "src/a.js": "a\n" });
  const { result, counts } = countingCalls("readFileSync", () => route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root }));
  assert.ok(counts["state.yaml"] >= 1 && counts["state.yaml"] <= 2, `state.yaml read ${counts["state.yaml"]} times`);
  assert.ok(counts["order.md"] >= 1 && counts["order.md"] <= 2, `order.md read ${counts["order.md"]} times`);
  assert.deepEqual(result.applied.slice(0, 2), ["phases/1.done", "phases/1.approved (run grant through 2)"]);
  assert.ok(result.applied[2].startsWith("committed "), result.applied.join(" | "));
});

test("an approval that grants a run and claims a new session writes state.yaml once", (t) => {
  const { root, id } = setup(t);
  route({ id, verdict: "PHASE DONE", agent: "developer", phase: 1, root });
  const { result, counts } = countingCalls("writeFileSync", () => route({ id, verdict: "approved", agent: "user", phase: 1, through: 3, session: "s-new", root }));
  assert.equal(counts["state.yaml"], 1);
  assert.deepEqual(result.applied.slice(0, 2), ["phases/1.approved", "run_through=3"]);
  assert.deepEqual([readState(root, id).run_through, readState(root, id).session], [3, "s-new"]);
});
