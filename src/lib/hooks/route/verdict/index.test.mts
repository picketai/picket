import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reviewClasses, routeVerdict as verdictHandler } from "./index.mts";
import { statePath, stateRel } from "../../../shared/paths.mts";
import { workId } from "../../../shared/work/files.mts";
import { readState, writeState } from "../../../shared/work/state.mts";
import { route } from "../../../verbs/route/index.mts";
import { hookContext } from "#test/context.mts";
import { gitAt } from "#test/git.mts";
import { assistantText as assistant, looseHandler, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

const routeVerdict = looseHandler(verdictHandler);

test("routeVerdict on a pull request review keeps the block and names its state path (T-6.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const block = "## Review: pr-412 · pr\n\nApproved.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const tp = transcript(root, [user("scope: pr"), assistant(block)]);
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, hookContext(root));
  assert.ok(out.hookSpecificOutput.additionalContext.includes(stateRel("pr-412.review.md")));
  assert.equal(existsSync(statePath(root, "pr-412.review.md")), true);
  assert.equal(existsSync(join(root, "work", "pr-412", "reviews")), false);
  assert.equal(routeVerdict({ stop_hook_active: true }, hookContext(root)), null);
});

test("routeVerdict on a developer PHASE DONE stamps the item with the event's session (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Claimed", session: "s1" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  const block = `## Phase 1 of ${s.id}: A\n\nA works.\n\nFiles: a.mjs\nTests: passed\nLint: none detected\nVerified: no drivable surface: test\nDecisions: none\nComments: none\nCommit: feat: a\n\nPHASE DONE`;
  const tp = transcript(root, [user(`work: ${s.id}\nphase: 1`), assistant(block)]);
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, hookContext(root));
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(readFileSync(join(root, "work", s.id, "state.yaml"), "utf8"), /^session: s3$/m);
});

function designItem(root: string) {
  const s = openItem(root, { lane: "design", title: "Reviewed" });
  writeFileSync(join(root, "work", s.id, "design.md"), "---\nlane: design\n---\n# D\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  return s.id;
}

function reviewBlock(id: string, scope: string, body: string, verdict: string): string {
  return `Reading the diff first.\n## Review: ${id} · ${scope}\n\n${body}\n\nAlignment: PASS\nFindings: clean\n\n${verdict}`;
}

function routeReview(root: string, id: string, block: string, session = "s1") {
  const tp = transcript(root, [user(`work: ${id}`), assistant(block)]);
  return routeVerdict({ hook_event_name: "SubagentStop", session_id: session, transcript_path: tp, cwd: root, agent_type: "picket:reviewer" }, hookContext(root));
}

function verdictRows(root: string, id: string) {
  return readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("routeVerdict saves each reviewer block under reviews/, from its heading to its verdict", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const files = { crosscheck: "crosscheck.md", "phase 2": "phase-2.md", checkpoint: "checkpoint.md", cumulative: "cumulative.md" };
  for (const scope of Object.keys(files)) routeReview(root, id, reviewBlock(id, scope, `Scope ${scope}.`, scope === "crosscheck" ? "ALIGNED" : "APPROVED"));
  for (const [scope, file] of Object.entries(files)) {
    const saved = readFileSync(join(root, "work", id, "reviews", file), "utf8");
    assert.ok(saved.startsWith(`## Review: ${id} · ${scope}\n`), saved);
    assert.match(saved, scope === "crosscheck" ? /\nALIGNED\n$/ : /\nAPPROVED\n$/);
  }
  assert.equal(verdictRows(root, id).at(-1).session, "s1");
});

test("a second cumulative review replaces the first saved one", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  routeReview(root, id, reviewBlock(id, "cumulative", "First pass.", "CHANGES REQUIRED"));
  routeReview(root, id, reviewBlock(id, "cumulative", "Second pass.", "APPROVED"));
  assert.deepEqual(readdirSync(join(root, "work", id, "reviews")), ["cumulative.md"]);
  assert.match(readFileSync(join(root, "work", id, "reviews", "cumulative.md"), "utf8"), /Second pass\./);
});

