import { test } from "node:test";
import assert from "node:assert/strict";
import { assistantEntry as assistant, hookProject, ledgerRows, runHookBundle, userEntry as user, writeTranscript as transcript } from "#test/hook.mts";

function run(payload, root) {
  const r = runHookBundle("guard.block", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

const COMMIT = "Commit: docs(a): one line";

function blockVerdict(root, text) {
  const tp = transcript(root, [user("x"), assistant([{ type: "text", text }])]);
  return run({ hook_event_name: "SubagentStop", transcript_path: tp, cwd: root }, root);
}

test("guard.block bounces a contract block without a token and passes one with it", (t) => {
  const { root, id } = hookProject(t);
  const bad = transcript(root, [user("x"), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nI think this is approved.` }])]);
  const b = run({ hook_event_name: "SubagentStop", transcript_path: bad, cwd: root }, root);
  assert.equal(b.decision, "block");
  assert.match(b.reason, /verdict token/);
  const good = transcript(root, [user("x"), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nRed: n/a: docs only\nRoot cause: none\n${COMMIT}\n\nPHASE DONE` }])]);
  assert.equal(run({ hook_event_name: "SubagentStop", transcript_path: good, cwd: root }, root), null);
  const plain = transcript(root, [user("x"), assistant([{ type: "text", text: "just a chat reply" }])]);
  assert.equal(run({ hook_event_name: "Stop", transcript_path: plain, cwd: root }, root), null);
});

test("guard.block checks the Red and Root cause lines of a PHASE DONE developer block (T-4.1)", (t) => {
  const { root, id } = hookProject(t);
  const phase = (...fields) => [`## Phase 1 of ${id}: A`, "", "Done.", "", ...fields, COMMIT, "", "PHASE DONE"].join("\n");
  const noRed = blockVerdict(root, phase("Root cause: none"));
  assert.equal(noRed?.decision, "block");
  assert.match(noRed.reason, /no "Red:" line/);
  const flaky = blockVerdict(root, phase("Red: n/a: docs only", "Root cause: flaky"));
  assert.equal(flaky?.decision, "block");
  assert.match(flaky.reason, /"Root cause: flaky" is neither none nor/);
  assert.match(blockVerdict(root, phase("Red: maybe", "Root cause: none"))?.reason ?? "", /"Red: maybe" is none of/);
  assert.match(blockVerdict(root, phase("Red: n/a: docs only"))?.reason ?? "", /no "Root cause:" line/);
  assert.equal(blockVerdict(root, phase("Red: n/a: docs only", "Root cause: none")), null);
  assert.equal(blockVerdict(root, phase("Red: test/fee.test.ts failed: expected 1.05, got 1.04", "Root cause: totals were off because the rate was read in percent")), null);
  assert.equal(blockVerdict(root, phase("Red: pinned: test/name.test.ts", "Root cause: none")), null);
});

test("guard.block reads bold Red, Root cause and Commit labels of a PHASE DONE block (T-1.5)", (t) => {
  const { root, id } = hookProject(t);
  const boldPhase = (red) => [`## Phase 1 of ${id}: A`, "", "Done.", "", `**Red:** ${red}`, "**Root cause:** none", "**Commit:** docs(a): one line", "", "PHASE DONE"].join("\n");
  assert.equal(blockVerdict(root, boldPhase("n/a: docs only")), null);
  const out = blockVerdict(root, boldPhase("maybe"));
  assert.equal(out?.decision, "block");
  assert.match(out.reason, /"Red: maybe" is none of/);
});

test("guard.block rejects a PHASE DONE block that folds Files: into +n more and passes the full list (T-1.1)", (t) => {
  const { root, id } = hookProject(t);
  const phase = (files) => [`## Phase 1 of ${id}: A`, "", "Done.", "", `Files: ${files}`, "Red: n/a: docs only", "Root cause: none", COMMIT, "", "PHASE DONE"].join("\n");
  for (const folded of ["src/a.ts, src/b.ts (+3 more)", "src/a.ts, src/b.ts, +3 more"]) {
    const out = blockVerdict(root, phase(folded));
    assert.equal(out?.decision, "block", folded);
    assert.match(out.reason, /"Files: src\/a\.ts, src\/b\.ts.*" folds paths into "\+<n> more"; list every staged path on Files:/, folded);
  }
  assert.equal(blockVerdict(root, phase("src/a.ts, src/b.ts, src/c.ts, src/d.ts, src/e.ts")), null);
  assert.equal(blockVerdict(root, `## Phase 1 of ${id}: A\n\nStuck.\n\nFiles: src/a.ts (+3 more)\n\nPHASE STALLED`), null, "a stalled block is not checked");
});

test("guard.block does not ask a stalled block or another agent's block for proof lines (T-4.2)", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(blockVerdict(root, `## Phase 1 of ${id}: A\n\nCannot meet T-1.2.\n\nPHASE STALLED`), null, "stalled");
  assert.equal(blockVerdict(root, `## Review: ${id} · phase 1\n\nClean.\n\nFindings: clean\n\nAPPROVED`), null, "reviewer");
  assert.equal(blockVerdict(root, `## Design: ${id}\n\nWritten.\n\nARTIFACT WRITTEN`), null, "architect");
  assert.equal(blockVerdict(root, `## Report: ${id}\n\nWritten.\n\nREPORT WRITTEN`), null, "analyst");
});

function verifiedPhase(id, verified) {
  const fields = verified === null ? [] : [`Verified: ${verified}`];
  return [`## Phase 1 of ${id}: A`, "", "Done.", "", ...fields, "Red: n/a: docs only", "Root cause: none", COMMIT, "", "PHASE DONE"].join("\n");
}

