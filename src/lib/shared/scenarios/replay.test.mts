import { test } from "node:test";
import assert from "node:assert/strict";
import type { SavedScenario } from "./files.mts";
import { fingerprintOf, parseScenario, writeScenario } from "./format.mts";
import { noBrowser, type BrowserAdapter, type BrowserCommand } from "./browser.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "./http.mts";
import type { ContentKey } from "./keys.mts";
import { affected, replayScenarios, type ReplayInput } from "./replay.mts";
import { parseEntry, type CatalogEntry } from "../catalog/entry.mts";

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
  return { scenarios, services: ["orders", "billing"], urls: { orders: "http://127.0.0.1:49153" }, adapter, browser: noBrowser, pages: {}, env: {}, today: "2026-11-15", newRunKey: () => keys.shift() ?? "ffff", timeoutMs: 20000, sleep: async () => {}, stubs: {}, ownMocks: [], catalog: [] };
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
    mocks: [],
    gaps: [],
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

type Entry = { method: string; path: string; answered: boolean };

function withStubs(statuses: number[], logs: Record<string, (Entry[] | null)[]>): HttpAdapter {
  const reads: Record<string, number> = {};
  const app = scripted(statuses).adapter;
  return async (request) => {
    const stub = Object.keys(logs).find((service) => request.url === `http://${service}.stub/__picket/received`);
    if (stub === undefined) return app(request);
    const at = reads[stub] ?? 0;
    reads[stub] = at + 1;
    const log = logs[stub][Math.min(at, logs[stub].length - 1)];
    return log === null ? { status: null, headers: {}, text: "", error: "ECONNREFUSED" } : { status: 200, headers: {}, text: JSON.stringify(log), error: null };
  };
}

const CHARGE: Entry = { method: "POST", path: "/charges", answered: true };
const REFUND: Entry = { method: "POST", path: "/refunds", answered: false };

test("a run lists the stubs whose log grew and every project-owned mock; a blocked run lists none (T-3.1)", async () => {
  const adapter = withStubs([201], { "payments-mock": [[CHARGE], [CHARGE, CHARGE]], "fraud-mock": [[CHARGE], [CHARGE]] });
  const stubs = { "payments-mock": "http://payments-mock.stub", "fraud-mock": "http://fraud-mock.stub" };
  const runs = await replayScenarios({ ...input([saved("S-0002", POST), saved("S-0003", ["request GET {stock}/health"])], adapter), stubs, ownMocks: ["ledger-mock"] });
  assert.deepEqual(runs.map(({ id, outcome, mocks, gaps }) => ({ id, outcome, mocks, gaps })), [
    { id: "S-0002", outcome: "passed", mocks: ["payments-mock", "ledger-mock"], gaps: [] },
    { id: "S-0003", outcome: "blocked", mocks: [], gaps: [] },
  ]);
});

test("an unanswered request during the run is a gap on the run (T-3.2)", async () => {
  const adapter = withStubs([201], { "payments-mock": [[], [CHARGE, REFUND]] });
  const [run] = await replayScenarios({ ...input([saved("S-0002", POST)], adapter), stubs: { "payments-mock": "http://payments-mock.stub" } });
  assert.deepEqual([run.mocks, run.gaps], [["payments-mock"], ["payments-mock has no answer for POST /refunds"]]);
});

