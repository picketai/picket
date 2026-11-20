import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { recordStack } from "../../shared/env/stacks.mts";
import { itemKey, stackName } from "../../shared/env/standard.mts";
import type { HttpAdapter } from "../../shared/scenarios/http.mts";
import type { CaseDeps } from "../../shared/testing/cases.mts";
import { readTestRows, type CaseRow } from "../../shared/testing/results.mts";
import { appendVerdict } from "../../shared/work/verdict-log.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { recordCase, verb as caseVerb, type CaseInput } from "./case.mts";
import { rerunCases, verb as rerunVerb } from "./rerun.mts";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordDefect } from "./defect.mts";
import { appendReply } from "../../shared/work/replies.mts";
import type { DefectRow } from "../../shared/testing/results.mts";

const MODEL = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const VALUE_FLAGS = ["-p", "--project-directory", "-f", "--profile"];
const STEPS = "request GET {orders}/orders/PKT-{run}\nexpect status 201\n";
const NOW = "2026-11-17T10:00:00.000Z";

function design(criteria: string[]): string {
  const checks = criteria.flatMap((covers, at) => [`      - covers: ${covers}`, "        method: GET", `        path: /orders/${at}`, "        status: 201"]);
  const lines = criteria.map((covers) => `- **${covers}** an order is read back`);
  return ["---", "lane: design", "phases:", "  - n: 1", "    files: [services/orders/routes.mjs]", "    drive:", ...checks, "---", "# D", "", "## Phase 1: Orders", "", ...lines, ""].join("\n");
}

const engine: EngineRunner = (_program, args) => {
  const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
  const call = words.join(" ");
  if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
  if (call === "compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
  if (call === "compose config --profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
  if (words[1] === "config") return { status: 0, stdout: MODEL, stderr: "" };
  if (words[1] === "port") return { status: 0, stdout: "0.0.0.0:49153\n", stderr: "" };
  return { status: 0, stdout: "", stderr: "" };
};

function answering(status: number, text = ""): HttpAdapter {
  return async () => ({ status, headers: {}, text, error: null });
}

function deps(adapter: HttpAdapter): CaseDeps {
  let next = 0;
  return { runner: engine, adapter, sleep: async () => {}, random: () => new Uint8Array([next++, 1]) };
}

function item(t: TestContext, { criteria = ["T-1.1"], stack = true }: { criteria?: string[]; stack?: boolean } = {}): { ctx: Context; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", design(criteria));
  if (stack) recordStack(root, stackName(itemKey(readState(root, id))), { item: id, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: NOW });
  const ctx: Context = { root, cwd: root, now: () => new Date(NOW), env: { PATH: process.env.PATH ?? "" }, home: root, session: null, platform: process.platform };
  return { ctx, id };
}

function caseInput(id: WorkId, criterion = "T-1.1", steps = STEPS, kind: CaseInput["spec"]["kind"] = "normal"): CaseInput {
  return { id, spec: { criterion, kind, intent: "an order is read back" }, steps };
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Refused) return error.message;
    throw error;
  }
  return assert.fail("the call was not refused");
}

test("test case records the run with its stdin steps and the stack's mocks (T-3.3)", async (t) => {
  const { ctx, id } = item(t);
  const outcome = await recordCase(ctx, deps(answering(201)), caseInput(id));
  assert.ok(outcome.status === "done");
  const [row] = readTestRows(ctx.root, id) as CaseRow[];
  assert.deepEqual(row, { ts: NOW, round: 1, type: "case", case: "C-01", criterion: "T-1.1", kind: "normal", intent: "an order is read back", steps: STEPS, outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: ["payments-mock"], gaps: [] });
  assert.equal(caseVerb.render(outcome.value), "C-01 T-1.1 normal passed · through a mock: payments-mock");
});

test("test case refuses without a recorded stack, naming env start (T-3.4)", async (t) => {
  const { ctx, id } = item(t, { stack: false });
  assert.equal(await refusal(recordCase(ctx, deps(answering(201)), caseInput(id))), `no stack for ${id}: run picket env start ${id}`);
});

