import { test } from "node:test";
import assert from "node:assert/strict";
import type { SavedScenario } from "./files.mts";
import { fingerprintOf, parseScenario, writeScenario } from "./format.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "./http.mts";
import type { ContentKey } from "./keys.mts";
import { affected, replayScenarios, type ReplayInput } from "./replay.mts";

function saved(id: string, steps: string[], { status = "active", byHand = false }: { status?: string; byHand?: boolean } = {}): SavedScenario {
  const text = ["---", `id: ${id}`, "kind: normal", "covers: []", "intent: replay", `status: ${status}`, "format: 1", "---", ...steps, ""].join("\n");
  const { card, problems } = parseScenario(text);
  assert.deepEqual(problems, []);
  assert.ok(card);
  const written = writeScenario(card);
  return { path: `.picket/env/scenarios/${id}.md`, id, card, problems: [], fingerprint: fingerprintOf(written), byHand };
}

const POST = ["request POST {orders}/orders", '  body {"sku":"PKT-{run}-1"}', "expect status 201"];

function scripted(statuses: number[]): { adapter: HttpAdapter; seen: HttpRequest[] } {
  const seen: HttpRequest[] = [];
  const adapter: HttpAdapter = async (request): Promise<HttpAnswer> => {
    seen.push(request);
    return { status: statuses[seen.length - 1] ?? 599, headers: {}, text: "", error: null };
  };
  return { adapter, seen };
}

function input(scenarios: SavedScenario[], adapter: HttpAdapter): ReplayInput {
  const keys = ["aaaa", "bbbb", "cccc", "dddd"];
  return { scenarios, services: ["orders", "billing"], urls: { orders: "http://127.0.0.1:49153" }, adapter, env: {}, today: "2026-11-15", newRunKey: () => keys.shift() ?? "ffff", timeoutMs: 20000, sleep: async () => {} };
}

test("a card failing twice is a confirmed failure with two attempts on different run keys (T-4.1)", async () => {
  const { adapter, seen } = scripted([500, 500]);
  const [run] = await replayScenarios(input([saved("S-0002", POST)], adapter));
  assert.deepEqual(run, {
    id: "S-0002",
    fingerprint: saved("S-0002", POST).fingerprint,
    outcome: "failed",
    attempts: ["failed", "failed"],
    unstable: false,
    byHand: false,
    detail: "step 2: expected status 201, got 500",
  });
  assert.deepEqual(seen.map((request) => request.body), ['{"sku":"PKT-aaaa-1"}', '{"sku":"PKT-bbbb-1"}']);
});

test("failing then passing is unstable; a pass makes one attempt (T-4.1)", async () => {
  const flaky = scripted([500, 201]);
  const [unstable] = await replayScenarios(input([saved("S-0002", POST)], flaky.adapter));
  assert.deepEqual([unstable.outcome, unstable.attempts, unstable.unstable, unstable.detail], ["passed", ["failed", "passed"], true, "step 2: expected status 201, got 500"]);
  const steady = scripted([201]);
  const [passed] = await replayScenarios(input([saved("S-0002", POST)], steady.adapter));
  assert.deepEqual([passed.outcome, passed.attempts, passed.unstable, passed.detail], ["passed", ["passed"], false, ""]);
  assert.equal(steady.seen.length, 1);
});

test("a blocked first attempt is not run again", async () => {
  const { adapter, seen } = scripted([]);
  const [run] = await replayScenarios({ ...input([saved("S-0002", POST)], adapter), urls: {} });
  assert.deepEqual([run.outcome, run.attempts, run.detail], ["blocked", ["blocked"], "step 1: {orders} has no published port"]);
  assert.equal(seen.length, 0);
});

test("a deprecated card is not run, and a card breaking rule 1 is blocked with no call (T-4.2)", async () => {
  const { adapter, seen } = scripted([201, 201]);
  const runs = await replayScenarios(input([saved("S-0001", POST, { status: "deprecated" }), saved("S-0003", ["request GET {stock}/health"])], adapter));
  assert.deepEqual(runs.map(({ id, outcome, attempts, detail }) => ({ id, outcome, attempts, detail })), [
    { id: "S-0003", outcome: "blocked", attempts: [], detail: "rule 1: step 1 names {stock}, which is no service of the environment" },
  ]);
  assert.equal(seen.length, 0);
});

test("a card with parse problems is blocked with its first problem", async () => {
  const { adapter } = scripted([]);
  const broken: SavedScenario = { path: ".picket/env/scenarios/S-0004.md", id: "S-0004", card: null, problems: ['step 1: unknown step word "click"'], fingerprint: "sha256:x", byHand: true };
  const [run] = await replayScenarios(input([broken], adapter));
  assert.deepEqual([run.outcome, run.detail, run.byHand], ["blocked", 'step 1: unknown step word "click"', true]);
});

test("a hand-changed card is run and returned as changed by hand (T-4.3)", async () => {
  const { adapter } = scripted([201]);
  const [run] = await replayScenarios(input([saved("S-0002", POST, { byHand: true })], adapter));
  assert.deepEqual([run.outcome, run.byHand], ["passed", true]);
});

test("affected keeps the cards naming a changed app, or all when the environment changed (T-4.4)", () => {
  const orders = saved("S-0001", ["request GET {orders}/health"]);
  const billing = saved("S-0002", ["request GET {billing}/health"]);
  const base: ContentKey = { env: "e1", apps: { orders: "t1", billing: "t2" } };
  const ordersChanged: ContentKey = { env: "e1", apps: { orders: "t9", billing: "t2" } };
  assert.deepEqual(affected([orders, billing], ordersChanged, base), [orders]);
  assert.deepEqual(affected([orders, billing], { ...ordersChanged, env: "e2" }, base), [orders, billing]);
  assert.deepEqual(affected([orders, billing], base, base), []);
});

test("affected keeps every card that does not parse, whether or not a key changed", () => {
  const orders = saved("S-0001", ["request GET {orders}/health"]);
  const broken: SavedScenario = { path: ".picket/env/scenarios/S-0002.md", id: "S-0002", card: null, problems: ["header: a card starts with a --- header block"], fingerprint: "sha256:x", byHand: true };
  const base: ContentKey = { env: "e1", apps: { orders: "t1" } };
  assert.deepEqual(affected([orders, broken], base, base), [broken]);
  assert.deepEqual(affected([orders, broken], { ...base, env: "e2" }, base), [orders, broken]);
});
