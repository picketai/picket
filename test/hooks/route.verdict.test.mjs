import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readSnapshot, stateView } from "../../dist/lib/shared/work/snapshot.mjs";
import { setMarker } from "../../dist/lib/shared/work/markers.mjs";
import { statePath } from "../../dist/lib/shared/paths.mjs";
import { gitIn } from "#test/git.mts";
import { assistantEntry as assistant, hookProject, runHookBundle, toolUse as tool, userEntry as user, writeTranscript } from "#test/hook.mts";
import { openItem, withProject } from "#test/project.mts";

function run(payload, root) {
  const r = runHookBundle("route.verdict", payload, { root });
  assert.equal(r.status, 0, r.stderr);
  return r.json;
}

const transcript = (root, entries) => writeTranscript(root, entries);
const deriveState = (id, root) => stateView(readSnapshot(root, id));
const mark = (id, n, kind, root) => setMarker(root, id, n, kind, new Date());

test("route.verdict applies PHASE DONE from a developer block and reports the next action", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1\nartifact: work/${id}/order.md`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s1", transcript_path: tp, cwd: root, agent_type: "developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /approve_phase by user/);
  assert.equal(deriveState(id, root).phases[0].done, true);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), true, "the developer block is saved for the gate packet");
});

test("route.verdict saves the block of a plugin-prefixed picket:developer", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s5", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /Block not saved/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), true);
});

test("route.verdict tells a picket:developer whose block has no phase heading that it was not saved", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "Phase 1 is staged.\n\n**Checks:** tests passed\n\nPHASE DONE" }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s6", transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /Block not saved: it has no `## Phase <n> of <id>: <title>` heading/);
  assert.equal(existsSync(join(root, "work", id, "phases", "1.block.md")), false);
});

test("route.verdict reads the block a subagent handed back, not the paraphrase after it", (t) => {
  const { root, id } = hookProject(t);
  const main = join(root, "main.jsonl");
  writeFileSync(main, JSON.stringify(user("fix the export")) + "\n");
  const block = `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE`;
  const own = transcript(root, [
    user(`work: ${id}\nphase: 1\nartifact: work/${id}/order.md`),
    assistant([tool("SubagentHandback", { message: block })]),
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "Report delivered to your caller." }] } },
    assistant([{ type: "text", text: "Phase 1 is staged and waits for approval.\n\nPHASE DONE" }]),
  ]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s4", transcript_path: main, agent_transcript_path: own, cwd: root, agent_type: "developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /PHASE DONE applied/);
  assert.equal(readFileSync(join(root, "work", id, "phases", "1.block.md"), "utf8").includes("Files: src/a.ts"), true, "the saved block is the handed-back one");
});