test("a failed first log read counts none of that stub's traffic, leaving only the project-owned mocks (T-2.4)", async () => {
  const adapter = withStubs([201], { "payments-mock": [null, [REFUND]] });
  const [run] = await replayScenarios({ ...input([saved("S-0002", POST)], adapter), stubs: { "payments-mock": "http://payments-mock.stub" }, ownMocks: ["ledger-mock"] });
  assert.deepEqual([run.outcome, run.mocks, run.gaps], ["passed", ["ledger-mock"], []]);
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

const ENTRY_HEADS: Record<string, string> = {
  "open-order": "kind: find\nneed: an open order",
  "demo-tenant": "kind: fixed\nneed: the demo tenant\nhow: made by hand",
  "busy-customer": "kind: sql\nneed: a busy customer\nfile: data/busy.sql\nservice: orders-sql",
};

function catalogEntry(name: string, text: string): CatalogEntry {
  const read = parseEntry(text, name);
  assert.ok(read.entry, read.problems.join("; "));
  return read.entry;
}

test("a failing entry blocks the scenario with its kind's text and never fails it (T-6.2)", async () => {
  const cases: [string, string, string][] = [
    ["open-order", `---\n${ENTRY_HEADS["open-order"]}\nformat: 1\n---\nrequest GET {orders}/orders\nexpect status 200\ncapture id json 0.id\n`, "no matching data: open-order"],
    ["demo-tenant", `---\n${ENTRY_HEADS["demo-tenant"]}\nformat: 1\n---\nrequest GET {orders}/tenants/demo\nexpect status 200\ncapture id json id\n`, "data drift: demo-tenant is missing"],
    ["busy-customer", `---\n${ENTRY_HEADS["busy-customer"]}\nformat: 1\n---\nrequest GET {orders}/customers\nexpect status 200\ncapture id json 0.id\n`, "no matching data: busy-customer; its SQL file runs with picket data run"],
    ["customer", '---\nkind: create\nneed: a customer\nformat: 1\n---\nrequest POST {orders}/customers\n  body {"n":"PKT-{run}"}\nexpect status 201\ncapture id json id\n', "could not create data: customer"],
  ];
  for (const [name, text, detail] of cases) {
    const { adapter } = scripted([404, 404]);
    const [run] = await replayScenarios({ ...input([saved("S-0002", [`request GET {orders}/x/{data:${name}.id}`, "expect status 200"])], adapter), catalog: [catalogEntry(name, text)] });
    assert.deepEqual([run.outcome, run.detail, run.attempts], ["blocked", detail, ["blocked"]], name);
  }
});

test("an entry runs once per attempt, before the scenario, whose PUT goes to the captured id (T-6.1, T-6.3)", async () => {
  const { adapter, seen } = scripted([201, 500, 201, 500]);
  const entryText = '---\nkind: create\nneed: a customer\nformat: 1\n---\nrequest POST {orders}/customers\n  body {"n":"PKT-{run}"}\ncapture id header location\n';
  const steps = ["request PUT {orders}/customers/{data:customer.id}", '  body {"again":"{data:customer.id}"}', "expect status 200"];
  const answers: HttpAdapter = async (request) => {
    const answer = await adapter(request);
    return request.method === "POST" ? { ...answer, headers: { location: "c-1" } } : answer;
  };
  const [run] = await replayScenarios({ ...input([saved("S-0002", steps)], answers), catalog: [catalogEntry("customer", entryText)] });
  assert.deepEqual([run.outcome, run.attempts], ["failed", ["failed", "failed"]]);
  assert.deepEqual(seen.map((request) => request.method), ["POST", "PUT", "POST", "PUT"]);
  assert.deepEqual([seen[0].body, seen[2].body], ['{"n":"PKT-aaaa"}', '{"n":"PKT-bbbb"}']);
  assert.deepEqual([seen[1].url, seen[1].body], ["http://127.0.0.1:49153/customers/c-1", '{"again":"c-1"}']);
});

const LOGIN_PAGE = ["open {web}/login", 'click "Pay"', 'see "Paid"'];

function recordingBrowser(): { browser: BrowserAdapter; sent: BrowserCommand[] } {
  const sent: BrowserCommand[] = [];
  const browser: BrowserAdapter = async (command) => {
    sent.push(command);
    return { ok: true, detail: "" };
  };
  return { browser, sent };
}

test("affected selects a card whose only service is an open target when that app changed (T-1.5)", () => {
  const page = saved("S-0001", LOGIN_PAGE);
  const base: ContentKey = { env: "e1", apps: { web: "t1", orders: "t2" } };
  assert.deepEqual(affected([page], { ...base, apps: { web: "t9", orders: "t2" } }, base), [page]);
  assert.deepEqual(affected([page], { ...base, apps: { web: "t1", orders: "t9" } }, base), []);
});

test("a browser card lists the stub whose log grew while it ran, and passes its pages and run key to the browser (T-1.5)", async () => {
  const adapter = withStubs([], { "payments-mock": [[], [CHARGE]] });
  const { browser, sent } = recordingBrowser();
  const services = ["web", "orders"];
  const [run] = await replayScenarios({ ...input([saved("S-0002", LOGIN_PAGE)], adapter), services, browser, pages: { web: "http://web:3000" }, stubs: { "payments-mock": "http://payments-mock.stub" } });
  assert.deepEqual([run.outcome, run.mocks, run.gaps], ["passed", ["payments-mock"], []]);
  assert.deepEqual(sent.map((command) => [command.session, command.word]), [["aaaa", "open"], ["aaaa", "click"], ["aaaa", "see"], ["aaaa", "close"]]);
  assert.deepEqual(sent[0], { session: "aaaa", timeoutMs: 20000, word: "open", url: "http://web:3000/login" });
});

test("a browser card replayed with no browser service is blocked on its first browser step", async () => {
  const [run] = await replayScenarios({ ...input([saved("S-0002", LOGIN_PAGE)], scripted([]).adapter), services: ["web"], browser: noBrowser, pages: { web: "http://web:3000" } });
  assert.deepEqual([run.outcome, run.attempts, run.detail], ["blocked", ["blocked"], "step 1: the environment has no browser service"]);
});
