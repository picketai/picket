import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { saveBlock } from "../../shared/work/block.mts";
import { setMarker } from "../../shared/work/markers.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { appendVerdict } from "../../shared/work/verdict-log.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { instanceTag } from "../../shared/work/send.mts";
import { verb, type ReplyResult } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { readLayout } from "../../shared/repos.mts";
import { gitAt, gitIn, umbrella } from "#test/git.mts";
import { openItem, withProject } from "#test/project.mts";

const SESSION = "S";

function phasesOf(count: number): string {
  return Array.from({ length: count }, (_, i) => `## Phase ${i + 1}: P${i + 1}\n\nt\n`).join("\n");
}

function item(t: TestContext, { lane = "order", phases = 3 }: { lane?: string; phases?: number } = {}) {
  const root = withProject(t, { host: true, picket: false });
  const git = gitAt(root);
  git("init", "-q");
  writeFileSync(join(root, ".gitignore"), ".picket/state/\n");
  const { id } = openItem(root, { lane, title: "Replied" });
  writeFileSync(join(root, "work", id, `${lane}.md`), `---\nlane: ${lane}\n---\n# R\n\n${phasesOf(phases)}`);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id, git };
}

function phaseDone(root: string, id: WorkId, n: number, fields = "") {
  saveBlock(root, id, n, `## Phase ${n} of ${id}: P${n}\n\nDone.\n\nFiles: src/a.ts\n${fields}Commit: feat(a): phase ${n}\n\nPHASE DONE`);
  setMarker(root, id, n, "done", new Date());
}

async function reply(root: string, id: WorkId, text: string) {
  return verb.run({ id, reply: text }, fixedContext(root, { session: SESSION, env: process.env, now: new Date(), cwd: root }));
}

async function applied(root: string, id: WorkId, text: string): Promise<ReplyResult> {
  const outcome = await reply(root, id, text);
  assert.equal(outcome.status, "done", JSON.stringify(outcome));
  assert.ok("value" in outcome);
  return outcome.value;
}

async function refused(root: string, id: WorkId, text: string): Promise<string> {
  const outcome = await reply(root, id, text);
  assert.equal(outcome.status, "refused", JSON.stringify(outcome));
  assert.ok("message" in outcome);
  return outcome.message;
}