const commitPhase = (id, commit) => [`## Phase 1 of ${id}: A`, "", "Done.", "", "Red: n/a: docs only", "Root cause: none", ...(commit === null ? [] : [commit]), "", "PHASE DONE"].join("\n");
const TYPES = ["feat", "fix", "refactor", "perf", "test", "docs", "build", "ci", "chore", "style"];

test("guard.block bounces a PHASE DONE block whose Commit: line is not a Conventional Commits subject, naming the types and 72 (T-2.1)", (t) => {
  const { root, id } = hookProject(t);
  const out = blockVerdict(root, commitPhase(id, "Commit: Pricing, phase 1"));
  assert.equal(out?.decision, "block");
  assert.match(out.reason, /"Pricing, phase 1" is not/);
  for (const type of TYPES) assert.ok(out.reason.includes(type), `${out.reason} lacks ${type}`);
  assert.match(out.reason, /\b72\b/);
});

test("guard.block bounces a PHASE DONE block without Commit:, passes a wrapped one, and leaves stalled and reviewer blocks alone (T-2.2)", (t) => {
  const { root, id } = hookProject(t);
  const missing = blockVerdict(root, commitPhase(id, null));
  assert.equal(missing?.decision, "block");
  assert.match(missing.reason, /the block has no "Commit:" line/);
  assert.equal(blockVerdict(root, commitPhase(id, "Commit: `feat(x): y.`")), null);
  assert.equal(blockVerdict(root, `## Phase 1 of ${id}: A\n\nStuck.\n\nPHASE STALLED`), null);
  assert.equal(blockVerdict(root, `## Review: ${id} · phase 1\n\nClean.\n\nFindings: clean\n\nAPPROVED`), null);
});

test("guard.block passes a PHASE DONE block whose Verified: is blocked: data: <what>", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(blockVerdict(root, verifiedPhase(id, "blocked: data: no order rows to list until the shop is seeded")), null);
});

test("guard.block passes a PHASE DONE block whose Verified: is blocked: configuration: <what>", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(blockVerdict(root, verifiedPhase(id, "blocked: configuration: the payment provider key is not set")), null);
});

test("guard.block passes a PHASE DONE block whose Verified: is blocked: environment: <what>", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(blockVerdict(root, verifiedPhase(id, "blocked: environment: the orders database is not reachable")), null);
});

test("guard.block bounces a blocked: Verified: line without one of the three kinds and names them", (t) => {
  const { root, id } = hookProject(t);
  for (const verified of ["blocked: seed rows missing", "blocked: env: no database", "blocked: data:"]) {
    const out = blockVerdict(root, verifiedPhase(id, verified));
    assert.equal(out?.decision, "block", verified);
    assert.match(out.reason, /blocked: <data \| configuration \| environment>: <what>/, verified);
    assert.match(out.reason, /another shape or route is not a block/, verified);
  }
});

test("guard.block leaves the other Verified: forms and a block without Verified: as they were", (t) => {
  const { root, id } = hookProject(t);
  assert.equal(blockVerdict(root, verifiedPhase(id, "npm run cli -- list → exit 0")), null);
  assert.equal(blockVerdict(root, verifiedPhase(id, "no drivable surface: pure function")), null);
  assert.equal(blockVerdict(root, verifiedPhase(id, null)), null);
});

test("guard.block does not check Verified: on a fast lane block", (t) => {
  const { root, id } = hookProject(t);
  const expedited = [`## Expedited: ${id}`, "", "Done.", "", "Verified: blocked: seed rows missing", "", "[c] commit   [x] discard: <why>"].join("\n");
  assert.equal(blockVerdict(root, expedited), null);
});

const MISSING_BLOCK = "guard.block: the turn ended without your block. Finish the task and end with your block, or reply in one line why you cannot.";

function agentTurn(root, text, fields) {
  const tp = transcript(root, [user("x"), assistant([{ type: "text", text }])]);
  return run({ hook_event_name: "SubagentStop", transcript_path: tp, cwd: root, agent_type: "picket:developer", ...fields }, root);
}

test("a picket agent's turn that ends without its block is bounced once", (t) => {
  const { root } = hookProject(t);
  const out = agentTurn(root, "I looked at the file.");
  assert.equal(out?.decision, "block");
  assert.equal(out.reason, MISSING_BLOCK);
});

test("a turn without a block passes when the hook already bounced, the agent is not picket's, or it is the lead's Stop", (t) => {
  const { root } = hookProject(t);
  assert.equal(agentTurn(root, "I looked at the file.", { stop_hook_active: true }), null);
  assert.equal(agentTurn(root, "I looked at the file.", { agent_type: "Explore" }), null);
  assert.equal(agentTurn(root, "I looked at the file.", { hook_event_name: "Stop", agent_type: undefined }), null);
});

test("a picket agent's turn that ends on a verdict token is not bounced for a missing block", (t) => {
  const { root } = hookProject(t);
  assert.equal(agentTurn(root, "Stuck on the port.\n\nPHASE STALLED"), null);
});

test("a spawned guard.block bounce on the lead's Stop appends one bounce row (T-2.2)", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user("x"), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nI think this is approved.` }])]);
  const out = run({ hook_event_name: "Stop", session_id: "s31", transcript_path: tp, cwd: root }, root);
  assert.equal(out.decision, "block");
  const rows = ledgerRows(root);
  assert.deepEqual(rows.map((r) => [r.event, r.hook, r.agent, r.session]), [["bounce", "guard.block", "lead", "s31"]]);
});