test("an AMENDMENT NEEDED line lands on the row, and on a drift also as the blocked reason", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const line = "AMENDMENT NEEDED: D-002 the port moved";
  routeReview(root, id, reviewBlock(id, "cumulative", `Drifted.\n${line}`, "CHANGES REQUIRED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  routeReview(root, id, reviewBlock(id, "crosscheck", `Drifted.\n${line}`, "DRIFT DETECTED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  assert.match(readFileSync(join(root, "work", id, "state.yaml"), "utf8"), /^blocked_reason: .*D-002 the port moved/m);
});

test("a cross-check drift with only a Decisions: DRIFT line amends with that line", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const drift = "Decisions: DRIFT: D-002 the port moved";
  const out = routeReview(root, id, reviewBlock(id, "crosscheck", drift, "DRIFT DETECTED"));
  assert.equal(verdictRows(root, id).at(-1).amend, drift);
  assert.match(readFileSync(join(root, "work", id, "state.yaml"), "utf8"), /^blocked_reason: .*D-002 the port moved/m);
  assert.match(out.hookSpecificOutput.additionalContext, /Next: amend by architect/);
  routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: transcript(root, [user(`work: ${id}`), assistant(`## Amendment: ${id}\n\nD-002 revised.\n\nAMENDED`)]), cwd: root, agent_type: "picket:architect" }, hookContext(root));
  const needed = "AMENDMENT NEEDED: D-002 move the port back";
  routeReview(root, id, reviewBlock(id, "crosscheck", `${drift}\n${needed}`, "DRIFT DETECTED"));
  assert.equal(verdictRows(root, id).at(-1).amend, needed);
});

test("an architect AMENDED block quoting the amendment line carries no amend, so next leaves amend", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const line = "AMENDMENT NEEDED: D-002 x";
  routeReview(root, id, reviewBlock(id, "phase 1", `Drifted.\n${line}`, "CHANGES REQUIRED"));
  assert.equal(verdictRows(root, id).at(-1).amend, line);
  const amended = `## Amendment: ${id}\n\nD-002 revised.\n\nRevision: D-002 (r2) answers:\n${line}\n\nAMENDED`;
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: transcript(root, [user(`work: ${id}`), assistant(amended)]), cwd: root, agent_type: "picket:architect" }, hookContext(root));
  const row = verdictRows(root, id).at(-1);
  assert.equal(row.verdict, "AMENDED");
  assert.equal("amend" in row, false);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Next: amend\b/);
});

test("routeVerdict stores a reviewer's Classes on a CHANGES REQUIRED entry and nothing for none (T-9.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Classed" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n");
  const review = (classes: string, verdict: string) => `## Review: ${s.id} · cumulative\n\nOne gap.\n\nAlignment: PASS\nFindings: 0 critical, 2 major, 0 minor\n- [Major] a.mjs:1 — x. y. z.\n${classes}\n\n${verdict}`;
  const routeBlock = (block: string, session: string) => routeVerdict({ hook_event_name: "SubagentStop", session_id: session, transcript_path: transcript(root, [user(`work: ${s.id}\nscope: cumulative`), assistant(block)]), cwd: root, agent_type: "picket:reviewer" }, hookContext(root));
  routeBlock(review("Classes: Ts4, Cm1", "CHANGES REQUIRED"), "s1");
  routeBlock(review("Classes: none", "CHANGES REQUIRED"), "s2");
  routeBlock(review("", "CHANGES REQUIRED"), "s3");
  const entries = readFileSync(join(root, "work", s.id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(entries.map((e) => e.classes ?? null), [["Ts4", "Cm1"], null, null]);
  assert.deepEqual(reviewClasses("Classes: Ts4,Cm1 Ts4, and more"), ["Ts4", "Cm1"]);
});

function twoPhaseOrder(root: string): string {
  const s = openItem(root, { lane: "order", title: "Chained" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n");
  return s.id;
}

const GIT_IDENTITY = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function phaseBlock(id: string, n: number, commit: string): string {
  return `## Phase ${n} of ${id}: P\n\nP works.\n\nFiles: a.mjs\nTests: passed\nLint: none detected\nVerified: no drivable surface: test\nDecisions: none\nComments: none\nCommit: ${commit}\n\nPHASE DONE`;
}

function routeDeveloperTurn(root: string, id: string, n: number, continued: boolean, transcriptText: string, lastMessage?: string) {
  const tp = transcript(root, [user(`work: ${id}\nphase: ${n}`), assistant(transcriptText)]);
  const ctx = hookContext(root, { env: { ...process.env, ...GIT_IDENTITY } });
  const payload = lastMessage === undefined ? {} : { last_assistant_message: lastMessage };
  return routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "picket:developer", stop_hook_active: continued, ...payload }, ctx);
}

function routePhaseDone(root: string, id: string, n: number, continued: boolean, commit = "feat: p") {
  return routeDeveloperTurn(root, id, n, continued, phaseBlock(id, n, commit));
}

const BOUNCED_SUBJECT = "refactor(commit-message): one block check returns the message or the problem";
const VALID_SUBJECT = "refactor(commit-message): one block check returns message or problem";

test("a continued turn holding the bounced block and then the valid one routes and saves only the valid one (T-3.4)", (t) => {
  assert.deepEqual([BOUNCED_SUBJECT.length, VALID_SUBJECT.length], [76, 68]);
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  const turn = `Phase 1 is done.\n\n${phaseBlock(id, 1, BOUNCED_SUBJECT)}\n\n${phaseBlock(id, 1, VALID_SUBJECT)}`;
  routeDeveloperTurn(root, id, 1, true, turn);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1]]);
  const saved = readFileSync(blockPath(root, id), "utf8");
  assert.ok(saved.startsWith("## Phase 1 of"), saved);
  assert.match(saved, new RegExp(`^Commit: ${escaped(VALID_SUBJECT)}$`, "m"));
  assert.ok(!saved.includes(BOUNCED_SUBJECT), saved);
});

