import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScenario, type Card } from "./format.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "./http.mts";
import { runScenario, type RunInput } from "./runner.mts";

const HEADER = ["---", "id: S-0002", "kind: normal", "covers: []", "intent: orders", "format: 1", "---"];
const EXAMPLE = [
  "request POST {orders}/orders",
  "  header content-type: application/json",
  '  body {"sku":"PKT-{run}-1","due":"{date:+7d}"}',
  "expect status 201",
  "capture order_id json id",
  "request GET {orders}/orders/{order_id}",
  'expect contains "PKT-"',
];
const URLS = { orders: "http://127.0.0.1:49153" };

function card(steps: string[]): Card {
  const parsed = parseScenario([...HEADER, ...steps, ""].join("\n")).card;
  assert.ok(parsed);
  return parsed;
}

function answer(status: number | null, text = "", headers: Record<string, string> = {}, error: string | null = null): HttpAnswer {
  return { status, headers, text, error };
}

function scripted(answers: HttpAnswer[]): { adapter: HttpAdapter; seen: HttpRequest[] } {
  const seen: HttpRequest[] = [];
  const adapter: HttpAdapter = async (request) => {
    seen.push(request);
    return answers[seen.length - 1] ?? answer(null, "", {}, "no scripted answer");
  };
  return { adapter, seen };
}

function input(steps: string[], adapter: HttpAdapter, overrides: Partial<RunInput> = {}): RunInput {
  return { card: card(steps), urls: URLS, adapter, env: {}, today: "2026-11-15", runKey: "7f3a", data: {}, timeoutMs: 20000, sleep: async () => {}, ...overrides };
}

test("the example card passes, sending the resolved body and the captured id (T-2.3)", async () => {
  const { adapter, seen } = scripted([answer(201, '{"id":"PKT-7f3a-1"}'), answer(200, '{"id":"PKT-7f3a-1"}')]);
  assert.deepEqual(await runScenario(input(EXAMPLE, adapter)), { outcome: "passed", step: null, detail: "", captures: { order_id: "PKT-7f3a-1" } });
  assert.deepEqual(seen, [
    { method: "POST", url: "http://127.0.0.1:49153/orders", headers: { "content-type": "application/json" }, body: '{"sku":"PKT-7f3a-1","due":"2026-11-22"}', timeoutMs: 20000 },
    { method: "GET", url: "http://127.0.0.1:49153/orders/PKT-7f3a-1", headers: {}, body: null, timeoutMs: 20000 },
  ]);
});

test("a wrong status fails at its step and sends nothing after it (T-2.4)", async () => {
  const { adapter, seen } = scripted([answer(500, "boom")]);
  assert.deepEqual(await runScenario(input(EXAMPLE, adapter)), { outcome: "failed", step: 2, detail: "step 2: expected status 201, got 500", captures: {} });
  assert.equal(seen.length, 1);
});

test("an unanswered request and a service with no URL are blocked (T-2.4)", async () => {
  const { adapter } = scripted([answer(null, "", {}, "ECONNREFUSED")]);
  assert.deepEqual(await runScenario(input(EXAMPLE, adapter)), { outcome: "blocked", step: 1, detail: "step 1: {orders} did not answer: ECONNREFUSED", captures: {} });
  const none = scripted([]);
  assert.deepEqual(await runScenario(input(EXAMPLE, none.adapter, { urls: {} })), { outcome: "blocked", step: 1, detail: "step 1: {orders} has no published port", captures: {} });
  assert.equal(none.seen.length, 0);
});

test("a missing contains fails with the template text, and the outcome holds no secret or answer text (T-2.5)", async () => {
  const steps = ["request POST {orders}/login", '  body {"password":"{user:admin.password}"}', 'expect contains "PKT-{run}"'];
  const { adapter, seen } = scripted([answer(200, "fixture-answer-9")]);
  const outcome = await runScenario(input(steps, adapter, { env: { PICKET_USER_ADMIN_PASSWORD: "fixture-secret-9" } }));
  assert.deepEqual(outcome, { outcome: "failed", step: 2, detail: 'step 2: "PKT-{run}" not in the answer', captures: {} });
  assert.equal(seen[0].body, '{"password":"fixture-secret-9"}');
  const text = JSON.stringify(outcome);
  assert.ok(!text.includes("fixture-secret-9") && !text.includes("fixture-answer-9"), text);
});

test("an unset test user blocks before any request, naming the variable", async () => {
  const steps = ["request POST {orders}/login", '  body {"password":"{user:admin.password}"}'];
  const { adapter, seen } = scripted([]);
  assert.deepEqual(await runScenario(input(steps, adapter)), { outcome: "blocked", step: 1, detail: "step 1: test user admin has no PICKET_USER_ADMIN_PASSWORD", captures: {} });
  assert.equal(seen.length, 0);
});

test("a capture reads a dotted JSON path or a header in any case, and a missing one fails", async () => {
  const steps = ["request GET {orders}/orders", "capture first json items.0.id", "capture tag header etag", "request GET {orders}/orders/{first}", "  header If-None-Match: {tag}"];
  const { adapter, seen } = scripted([answer(200, '{"items":[{"id":7}]}', { ETag: "v1" }), answer(200)]);
  assert.equal((await runScenario(input(steps, adapter))).outcome, "passed");
  assert.deepEqual([seen[1].url, seen[1].headers], ["http://127.0.0.1:49153/orders/7", { "If-None-Match": "v1" }]);
  const missing = scripted([answer(201, '{"number":"PKT-1"}')]);
  assert.deepEqual(await runScenario(input(EXAMPLE, missing.adapter)), { outcome: "failed", step: 3, detail: "step 3: capture order_id: no id in the answer", captures: {} });
  const notJson = scripted([answer(200, "plain")]);
  assert.deepEqual(await runScenario(input(["request GET {orders}/x", "capture tag header ETag"], notJson.adapter)), { outcome: "failed", step: 2, detail: "step 2: capture tag: no ETag in the answer", captures: {} });
});

test("catalog data fills the card and the run hands back what it captured", async () => {
  const { adapter, seen } = scripted([answer(200, '{"order":"PKT-7f3a-9"}')]);
  const outcome = await runScenario(input(["request GET {orders}/customers/{data:customer.id}", "capture order json order"], adapter, { data: { "customer.id": "c-41" } }));
  assert.deepEqual(outcome, { outcome: "passed", step: null, detail: "", captures: { order: "PKT-7f3a-9" } });
  assert.equal(seen[0].url, "http://127.0.0.1:49153/customers/c-41");
});

test("a wait sleeps its seconds through the injected sleep", async () => {
  const slept: number[] = [];
  const { adapter } = scripted([answer(200)]);
  const outcome = await runScenario(input(["request GET {orders}/x", "wait 3s", "expect status 200"], adapter, { sleep: async (ms) => void slept.push(ms) }));
  assert.equal(outcome.outcome, "passed");
  assert.deepEqual(slept, [3000]);
});