function replyRows(root: string, id: WorkId) {
  return readFileSync(join(root, "work", id, "replies.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

function lastVerdict(root: string, id: WorkId) {
  return JSON.parse(readFileSync(join(root, "work", id, "verdicts.jsonl"), "utf8").trim().split("\n").at(-1) ?? "{}");
}

function stall(root: string, id: WorkId, reason: string) {
  appendVerdict(root, id, { agent: "developer", verdict: "PHASE STALLED", phase: 1, scope: null, through: null, session: SESSION }, new Date("2026-10-29T10:00:00.000Z"));
  writeState(root, { ...readState(root, id), status: "blocked", blocked_reason: reason }, new Date());
}

test("reply reads an id and joins the rest as the reply", () => {
  assert.deepEqual(verb.parse(parseArgs(["20261029-x", "x", "tests", "are", "flaky"])), { id: "20261029-x", reply: "x tests are flaky" });
  assert.throws(() => verb.parse(parseArgs(["20261029-x"])), UsageError);
});

test("a approves the phase, commits it as route does and logs the reply", async (t) => {
  const { root, id, git } = item(t);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n");
  git("add", "-A", "--", "src/a.ts");
  phaseDone(root, id, 1);
  const result = await applied(root, id, "a");
  assert.ok(existsSync(join(root, "work", id, "phases", "1.approved")));
  assert.ok(result.applied.some((line) => /^committed [0-9a-f]+: feat\(a\): phase 1$/.test(line)), result.applied.join("\n"));
  assert.deepEqual(replyRows(root, id), [{ ts: replyRows(root, id)[0].ts, session: SESSION, action: "approve_phase", phase: 1, reply: "a" }]);
});

test("r <m> grants a run up to the last phase; past it, or with no [r] offered, it is refused", async (t) => {
  const { root, id } = item(t);
  phaseDone(root, id, 1);
  assert.match(await refused(root, id, "r 9"), /matches no option at approve_phase; options: \[a\] approve · \[r\] run through 3/);
  await applied(root, id, "R 3");
  assert.equal(readState(root, id).run_through, 3);
  const last = item(t, { phases: 1 });
  phaseDone(last.root, last.id, 1);
  await refused(last.root, last.id, "r 3");
});

test("x <why> rejects with the reason and sends it to the developer verbatim", async (t) => {
  const { root, id } = item(t);
  phaseDone(root, id, 1);
  const result = await applied(root, id, "x Tests are flaky");
  assert.equal(lastVerdict(root, id).verdict, "rejected");
  assert.equal(result.send.length, 1);
  assert.equal(result.send[0].to, `${instanceTag(id)}-developer`);
  assert.equal(result.send[0].message, `work: ${id}\nphase: 1\nrejected: Tests are flaky`);
  await refused(root, id, "x");
});

test("k <n> records the comment and sends its approval; w <n> records a deleted-test waiver", async (t) => {
  const { root, id } = item(t);
  phaseDone(root, id, 1, 'Comments: src/a.ts:4 "half-up"\nWaivers: src/b.test.ts deleted because moved\n');
  const kept = await applied(root, id, "k 1");
  assert.deepEqual(JSON.parse(readFileSync(join(root, "work", id, "comments.jsonl"), "utf8")).text, "half-up");
  assert.match(kept.send[0].message, /^comment approved: src\/a\.ts:4 "half-up"$/m);
  assert.equal(kept.send[0].to, `${instanceTag(id)}-developer`);
  const waived = await applied(root, id, "w 1");
  const waiver = JSON.parse(readFileSync(join(root, "work", id, "waivers.jsonl"), "utf8"));
  assert.deepEqual([waiver.path, waiver.deleted], ["src/b.test.ts", true]);
  assert.match(waived.send[0].message, /^waiver approved: src\/b\.test\.ts deleted$/m);
  assert.equal(waived.send[0].to, `${instanceTag(id)}-developer`);
  await refused(root, id, "k 2");
});

test("at a stall, c reopens for developer-2, d abandons an order item, x abandons", async (t) => {
  const continued = item(t);
  stall(continued.root, continued.id, "PHASE STALLED on phase 1");
  const c = await applied(continued.root, continued.id, "c");
  assert.equal(readState(continued.root, continued.id).status, "open");
  assert.equal(readState(continued.root, continued.id).blocked_reason, undefined);
  assert.equal(replyRows(continued.root, continued.id)[0].fresh, true);
  assert.deepEqual([c.send[0].tool, c.send[0].to], ["Agent", `${instanceTag(continued.id)}-developer-2`]);

  const order = item(t);
  stall(order.root, order.id, "PHASE STALLED on phase 1");
  const d = await applied(order.root, order.id, "d");
  assert.equal(readState(order.root, order.id).status, "abandoned");
  assert.ok(d.applied.includes("abandoned; open the same request in the design lane"));

  const abandoned = item(t);
  stall(abandoned.root, abandoned.id, "PHASE STALLED on phase 1");
  await applied(abandoned.root, abandoned.id, "x");
  assert.equal(readState(abandoned.root, abandoned.id).status, "abandoned");
});

test("d at a design stall reopens the item and sends the architect the old blocked reason", async (t) => {
  const { root, id } = item(t, { lane: "design" });
  stall(root, id, "PHASE STALLED: the port moved");
  const result = await applied(root, id, "redesign");
  assert.equal(readState(root, id).status, "open");
  assert.deepEqual(result.send.map((s) => [s.to, s.message]), [[`${instanceTag(id)}-architect`, `work: ${id}\namend: PHASE STALLED: the port moved`]]);
});

test("a reply that matches nothing lists the options; a reply away from a gate names the action", async (t) => {
  const { root, id } = item(t);
  assert.match(await refused(root, id, "a"), /is at implement_phase, not a gate/);
  phaseDone(root, id, 1);
  assert.match(await refused(root, id, "maybe"), /options: \[a\] approve · \[r\] run through 3 · \[x\] reject: <why>/);
  assert.equal(existsSync(join(root, "work", id, "replies.jsonl")), false);
});

function researchItem(t: TestContext, title = "Pricing rules") {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "research", title });
  writeFileSync(join(root, "work", id, "research.md"), "# R\n");
  return { root, id };
}

test("p on a research item approves it and publishes the report", async (t) => {
  const { root, id } = researchItem(t);
  const result = await applied(root, id, "p");
  assert.deepEqual(result.applied, [`published work/${id}/research.md to artifacts/reports/pricing-rules.md`]);
  assert.equal(readFileSync(join(root, "artifacts", "reports", "pricing-rules.md"), "utf8"), "# R\n");
  assert.equal(replyRows(root, id).at(-1).reply, "p");
});

test("a, d and x on a research item are the lead's, and are refused saying so", async (t) => {
  const { root, id } = researchItem(t);
  for (const text of ["a", "d", "x too shallow"]) assert.equal(await refused(root, id, text), "on a research item reply takes p; a, d and x are the lead's (picket:researching)", text);
  assert.equal(existsSync(join(root, "artifacts")), false);
});

const ORDERS_DESIGN = "---\nlane: design\nphases:\n  - n: 1\n    files: [src/Orders/pricing.cs]\n    security: false\n---\n# D\n\n## Phase 1: Pricing\n\nt\n";

function worktreeItem(t: TestContext, source?: string) {
  const { root, repos } = umbrella(t, { repos: ["Orders"] });
  gitIn(repos.Orders, "branch", "develop");
  const { id } = openItem(root, { lane: "design", title: "Orders pricing", ...(source ? { source } : {}) });
  writeFileSync(join(root, "work", id, "design.md"), ORDERS_DESIGN);
  return { root, id };
}

test("y at create_worktrees records the ticket key and sends phase 1 with the cross-check (T-6.3)", async (t) => {
  const { root, id } = worktreeItem(t, "RMS-12");
  const result = await applied(root, id, "y");
  assert.equal(readState(root, id).branch, "RMS-12");
  assert.equal(result.applied[0], "branch RMS-12 recorded");
  assert.match(result.applied[1], /^src\/Orders from main @[0-9a-f]{8} -> src\/Orders\/\.worktrees\/RMS-12$/);
  assert.equal(result.next.action, "implement_phase");
  assert.deepEqual(result.send.map((s) => s.to), [`${instanceTag(id)}-developer`, `${instanceTag(id)}-reviewer`]);
  assert.match(result.send[1].message, /^scope: crosscheck$/m);
});

test("a free name with from records each touched repo's start; n records the main checkouts (T-6.4)", async (t) => {
  const named = worktreeItem(t);
  await applied(named.root, named.id, "feature/x from develop");
  assert.equal(readState(named.root, named.id).branch, "feature/x");
  assert.deepEqual(readLayout(named.root, named.id).repos.map((r) => [r.path, r.from]), [["src/Orders", "develop"]]);

  const none = worktreeItem(t);
  const result = await applied(none.root, none.id, "n");
  assert.equal(readLayout(none.root, none.id).worktrees, "none");
  assert.equal(readState(none.root, none.id).branch, undefined);
  assert.equal(result.send[0].to, `${instanceTag(none.id)}-developer`);
  assert.match(result.send[0].message, /^phase: 1$/m);
});

test("with no ticket source y, yes, ok and a are refused and record no branch (T-6.8)", async (t) => {
  const { root, id } = worktreeItem(t);
  for (const word of ["y", "yes", "ok", "a", "OK"]) assert.match(await refused(root, id, word), /matches no option at create_worktrees/, word);
  assert.equal(readState(root, id).branch, undefined);
  assert.match(await refused(root, id, "bad..name"), /"bad\.\.name" is not a valid branch name/);
  for (const word of ["approve", "Go", "continue", "x", "r"]) assert.match(await refused(root, id, word), /matches no option at create_worktrees/, `a gate word is not a branch: ${word}`);
  assert.equal(readState(root, id).branch, undefined);
});

test("p on a research item whose title gives no file name is refused saying why publish is not offered", async (t) => {
  const { root, id } = researchItem(t, "Of the");
  assert.equal(await refused(root, id, "p"), `publish is not offered: the title "Of the" gives no file name; rename the item with picket set ${id} --title, then reply p`);
  assert.equal(existsSync(join(root, "artifacts")), false);
});
