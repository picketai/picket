import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repeatsPhaseVerdict, reviewClasses, routeVerdict as verdictHandler } from "./index.mts";
import { statePath, stateRel } from "../../../shared/paths.mts";
import { workId } from "../../../shared/work/files.mts";
import { recordDigest } from "../../../shared/work/amendment.mts";
import { setMarker } from "../../../shared/work/markers.mts";
import { appendReply } from "../../../shared/work/replies.mts";
import { readSnapshot } from "../../../shared/work/snapshot.mts";
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

test("a continued stop of a developer teammate named by instance marks 3.idle like picket:developer (T-1.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = handedOffPhase3(root);
  const tp = transcript(root, [user(`work: ${id}\nphase: 2`), assistant(phaseBlock(id, 2, "feat: p"))]);
  const ctx = hookContext(root, { env: { ...process.env, ...GIT_IDENTITY } });
  const out = routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "bfoi-developer", stop_hook_active: true }, ctx);
  assert.equal(out, null);
  assert.equal(existsSync(phaseFile(root, id, "3.idle")), true);
});

test("a continued developer stop while phase 1 awaits the user writes no idle marker (T-2.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  assert.equal(routePhaseDone(root, id, 1, true), null);
  assert.deepEqual(readdirSync(join(root, "work", id, "phases")).filter((name) => name.endsWith(".idle")), []);
});

test("a new turn re-emitting the saved phase block routes nothing (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 3, false);
  const rows = verdictRows(root, id).length;
  assert.equal(routePhaseDone(root, id, 3, false), null);
  assert.equal(verdictRows(root, id).length, rows);
  assert.equal(existsSync(phaseFile(root, id, "3.fixes.md")), false);
});

test("a re-sent PHASE DONE with a changed block adds no row, saves the newer block and says it is recorded (T-5.1)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  const newer = phaseBlock(id, 1, "feat: p").replace("Tests: passed", "Tests: passed (12 of 12)");
  const out = routeDeveloperTurn(root, id, 1, false, newer);
  assert.equal(out.hookSpecificOutput.additionalContext, `picket: PHASE DONE for ${id} phase 1 is already recorded; the newer block is saved. Run \`picket next ${id}\`.`);
  assert.equal(verdictRows(root, id).length, 1);
  assert.match(readFileSync(blockPath(root, id), "utf8"), /^Tests: passed \(12 of 12\)$/m);
});

test("a reviewer APPROVED sent twice with no row between leaves one row (T-5.2)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  const approved = reviewBlock(id, "phase 1", "Clean.", "APPROVED");
  routeReview(root, id, approved);
  routeReview(root, id, approved.replace("Clean.", "Clean, rechecked."));
  assert.deepEqual(verdictRows(root, id).map((r) => r.verdict), ["PHASE DONE", "APPROVED"]);
});

test("a PHASE DONE after a user rejection of the same phase adds a row (T-5.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  route({ id: workId(id), verdict: "rejected", agent: "user", phase: 1, reason: "rename the field", session: "s1" }, hookContext(root));
  const fixed = phaseBlock(id, 1, "feat: p").replace("P works.", "P works, field renamed.");
  assert.match(routeDeveloperTurn(root, id, 1, false, fixed).hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1], ["rejected", 1], ["PHASE DONE", 1]]);
});

test("a PHASE DONE for phase 2 after one for phase 1 adds a row (T-5.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  routePhaseDone(root, id, 2, false);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1], ["PHASE DONE", 2]]);
});

test("a second AMENDED right after an AMENDED row, on a stop that was not continued, adds a row (T-5.4)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = designItem(root);
  const amend = (text: string) => routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: transcript(root, [user(`work: ${id}\nphase: 1`), assistant(`## Amendment: ${id}\n\n${text}\n\nAMENDED`)]), cwd: root, agent_type: "picket:architect" }, hookContext(root));
  amend("D-002 revised.");
  amend("D-003 revised.");
  assert.deepEqual(verdictRows(root, id).map((r) => r.verdict), ["AMENDED", "AMENDED"]);
});

