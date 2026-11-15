import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScenario, type Card } from "./format.mts";
import { placeholders, scenarioProblems } from "./rules.mts";

const HEADER = ["---", "id: S-0002", "kind: normal", "covers: []", "intent: rules", "format: 1", "---"];
const SERVICES = ["orders"];
const RULE_3 = "which is no capture before it, the run key, a test user or a relative date";

function card(steps: string[]): Card {
  const { card: parsed, problems } = parseScenario([...HEADER, ...steps, ""].join("\n"));
  assert.deepEqual(problems, []);
  assert.ok(parsed);
  return parsed;
}

function problems(steps: string[], services: string[] | null = SERVICES): string[] {
  return scenarioProblems(card(steps), services);
}

test("a placeholder starts with a lower-case letter and never matches nested JSON", () => {
  assert.deepEqual(placeholders('{orders}/x/{order_id}?d={date:+7d}&u={user:admin.password}'), ["orders", "order_id", "date:+7d", "user:admin.password"]);
  assert.deepEqual(placeholders('{"a":{"b":1}} [{"x":1}] {HOME}'), []);
});

test("a full URL, a bare path and an unknown service each break rule 1 (T-1.4)", () => {
  assert.deepEqual(problems(["request GET https://orders.example.com/x"]), ["rule 1: step 1 sends to https://orders.example.com/x; a request goes only to {<service>} of the environment"]);
  assert.deepEqual(problems(["request GET /x"]), ["rule 1: step 1 sends to /x; a request goes only to {<service>} of the environment"]);
  assert.deepEqual(problems(["request GET {billing}/x"]), ["rule 1: step 1 names {billing}, which is no service of the environment"]);
});

test("without the environment's services any service name passes rule 1", () => {
  assert.deepEqual(problems(["request GET {billing}/x"], null), []);
  assert.deepEqual(problems(["request GET {payments-mock}/x"], ["payments-mock"]), []);
});

test("a variable, a capture used before it is taken and an env placeholder each break rule 3 (T-1.4)", () => {
  assert.deepEqual(problems(["request GET {orders}/x/{HOME}"]), [`rule 3: step 1 takes {HOME}, ${RULE_3}`]);
  assert.deepEqual(problems(["request GET {orders}/x", "  header Authorization: Bearer {token}", "capture token json token"]), [`rule 3: step 1 takes {token}, ${RULE_3}`]);
  assert.deepEqual(problems(["request GET {orders}/x", "  body {\"path\":\"{env:PATH}\"}"]), [`rule 3: step 1 takes {env:PATH}, ${RULE_3}`]);
  assert.deepEqual(problems(["request GET {orders}/x", 'expect contains "{secret}"']), [`rule 3: step 2 takes {secret}, ${RULE_3}`]);
});

test("the run key, a relative date, a test user and an earlier capture pass rule 3 (T-1.4)", () => {
  const steps = [
    "request POST {orders}/login",
    '  body {"user":"{user:admin.name}","password":"{user:admin.password}"}',
    "capture token json token",
    "request POST {orders}/orders?from={date:-1d}",
    "  header Authorization: Bearer {token}",
    '  body {"sku":"PKT-{run}-1"}',
    'expect contains "PKT-{run}"',
  ];
  assert.deepEqual(problems(steps), []);
});

test("a fixed date in a body or a target is refused (T-1.5)", () => {
  assert.deepEqual(problems(["request POST {orders}/orders", '  body {"due":"2026-11-22"}']), ["step 1: fixed date 2026-11-22; write {date:+Nd}"]);
  assert.deepEqual(problems(["request GET {orders}/orders?at=2026-11-15T10:00:00Z"]), ["step 1: fixed date 2026-11-15; write {date:+Nd}"]);
  assert.deepEqual(problems(["request GET {orders}/x", "  header If-Modified-Since: 2026-11-15", 'expect contains "2026-11-15"']), [
    "step 1: fixed date 2026-11-15; write {date:+Nd}",
    "step 2: fixed date 2026-11-15; write {date:+Nd}",
  ]);
});

test("a literal secret in a header or a JSON body key is refused, a captured one is not (T-1.5)", () => {
  const source = "take it from a capture or {user:<role>.<field>}";
  assert.deepEqual(problems(["request GET {orders}/x", "  header Authorization: Bearer abc"]), [`step 1: header Authorization holds a literal secret; ${source}`]);
  assert.deepEqual(problems(["request GET {orders}/x", "  header X-Api-Key: k1"]), [`step 1: header X-Api-Key holds a literal secret; ${source}`]);
  assert.deepEqual(problems(["request POST {orders}/login", '  body {"password":"p"}']), [`step 1: body key password holds a literal secret; ${source}`]);
  assert.deepEqual(problems(["request POST {orders}/login", '  body {"auth":{"apiKey":7}}']), [`step 1: body key apiKey holds a literal secret; ${source}`]);
  assert.deepEqual(problems(["request POST {orders}/login", "capture token json token", "request GET {orders}/x", "  header Authorization: Bearer {token}"]), []);
  assert.deepEqual(problems(["request POST {orders}/login", "  header content-type: application/json", '  body {"user":"a"}']), []);
});