test("a continued turn whose transcript still ends at the bounced block saves the valid block from last_assistant_message (T-3.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routeDeveloperTurn(root, id, 1, true, phaseBlock(id, 1, BOUNCED_SUBJECT), phaseBlock(id, 1, VALID_SUBJECT));
  const saved = readFileSync(blockPath(root, id), "utf8");
  assert.match(saved, new RegExp(`^Commit: ${escaped(VALID_SUBJECT)}$`, "m"));
  assert.ok(!saved.includes(BOUNCED_SUBJECT), saved);
});

test("a first stop on the bounced block alone appends no verdict row (T-3.6)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  assert.equal(routeDeveloperTurn(root, id, 1, false, phaseBlock(id, 1, BOUNCED_SUBJECT)), null);
  assert.equal(existsSync(join(root, "work", id, "verdicts.jsonl")), false);
});

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function grantedRepoItem(t: TestContext) {
  const root = withProject(t, { host: true, picket: false });
  const git = gitAt(root);
  git("init", "-q");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  const id = twoPhaseOrder(root);
  writeState(root, { ...readState(root, workId(id)), run_through: 2 }, new Date());
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id, git };
}

const LONG_SUBJECT = `feat: ${"a".repeat(75)}`;
const blockPath = (root: string, id: string) => join(root, "work", id, "phases", "1.block.md");

test("a first PHASE DONE whose Commit: subject is too long is not routed, saved or allowed to spend the grant (T-3.6)", (t) => {
  const { root, id } = grantedRepoItem(t);
  assert.equal(LONG_SUBJECT.length, 81);
  assert.equal(routePhaseDone(root, id, 1, false, LONG_SUBJECT), null);
  assert.equal(existsSync(join(root, "work", id, "verdicts.jsonl")), false);
  assert.equal(existsSync(blockPath(root, id)), false);
  assert.equal(readState(root, workId(id)).run_through, 2);
});

test("the corrected block on the continued stop routes once, is saved, and the grant commits it (T-3.7)", (t) => {
  const { root, id, git } = grantedRepoItem(t);
  routePhaseDone(root, id, 1, false, LONG_SUBJECT);
  routePhaseDone(root, id, 1, true, "feat(pricing): rate field");
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1]]);
  assert.match(readFileSync(blockPath(root, id), "utf8"), /^Commit: feat\(pricing\): rate field$/m);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.approved")), true);
  assert.equal(git("log", "-1", "--format=%s"), "feat(pricing): rate field");
});

test("a continued stop routes a first PHASE DONE whose Commit: line is still bad (T-3.8)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, true, "Pricing, phase 1");
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1]]);
});

test("a continued turn routes a new phase's PHASE DONE", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  const out = routePhaseDone(root, id, 2, true);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.equal(existsSync(join(root, "work", id, "phases", "2.done")), true);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1], ["PHASE DONE", 2]]);
});

test("a continued turn that repeats the last row routes nothing", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  routePhaseDone(root, id, 2, false);
  assert.equal(routePhaseDone(root, id, 2, true), null);
  assert.equal(verdictRows(root, id).length, 2);
});

test("a block re-emitted after a bounce replaces the saved block and adds no second row (T-2.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, false, "feat: first try");
  assert.equal(routePhaseDone(root, id, 1, true, "feat(pricing): rate field"), null);
  assert.match(readFileSync(join(root, "work", id, "phases", "1.block.md"), "utf8"), /^Commit: feat\(pricing\): rate field$/m);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1]]);
});