test("repeatsPhaseVerdict needs a phase, the same agent, verdict, phase and scope, and no written verdict", () => {
  const row = { ts: "t", agent: "developer", verdict: "PHASE DONE", phase: 1, scope: null, through: null };
  const incoming = { agent: "developer", verdict: "PHASE DONE", phase: 1, scope: undefined };
  assert.equal(repeatsPhaseVerdict([row], incoming), true);
  assert.equal(repeatsPhaseVerdict([row], { ...incoming, phase: undefined }), false);
  assert.equal(repeatsPhaseVerdict([row], { ...incoming, agent: "reviewer" }), false);
  assert.equal(repeatsPhaseVerdict([row], { ...incoming, scope: "checkpoint" }), false);
  assert.equal(repeatsPhaseVerdict([{ ...row, verdict: "AMENDED" }], { ...incoming, verdict: "AMENDED" }), false);
  assert.equal(repeatsPhaseVerdict([], incoming), false);
});

test("the identical phase block in a new turn after a reviewer CHANGES REQUIRED routes a second PHASE DONE (T-1.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  routeReview(root, id, reviewBlock(id, "phase 1", "One finding.", "CHANGES REQUIRED"));
  assert.match(routePhaseDone(root, id, 1, false).hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1], ["CHANGES REQUIRED", 1], ["PHASE DONE", 1]]);
});

test("the identical phase block in a new turn after a user rejection routes a second PHASE DONE (T-1.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  route({ id: workId(id), verdict: "rejected", agent: "user", phase: 1, reason: "rename the field", session: "s1" }, hookContext(root));
  assert.match(routePhaseDone(root, id, 1, false).hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.deepEqual(verdictRows(root, id).map((r) => [r.verdict, r.phase]), [["PHASE DONE", 1], ["rejected", 1], ["PHASE DONE", 1]]);
});

test("a reviewer APPROVED after the phase block leaves an identical block in a new turn unrouted", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = threePhaseOrder(root);
  routePhaseDone(root, id, 1, false);
  routeReview(root, id, reviewBlock(id, "phase 1", "Clean.", "APPROVED"));
  assert.equal(routePhaseDone(root, id, 1, false), null);
  assert.deepEqual(verdictRows(root, id).map((r) => r.verdict), ["PHASE DONE", "APPROVED"]);
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

const PRINT_PATH = /Print ".*" on its own line/;

test("a written path asks the lead to print it on its own line, where the Markdown mod makes it a link", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  const written = routeWritten(root, id, `## Order: ${id}\n\nTwo phases.\n\nArtifact: work/${id}/order.md\nDecisions: D-001 x\n\nARTIFACT WRITTEN`, "picket:architect");
  assert.ok(written.hookSpecificOutput.additionalContext.endsWith(`\nPrint "Order: work/${id}/order.md" on its own line in your reply so the user can open it.`), written.hookSpecificOutput.additionalContext);
  const s = openItem(root, { lane: "research", title: "Mapped" });
  const report = routeWritten(root, s.id, `## Report: ${s.id} · outline\n\nThe flow.\n\nReport: work/${s.id}/research.md\n\nREPORT WRITTEN`, "picket:analyst");
  assert.ok(report.hookSpecificOutput.additionalContext.endsWith(`\nPrint "Research: work/${s.id}/research.md" on its own line in your reply so the user can open it.`), report.hookSpecificOutput.additionalContext);
  const bare = routeWritten(root, id, `## Order: ${id}\n\nTwo phases.\n\nARTIFACT WRITTEN`, "picket:architect");
  assert.doesNotMatch(bare.hookSpecificOutput.additionalContext, PRINT_PATH);
});

function cumulativeBlock(id: string, findings: string, amend: string | null): string {
  const lines = [`## Review: ${id} · cumulative`, "", "One criterion's wording does not match what the code does.", "", "Requirements: PASS (3)", "Alignment: FAIL: T-2.7 the wording names the wrong file", "Decisions: HONOURED", "Regression: none", "Sources: none", "Questions: none", findings, "Classes: none", ...(amend ? ["", amend] : []), "", "CHANGES REQUIRED"];
  return lines.join("\n");
}

const PLAN_AMEND = "AMENDMENT NEEDED: T-2.7 the criterion names src/b.mts, the phase changed src/a.mts";
const recordFinding = (id: string) => `Findings: 1 minor\n- [Minor] work/${id}/order.md:219: T-2.7 names src/b.mts. The reviewer cannot match it. Name src/a.mts.`;