test("route.verdict ignores a hand-back from an earlier turn of the same agent", (t) => {
  const { root, id } = hookProject(t);
  const own = transcript(root, [
    user(`work: ${id}\nphase: 1`),
    assistant([tool("SubagentHandback", { message: `## Phase 1 of ${id}: A\n\nDone.\n\nPHASE DONE` })]),
    user("what did you change in src/a.ts?"),
    assistant([{ type: "text", text: "Only the export header." }]),
  ]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s5", transcript_path: own, agent_transcript_path: own, cwd: root, agent_type: "developer" }, root);
  assert.equal(out, null);
  assert.equal(deriveState(id, root).phases[0].done, false);
});

test("route.verdict closes the item on a cumulative APPROVED from the fresh cumulative-reviewer (T-2.5)", (t) => {
  const { root, id } = hookProject(t);
  mark(id, 1, "done", root);
  mark(id, 1, "approved", root);
  const block = `## Review: ${id} · cumulative\n\nApproved: every story row passes.\n\nRequirements: PASS (2)\nAlignment: PASS\nDecisions: HONOURED\nRegression: none\nSources: none\nQuestions: none\nFindings: clean\n\nAPPROVED`;
  const tp = transcript(root, [user(`You are reviewing a change you did not write. You have no context beyond what is below.\nwork: ${id}\nscope: cumulative`), assistant([{ type: "text", text: block }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s6", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "cumulative-reviewer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /APPROVED applied/);
  assert.match(out.hookSpecificOutput.additionalContext, /Next: close/);
  const last = deriveState(id, root).last_verdict;
  assert.deepEqual([last.agent, last.scope], ["reviewer", "cumulative"]);
});

test("route.verdict keeps a pull request review in the ledger instead of routing it", (t) => {
  const { root } = hookProject(t);
  const block = "## Review: pr-412 · pr\n\nApproved: the diff does what the description says.\n\nAlignment: PASS\nFindings: clean\n\nAPPROVED";
  const tp = transcript(root, [user("scope: pr"), assistant([{ type: "text", text: block }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s3", transcript_path: tp, cwd: root, agent_type: "reviewer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /APPROVED recorded for pr-412/);
  assert.equal(readFileSync(statePath(root, "pr-412.review.md"), "utf8").trim(), block);
});

function designProject(t, phaseCount) {
  const root = withProject(t, { host: true, picket: false });
  gitIn(root, "init", "-q");
  const s = openItem(root, { lane: "design", title: "Six phases" });
  const numbers = Array.from({ length: phaseCount }, (_, i) => i + 1);
  const frontmatter = numbers.map((n) => `  - n: ${n}\n    files: [src/${n}.ts]\n    security: false\n`).join("");
  const bodies = numbers.map((n) => `## Phase ${n}: P${n}\n\n- **T-${n}.1** a\n- **T-${n}.2** b\n- **T-${n}.3** c\n`).join("\n");
  writeFileSync(join(root, "work", s.id, "design.md"), `---\nlane: design\nphases:\n${frontmatter}---\n# D\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n${bodies}\n## Revision log\n`);
  return { root, id: s.id };
}

test("route.verdict records a continued reviewer's checkpoint on the phase of its latest message (T-2.4, T-2.5)", (t) => {
  const { root, id } = designProject(t, 6);
  for (const n of [1, 2, 3, 4]) {
    mark(id, n, "done", root);
    mark(id, n, "approved", root);
  }
  const block = `## Review: ${id} · checkpoint (phases 1 to 4, base b5cc4bb to HEAD 4840897)\n\nApproved.\n\nFindings: clean\n\nAPPROVED`;
  const tp = transcript(root, [
    user(`work: ${id}\nscope: crosscheck`),
    assistant([{ type: "text", text: `## Review: ${id} · crosscheck\n\nALIGNED` }]),
    user(`The coordinator sent a message while you were working:\nwork: ${id}\nscope: checkpoint\nphase: 4`),
    assistant([{ type: "text", text: block }]),
  ]);
  run({ hook_event_name: "SubagentStop", session_id: "s9", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "reviewer" }, root);
  assert.equal(existsSync(join(root, "work", id, "phases", "4.reviewed")), true);
  assert.equal(existsSync(join(root, "work", id, "phases", "5.reviewed")), false);
  const rows = readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.at(-1).phase, 4);
  assert.equal(rows.at(-1).scope, "checkpoint");
});

test("route.verdict applies PHASE DONE from a picket:developer whose block has no phase heading", (t) => {
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: "Done.\n\nPHASE DONE" }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: "s7", transcript_path: tp, agent_transcript_path: tp, cwd: root, agent_type: "picket:developer" }, root);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`PHASE DONE applied to ${id} phase 1`));
  assert.equal(deriveState(id, root).phases[0].done, true);
});

test("route.verdict applies a PHASE DONE from a picket:developer", (t) => {
  const agent_type = "picket:developer";
  const { root, id } = hookProject(t);
  const tp = transcript(root, [user(`work: ${id}\nphase: 1`), assistant([{ type: "text", text: `## Phase 1 of ${id}: A\n\nDone.\n\nFiles: src/a.ts\nTests: passed\n\nPHASE DONE` }])]);
  const out = run({ hook_event_name: "SubagentStop", session_id: `s-${agent_type}`, transcript_path: tp, cwd: root, agent_type }, root);
  assert.match(out.hookSpecificOutput.additionalContext, /^picket: PHASE DONE applied/);
  assert.equal(deriveState(id, root).phases[0].done, true);
});
