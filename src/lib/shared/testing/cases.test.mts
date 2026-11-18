import { test } from "node:test";
import assert from "node:assert/strict";
import type { HttpAdapter } from "../scenarios/http.mts";
import { scenarioProblems } from "../scenarios/rules.mts";
import { caseCard, caseLine, runCase, type RunCaseInput } from "./cases.mts";

const ITEM = "20261117-orders";
const SPEC = { criterion: "T-2.1", kind: "boundary" as const, intent: "an order id at the edge: answers 200" };

function cardOf(steps: string) {
  const built = caseCard(ITEM, SPEC, steps);
  assert.ok("card" in built, JSON.stringify(built));
  return built.card;
}

function answers(...statuses: number[]): HttpAdapter {
  let call = 0;
  return async () => ({ status: statuses[Math.min(call++, statuses.length - 1)], headers: {}, text: "", error: null });
}

function input(adapter: HttpAdapter): RunCaseInput {
  let key = 0;
  return { services: ["orders"], urls: { orders: "http://127.0.0.1:49153" }, adapter, env: {}, today: "2026-11-17", newRunKey: () => `k${key++}`, timeoutMs: 1000, sleep: async () => {}, stubs: {}, ownMocks: [] };
}

test("a case card covers the item's criterion and passes the scenario rules (T-3.1)", () => {
  const card = cardOf("request GET {orders}/orders/PKT-{run}\nexpect status 200\n");
  assert.deepEqual(card.header.covers, [`${ITEM}/T-2.1`]);
  assert.equal(card.header.kind, "boundary");
  assert.equal(card.header.intent, SPEC.intent);
  assert.equal(card.steps.length, 2);
  assert.deepEqual(scenarioProblems(card, ["orders"]), []);
});

test("a case sending outside the environment breaks rule 1 (T-3.1)", () => {
  const [problem] = scenarioProblems(cardOf("request GET https://orders.example.com/x\nexpect status 200\n"), ["orders"]);
  assert.match(problem, /^rule 1: /);
});

test("step lines outside the grammar give the parser's problems, not a card", () => {
  const built = caseCard(ITEM, SPEC, "fetch GET {orders}/x\n");
  assert.ok("problems" in built);
  assert.ok(built.problems.length > 0);
});

test("a case failing twice is a confirmed failure in two attempts (T-3.2)", async () => {
  const run = await runCase(cardOf("request GET {orders}/orders\nexpect status 200\n"), input(answers(500, 500)));
  assert.deepEqual(run, { outcome: "failed", attempts: 2, unstable: false, detail: "step 2: expected status 200, got 500", mocks: [], gaps: [] });
});

test("a case failing then passing is unstable (T-3.2)", async () => {
  const run = await runCase(cardOf("request GET {orders}/orders\nexpect status 200\n"), input(answers(500, 200)));
  assert.equal(run.outcome, "passed");
  assert.equal(run.attempts, 2);
  assert.equal(run.unstable, true);
});

test("the case line names the mock and the classify command for a failure", () => {
  const row = { case: "C-04", criterion: "T-2.1", kind: "boundary" as const, outcome: "failed" as const, detail: "step 2: expected status 200, got 500", mocks: ["payments-mock"] };
  assert.equal(caseLine(ITEM, row), `C-04 T-2.1 boundary failed: step 2: expected status 200, got 500 · through a mock: payments-mock\nclassify it: picket test classify ${ITEM} C-04 <product|test|environment> --evidence "<why>"`);
  assert.equal(caseLine(ITEM, { ...row, outcome: "passed", detail: "", mocks: [] }), "C-04 T-2.1 boundary passed");
});

test("each gap ends the case line after the mock part (T-3.2)", () => {
  const row = { case: "C-05", criterion: "T-2.1", kind: "normal" as const, outcome: "failed" as const, detail: "step 2: expected status 201, got 502", mocks: ["payments-mock"], gaps: ["payments-mock has no answer for POST /refunds"] };
  assert.equal(caseLine(ITEM, row).split("\n")[0], "C-05 T-2.1 normal failed: step 2: expected status 201, got 502 · through a mock: payments-mock · gap: payments-mock has no answer for POST /refunds");
});

test("a run that read a stub's traffic carries its mocks and gaps into the case run (T-3.2)", async () => {
  const reads: unknown[][] = [[], [{ method: "POST", path: "/refunds", answered: false }]];
  const adapter: HttpAdapter = async (request) =>
    request.url.endsWith("/__picket/received") ? { status: 200, headers: {}, text: JSON.stringify(reads.shift() ?? []), error: null } : { status: 200, headers: {}, text: "", error: null };
  const run = await runCase(cardOf("request GET {orders}/orders\nexpect status 200\n"), { ...input(adapter), stubs: { "payments-mock": "http://payments-mock.stub" }, ownMocks: ["ledger-mock"] });
  assert.deepEqual(run, { outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: ["payments-mock", "ledger-mock"], gaps: ["payments-mock has no answer for POST /refunds"] });
});
