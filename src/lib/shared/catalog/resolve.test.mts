import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScenario, type Card } from "../scenarios/format.mts";
import type { HttpAdapter, HttpAnswer, HttpRequest } from "../scenarios/http.mts";
import { parseEntry, type CatalogEntry } from "./entry.mts";
import { dataRefs, resolveData, type EntryRun } from "./resolve.mts";

const CUSTOMER = "---\nkind: create\nneed: a customer of its own\nformat: 1\n---\nrequest POST {orders}/customers\n  body {\"name\":\"PKT-{run}-c\"}\nexpect status 201\ncapture id json id\n";

function entry(text: string, name: string): CatalogEntry {
  const read = parseEntry(text, name);
  assert.ok(read.entry, read.problems.join("; "));
  return read.entry;
}

function card(steps: string): Card {
  const parsed = parseScenario(`---\nid: S-0002\nkind: normal\ncovers: []\nintent: x\nformat: 1\n---\n${steps}`).card;
  assert.ok(parsed);
  return parsed;
}

function scripted(answers: HttpAnswer[]): { adapter: HttpAdapter; seen: HttpRequest[] } {
  const seen: HttpRequest[] = [];
  return { seen, adapter: async (request) => (seen.push(request), answers[seen.length - 1] ?? { status: null, headers: {}, text: "", error: "no answer" }) };
}

function run(adapter: HttpAdapter): EntryRun {
  return { urls: { orders: "http://127.0.0.1:49153" }, adapter, env: {}, today: "2026-11-18", runKey: "7f3a", timeoutMs: 1000, sleep: async () => {} };
}

test("data names come in order of first use, each once", () => {
  assert.deepEqual(dataRefs(card('request PUT {orders}/a/{data:customer.id}\n  body {"o":"{data:open-order.id}","c":"{data:customer.name}"}\n')), ["customer", "open-order"]);
});

test("a create entry runs with the attempt's run key and hands its captures back keyed by entry (T-6.1)", async () => {
  const { adapter, seen } = scripted([{ status: 201, headers: {}, text: '{"id":"c-41"}', error: null }]);
  const resolved = await resolveData(card("request PUT {orders}/customers/{data:customer.id}\n"), [entry(CUSTOMER, "customer")], run(adapter));
  assert.deepEqual(resolved, { data: { "customer.id": "c-41" } });
  assert.deepEqual(seen.map(({ method, url, body }) => [method, url, body]), [["POST", "http://127.0.0.1:49153/customers", '{"name":"PKT-7f3a-c"}']]);
});

test("an entry named twice in a scenario runs once (T-6.3)", async () => {
  const { adapter, seen } = scripted([{ status: 201, headers: {}, text: '{"id":"c-41"}', error: null }]);
  await resolveData(card('request PUT {orders}/customers/{data:customer.id}\n  body {"again":"{data:customer.id}"}\n'), [entry(CUSTOMER, "customer")], run(adapter));
  assert.equal(seen.length, 1);
});

test("a name that is no catalog entry blocks before any request", async () => {
  const { adapter, seen } = scripted([]);
  assert.deepEqual(await resolveData(card("request GET {orders}/x/{data:tenant.id}\n"), [], run(adapter)), { blocked: "no catalog entry tenant" });
  assert.equal(seen.length, 0);
});

const BROWSER_ONLY = 'open {web}/signup\nfill "Email" with "{data:customer.email}"\nsee "PKT-"\n';

test("a data name used only in a browser step is found and its entry runs (T-1.6)", async () => {
  assert.deepEqual(dataRefs(card(BROWSER_ONLY)), ["customer"]);
  const { adapter, seen } = scripted([{ status: 201, headers: {}, text: '{"email":"PKT-7f3a-c@example.com"}', error: null }]);
  const resolved = await resolveData(card(BROWSER_ONLY), [entry(CUSTOMER.replace("capture id json id", "capture email json email"), "customer")], run(adapter));
  assert.deepEqual(resolved, { data: { "customer.email": "PKT-7f3a-c@example.com" } });
  assert.deepEqual(seen.map(({ method, url }) => [method, url]), [["POST", "http://127.0.0.1:49153/customers"]]);
});