function routedCumulative(t: TestContext, findings: (id: string) => string, amend: string | null) {
  const root = withProject(t, { host: true, picket: false });
  const id = twoPhaseOrder(root);
  routeReview(root, id, cumulativeBlock(id, findings(id), amend));
  return verdictRows(root, id).at(-1);
}

test("a cumulative rejection whose findings cite only the record, with an amendment line, is plan-only (T-2.1)", (t) => {
  assert.equal(routedCumulative(t, recordFinding, PLAN_AMEND).plan_only, true);
  assert.equal(routedCumulative(t, () => "Findings: clean", PLAN_AMEND).plan_only, true);
});

test("a code finding beside the record finding, or no amendment line, leaves the rejection without plan_only (T-2.1)", (t) => {
  const withCode = routedCumulative(t, (id) => `${recordFinding(id)}\n- [Minor] src/a.mts:3: The guard is inverted. Empty input passes. Negate it.`, PLAN_AMEND);
  assert.equal(Object.hasOwn(withCode, "plan_only"), false);
  assert.equal(Object.hasOwn(routedCumulative(t, recordFinding, null), "plan_only"), false);
});

function routeAt(root: string, id: string, block: string, agent: string, now: string) {
  const tp = transcript(root, [user(`work: ${id}`), assistant(block)]);
  return routeVerdict({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: agent }, hookContext(root, { now }));
}

function approvedTwoPhaseOrder(root: string): string {
  const id = twoPhaseOrder(root);
  for (const n of [1, 2]) for (const mark of ["done", "approved"] as const) setMarker(root, workId(id), n, mark, new Date("2026-10-23T09:00:00.000Z"));
  return id;
}

const codeFinding = (id: string) => `${recordFinding(id)}\n- [Minor] src/a.mts:3: The guard is inverted. Empty input passes. Negate it.`;
const amendGrant = (root: string, id: string, ts: string) => appendReply(root, workId(id), { action: "approve_amendment", phase: null, reply: "a", choice: "amend" }, new Date(ts));
const AMENDED_BLOCK = (id: string) => `## Amendment: ${id}\n\nT-2.7 reworded.\n\nAMENDED`;

test("an unchanged AMENDED after a gated mixed amendment carries the review's record and reopens the gate; an edited one sends the developer (T-2.5)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const id = approvedTwoPhaseOrder(root);
  routeAt(root, id, cumulativeBlock(id, codeFinding(id), PLAN_AMEND), "picket:reviewer", "2026-10-23T10:00:00.000Z");
  const review = verdictRows(root, id).at(-1);
  assert.equal(review.record, recordDigest(readSnapshot(root, workId(id)).artifact?.body ?? ""));
  amendGrant(root, id, "2026-10-23T10:01:00.000Z");
  const unchanged = routeAt(root, id, AMENDED_BLOCK(id), "picket:architect", "2026-10-23T10:02:00.000Z").hookSpecificOutput.additionalContext;
  assert.equal(verdictRows(root, id).at(-1).record, review.record);
  assert.match(unchanged, /order\.md unchanged since the amendment was asked/);
  assert.match(unchanged, /Next: approve_amendment by user/);
  amendGrant(root, id, "2026-10-23T10:03:00.000Z");
  const orderPath = join(root, "work", id, "order.md");
  writeFileSync(orderPath, `${readFileSync(orderPath, "utf8")}\n## Revision log\n\n- 2026-10-23: T-2.7 names src/a.mts\n`);
  const edited = routeAt(root, id, AMENDED_BLOCK(id), "picket:architect", "2026-10-23T10:04:00.000Z").hookSpecificOutput.additionalContext;
  assert.match(edited, /Next: fix_findings by developer/);
});

const REVIEWING_SKILL = new URL("../../../../skills/reviewing/SKILL.md", import.meta.url);

test("the reviewing skill's plan-wording finding example routes as plan-only (T-3.2)", (t) => {
  const example = readFileSync(REVIEWING_SKILL, "utf8").match(/^- \[\w+\] work\/<id>\/order\.md:.*$/m)?.[0];
  assert.ok(example, "the skill holds a finding example citing work/<id>/order.md");
  const row = routedCumulative(t, (id) => `Findings: 1 minor\n${example.replaceAll("<id>", id)}`, "AMENDMENT NEEDED: T-1.2 the criterion names the wrong file");
  assert.equal(row.plan_only, true);
});