test("test case refuses a criterion outside the tested list (T-3.4)", async (t) => {
  const { ctx, id } = item(t);
  assert.equal(await refusal(recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.9"))), "T-1.9 is not a tested criterion; the tested criteria are T-1.1");
});

test("with one tested criterion the seventh case of a round is refused with the cap text (T-3.4)", async (t) => {
  const { ctx, id } = item(t);
  for (let run = 0; run < 6; run++) assert.equal((await recordCase(ctx, deps(answering(201)), caseInput(id))).status, "done");
  const message = await refusal(recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.1", STEPS, "state")));
  assert.equal(message, `the cap of 6 cases this round is reached; record what is left with picket test note ${id} T-1.1 state not-covered --why "<why>"`);
  assert.equal(readTestRows(ctx.root, id).length, 6);
});

test("test case refuses a card that breaks a scenario rule, listing the problem", async (t) => {
  const { ctx, id } = item(t);
  const message = await refusal(recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.1", "request GET https://orders.example.com/x\nexpect status 200\n")));
  assert.match(message, /^the case does not run: rule 1: /);
});

test("test case parses its flags and reads the steps from stdin", () => {
  const input = caseVerb.parse(parseArgs(["20261117-orders", "--criterion", "T-1.1", "--kind", "boundary", "--intent", "edge"], () => STEPS));
  assert.deepEqual(input, { id: "20261117-orders", spec: { criterion: "T-1.1", kind: "boundary", intent: "edge" }, steps: STEPS });
  assert.throws(() => caseVerb.parse(parseArgs(["20261117-orders", "--criterion", "T-1.1", "--kind", "smoke", "--intent", "x"], () => STEPS)), /--kind must be one of/);
  assert.throws(() => caseVerb.parse(parseArgs(["20261117-orders", "--criterion", "T-1.1", "--kind", "normal", "--intent", "x"])), /reads its step lines on stdin/);
});

test("test case refuses an intent the shell split into words and keeps a quoted intent whole", () => {
  const argv = ["20261117-orders", "--criterion", "T-1.1", "--kind", "boundary", "--intent"];
  assert.throws(() => caseVerb.parse(parseArgs([...argv, "an", "empty", "basket"], () => STEPS)), (error) => error instanceof UsageError && error.message === caseVerb.usage);
  assert.deepEqual(caseVerb.parse(parseArgs([...argv, "an empty basket"], () => STEPS)), { id: "20261117-orders", spec: { criterion: "T-1.1", kind: "boundary", intent: "an empty basket" }, steps: STEPS });
});

test("test rerun runs the previous round's cases again under the same ids (T-3.5)", async (t) => {
  const { ctx, id } = item(t);
  await recordCase(ctx, deps(answering(201)), caseInput(id));
  await recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.1", STEPS, "boundary"));
  appendVerdict(ctx.root, id, { agent: "tester", verdict: "CHANGES REQUIRED", phase: null, scope: "test", through: null }, new Date(NOW));
  const outcome = await rerunCases(ctx, deps(answering(500)), { id });
  assert.ok(outcome.status === "done");
  const rerun = (readTestRows(ctx.root, id) as CaseRow[]).filter((row) => row.round === 2);
  assert.deepEqual(rerun.map((row) => [row.case, row.kind, row.steps, row.outcome]), [["C-01", "normal", STEPS, "failed"], ["C-02", "boundary", STEPS, "failed"]]);
});

test("test rerun in round 1 has no earlier cases (T-3.5)", async (t) => {
  const { ctx, id } = item(t);
  const outcome = await rerunCases(ctx, deps(answering(201)), { id });
  assert.ok(outcome.status === "done");
  assert.equal(rerunVerb.render(outcome.value), "round 1 has no earlier cases");
  assert.deepEqual(readTestRows(ctx.root, id), []);
});

const REFUSED_ORDER = 'request POST {orders}/orders\n  body {"reference": "PKT-{run}", "quantity": -1}\nexpect status 400\n';
const DEFECT_INTENT = "an order with a negative quantity is refused";
const DEFECT_EVIDENCE = "POST /orders with quantity -1 answered 201";
const MOCK = "---\nreplaces: payments-api\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\nwhen GET /charges/*\n  status 200\n";
const RECEIVED = "/__picket/received";

function withTraffic(status: number, traffic: unknown[][]): HttpAdapter {
  return async (request) => (request.url.endsWith(RECEIVED) ? { status: 200, headers: {}, text: JSON.stringify(traffic.shift() ?? []), error: null } : { status, headers: {}, text: "", error: null });
}

async function withDefect(t: TestContext): Promise<{ ctx: Context; id: WorkId }> {
  const made = item(t);
  const recorded = await recordDefect(made.ctx, deps(answering(201)), { id: made.id, kind: "negative", intent: DEFECT_INTENT, evidence: DEFECT_EVIDENCE, steps: REFUSED_ORDER });
  assert.ok(recorded.status === "done");
  return made;
}

function closeRound(ctx: Context, id: WorkId): void {
  appendVerdict(ctx.root, id, { agent: "tester", verdict: "CHANGES REQUIRED", phase: null, scope: "test", through: null }, new Date(NOW));
}

function defectsOf(ctx: Context, id: WorkId, round: number): DefectRow[] {
  return readTestRows(ctx.root, id).filter((row): row is DefectRow => row.type === "defect" && row.round === round);
}

test("test rerun runs a recorded defect again under its id and records the pass on a defect row (T-1.1)", async (t) => {
  const { ctx, id } = await withDefect(t);
  closeRound(ctx, id);
  const outcome = await rerunCases(ctx, deps(answering(400)), { id });
  assert.ok(outcome.status === "done");
  assert.deepEqual(defectsOf(ctx, id, 2), [
    { ts: NOW, round: 2, type: "defect", found: "K-01", kind: "negative", intent: DEFECT_INTENT, steps: REFUSED_ORDER, evidence: DEFECT_EVIDENCE, outcome: "passed", detail: "", attempts: 1, mocks: ["payments-mock"] },
  ]);
  assert.deepEqual(outcome.value.defects, defectsOf(ctx, id, 2));
  assert.equal(rerunVerb.render(outcome.value), "K-01 negative passed");
});

test("test rerun of a defect the stack still has records the failure with its detail (T-1.2)", async (t) => {
  const { ctx, id } = await withDefect(t);
  closeRound(ctx, id);
  const outcome = await rerunCases(ctx, deps(answering(201)), { id });
  assert.ok(outcome.status === "done");
  assert.deepEqual(defectsOf(ctx, id, 2).map((row) => [row.found, row.outcome, row.detail, row.attempts]), [["K-01", "failed", "step 2: expected status 400, got 201", 2]]);
  assert.equal(rerunVerb.render(outcome.value), "K-01 negative failed: step 2: expected status 400, got 201");
});

test("test rerun in round 3 runs a defect rerun in round 2 once more, from its newest row (T-1.3)", async (t) => {
  const { ctx, id } = await withDefect(t);
  closeRound(ctx, id);
  await rerunCases(ctx, deps(answering(201)), { id });
  closeRound(ctx, id);
  const outcome = await rerunCases(ctx, deps(answering(400)), { id });
  assert.ok(outcome.status === "done");
  assert.deepEqual(defectsOf(ctx, id, 3).map((row) => [row.found, row.outcome]), [["K-01", "passed"]]);
  assert.equal(readTestRows(ctx.root, id).length, 3);
});

test("test rerun of a defect whose run meets a mock gap records it blocked with the gap (T-1.4)", async (t) => {
  const { ctx, id } = await withDefect(t);
  closeRound(ctx, id);
  mkdirSync(join(ctx.root, ".picket", "env", "mocks"), { recursive: true });
  writeFileSync(join(ctx.root, ".picket", "env", "mocks", "payments-mock.md"), MOCK);
  const traffic = [[], [{ method: "POST", path: "/refunds", answered: false }]];
  const outcome = await rerunCases(ctx, deps(withTraffic(201, traffic)), { id });
  assert.ok(outcome.status === "done");
  assert.deepEqual(defectsOf(ctx, id, 2).map((row) => [row.found, row.outcome, row.detail]), [["K-01", "blocked", "payments-mock has no answer for POST /refunds"]]);
  assert.equal(rerunVerb.render(outcome.value), "K-01 negative blocked: payments-mock has no answer for POST /refunds");
});

test("a failing case holds no test-user value and no answer text in its row or output (T-3.6)", async (t) => {
  const { ctx, id } = item(t);
  const secretCtx = { ...ctx, env: { ...ctx.env, PICKET_USER_BUYER_PASSWORD: "fixture-secret-9" } };
  const steps = "request GET {orders}/orders/PKT-{run}\n  header authorization: {user:buyer.password}\nexpect status 201\nexpect contains \"accepted\"\n";
  const outcome = await recordCase(secretCtx, deps(answering(500, "fixture-answer-9")), caseInput(id, "T-1.1", steps));
  assert.ok(outcome.status === "done");
  assert.equal(outcome.value.row.outcome, "failed");
  const written = readFileSync(resolve(ctx.root, "work", id, "test", "results.jsonl"), "utf8");
  const printed = caseVerb.render(outcome.value);
  for (const text of [written, printed]) {
    assert.ok(!text.includes("fixture-secret-9"), text);
    assert.ok(!text.includes("fixture-answer-9"), text);
  }
});

const FOUR = ["T-1.1", "T-1.2", "T-1.3", "T-1.4"];

function withUserCap(t: TestContext, cases: number): { ctx: Context; id: WorkId } {
  const made = item(t, { criteria: FOUR });
  appendReply(made.ctx.root, made.id, { action: "set_case_cap", phase: null, reply: String(cases), cases, default_cases: 24 }, new Date(NOW));
  return made;
}

async function recordMany(ctx: Context, id: WorkId, count: number): Promise<void> {
  for (let run = 0; run < count; run++) assert.equal((await recordCase(ctx, deps(answering(201)), caseInput(id, FOUR[run % FOUR.length]))).status, "done");
}

test("a total of 12 set by the user refuses the 13th case of the round (T-1.4)", async (t) => {
  const { ctx, id } = withUserCap(t, 12);
  await recordMany(ctx, id, 12);
  const message = await refusal(recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.2", STEPS, "state")));
  assert.equal(message, `the cap of 12 cases this round is reached; record what is left with picket test note ${id} T-1.2 state not-covered --why "<why>"`);
  assert.equal(readTestRows(ctx.root, id).length, 12);
});

test("a total of 30 set by the user records a 25th case of the round (T-1.5)", async (t) => {
  const { ctx, id } = withUserCap(t, 30);
  await recordMany(ctx, id, 24);
  const outcome = await recordCase(ctx, deps(answering(201)), caseInput(id, "T-1.1", STEPS, "state"));
  assert.equal(outcome.status, "done");
  assert.equal(readTestRows(ctx.root, id).length, 25);
});