function threePhaseOrder(root: string): string {
  const s = openItem(root, { lane: "order", title: "Granted" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\nt\n\n## Phase 3: C\n\nt\n");
  return s.id;
}

const phaseFile = (root: string, id: string, name: string) => join(root, "work", id, "phases", name);

function handedOffPhase3(root: string): string {
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  route({ id: workId(id), verdict: "approved", agent: "user", phase: 1, through: 3, session: "s1" }, hookContext(root));
  routePhaseDone(root, id, 2, false);
  return id;
}

test("a continued developer stop that routes nothing while the run grant hands it phase 3 marks 3.idle (T-2.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = handedOffPhase3(root);
  const rows = verdictRows(root, id).length;
  assert.equal(routePhaseDone(root, id, 2, true), null);
  assert.equal(existsSync(phaseFile(root, id, "3.idle")), true);
  assert.equal(verdictRows(root, id).length, rows);
});

test("a continued developer stop while phase 1 awaits the user writes no idle marker (T-2.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  assert.equal(routePhaseDone(root, id, 1, true), null);
  assert.deepEqual(readdirSync(join(root, "work", id, "phases")).filter((name) => name.endsWith(".idle")), []);
});

test("a new turn re-emitting the saved phase block routes nothing; a changed headline routes (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 3, false);
  const rows = verdictRows(root, id).length;
  assert.equal(routePhaseDone(root, id, 3, false), null);
  assert.equal(verdictRows(root, id).length, rows);
  assert.equal(existsSync(phaseFile(root, id, "3.fixes.md")), false);
  const changed = phaseBlock(id, 3, "feat: p").replace("P works.", "P works, and C too.");
  assert.match(routeDeveloperTurn(root, id, 3, false, changed).hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.equal(verdictRows(root, id).length, rows + 1);
});

test("a continued turn returns no context for a pull request review or a routing error", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const pr = "## Review: pr-412 · pr\n\nApproved.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const prTurn = transcript(root, [user("scope: pr"), assistant(pr)]);
  assert.equal(routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: prTurn, cwd: root, agent_type: "reviewer", stop_hook_active: true }, hookContext(root)), null);
  assert.equal(existsSync(statePath(root, "pr-412.review.md")), false);
  const id = twoPhaseOrder(root);
  const misowned = `## Phase 1 of ${id}: A\n\nA works.\n\nAPPROVED`;
  const errorTurn = (continued: boolean) => routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: transcript(root, [user(`work: ${id}`), assistant(misowned)]), cwd: root, agent_type: "picket:developer", stop_hook_active: continued }, hookContext(root));
  assert.equal(errorTurn(true), null);
  assert.match(errorTurn(false).hookSpecificOutput.additionalContext, /verdict not applied/);
});

function routeWritten(root: string, id: string, block: string, agent: string) {
  const tp = transcript(root, [user(`work: ${id}`), assistant(block)]);
  return routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: agent }, hookContext(root));
}

test("an architect's ARTIFACT WRITTEN and AMENDED show the user the path from the Artifact line", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  const written = routeWritten(root, id, `## Order: ${id}\n\nTwo phases.\n\nArtifact: work/${id}/order.md\nDecisions: D-001 x\n\nARTIFACT WRITTEN`, "picket:architect");
  assert.equal(written.systemMessage, `picket · order written: work/${id}/order.md`);
  const amended = routeWritten(root, id, `## Amendment: ${id}\n\nD-001 revised.\n\nArtifact: work/${id}/order.md\nRevision: D-001 (r2) y\n\nAMENDED`, "picket:architect");
  assert.equal(amended.systemMessage, `picket · order amended: work/${id}/order.md`);
});

test("an analyst's REPORT WRITTEN shows the user the path from the Report line", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "research", title: "Mapped" });
  const out = routeWritten(root, s.id, `## Report: ${s.id} · outline\n\nThe flow.\n\nTop findings: R-001 x [VERIFIED]\nReport: work/${s.id}/research.md\n\nREPORT WRITTEN`, "picket:analyst");
  assert.equal(out.systemMessage, `picket · research written: work/${s.id}/research.md`);
});

test("no message reaches the user for a developer verdict or a block without a path line", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  const bare = routeWritten(root, id, `## Order: ${id}\n\nTwo phases.\n\nARTIFACT WRITTEN`, "picket:architect");
  assert.equal("systemMessage" in bare, false);
  assert.equal("systemMessage" in routePhaseDone(root, id, 1, false), false);
});
