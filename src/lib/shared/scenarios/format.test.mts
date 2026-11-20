import { test } from "node:test";
import assert from "node:assert/strict";
import { fingerprintMatches, fingerprintOf, parseScenario, STEP_WORDS, writeScenario, type Card } from "./format.mts";
import { defectCard } from "../testing/cases.mts";
import { classify, isBlamed } from "./compare.mts";

const HEADER = ["---", "id: S-0002", "kind: normal", "covers: [20261115-orders/T-2.1]", 'intent: "an order is created: then read back"', "format: 1", "---"];

const EXAMPLE = [
  ...HEADER,
  "request POST {orders}/orders",
  "  header content-type: application/json",
  '  body {"sku":"PKT-{run}-1","due":"{date:+7d}"}',
  "expect status 201",
  "capture order_id json id",
  "request GET {orders}/orders/{order_id}",
  'expect contains "PKT-"',
  "",
].join("\n");

function card(text: string): Card {
  const { card: parsed, problems } = parseScenario(text);
  assert.deepEqual(problems, []);
  assert.ok(parsed);
  return parsed;
}

function problemsOf(steps: string[]): string[] {
  return parseScenario([...HEADER, ...steps, ""].join("\n")).problems;
}

function withHeader(lines: string[]): string {
  return ["---", ...lines, "---", "request GET {orders}/health", ""].join("\n");
}

test("the step words are the closed list of the format", () => {
  assert.deepEqual(STEP_WORDS, ["request", "expect", "capture", "wait"]);
});

test("the example card parses into its requests, expects and capture (T-1.1)", () => {
  const { header, steps } = card(EXAMPLE);
  assert.deepEqual(header, { id: "S-0002", kind: "normal", covers: ["20261115-orders/T-2.1"], intent: "an order is created: then read back", status: "active", format: 1 });
  assert.deepEqual(steps, [
    { word: "request", line: 1, method: "POST", target: "{orders}/orders", headers: [["content-type", "application/json"]], body: '{"sku":"PKT-{run}-1","due":"{date:+7d}"}' },
    { word: "expect", line: 2, what: "status", status: 201 },
    { word: "capture", line: 3, name: "order_id", from: "json", key: "id" },
    { word: "request", line: 4, method: "GET", target: "{orders}/orders/{order_id}", headers: [], body: null },
    { word: "expect", line: 5, what: "contains", text: "PKT-" },
  ]);
});

test("a written card parses back to itself and its fingerprint matches (T-1.1)", () => {
  const parsed = card(EXAMPLE);
  const full: Card = { ...parsed, header: { ...parsed.header, flow: "orders", supersedes: "S-0001", superseded_by: "S-0003", status: "deprecated" } };
  const steps: Card["steps"] = [...full.steps, { word: "capture", line: 6, name: "etag", from: "header", key: "ETag" }, { word: "wait", line: 7, seconds: 3 }];
  for (const written of [writeScenario(parsed), writeScenario({ ...full, steps })]) {
    assert.ok(fingerprintMatches(written), written);
    assert.equal(writeScenario(card(written)), written);
  }
  assert.deepEqual(card(writeScenario(parsed)), parsed);
  assert.deepEqual(card(writeScenario({ ...full, steps })), { ...full, steps });
});

test("one changed character of a step, or of the fingerprint value, breaks the match; rewriting restores it (T-1.2)", () => {
  const written = writeScenario(card(EXAMPLE));
  const changedStep = written.replace("expect status 201", "expect status 202");
  assert.equal(fingerprintMatches(changedStep), false);
  const recorded = fingerprintOf(written);
  const changedValue = written.replace(recorded, `${recorded.slice(0, -1)}${recorded.endsWith("0") ? "1" : "0"}`);
  assert.equal(fingerprintMatches(changedValue), false);
  assert.equal(fingerprintMatches(writeScenario(card(changedStep))), true);
  assert.equal(fingerprintMatches(writeScenario(card(changedValue))), true);
});

test("the fingerprint ignores line endings and a card with no fingerprint line does not match", () => {
  const written = writeScenario(card(EXAMPLE));
  assert.equal(fingerprintMatches(written.replaceAll("\n", "\r\n")), true);
  assert.equal(fingerprintMatches(EXAMPLE), false);
});

test("an unknown step word names the word and its step line, a command included (T-1.3)", () => {
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect status 200", 'expect contains "ok"', "click #submit"]), ['step 4: unknown step word "click"']);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "run npm test"]), ['step 2: unknown step word "run"']);
});

test("an unknown, missing or invalid header key is a header problem (T-1.3)", () => {
  const keys = ["id: S-0001", "kind: smoke", "covers: []", "intent: health", "format: 1"];
  assert.deepEqual(parseScenario(withHeader([...keys, "owner: me"])).problems, ['header: unknown key "owner"']);
  assert.deepEqual(parseScenario(withHeader(keys.filter((key) => !key.startsWith("intent")))).problems, ['header: missing key "intent"']);
  assert.deepEqual(parseScenario(withHeader(keys.map((key) => (key === "format: 1" ? "format: 2" : key)))).problems, ["header: format must be 1"]);
  assert.deepEqual(parseScenario(withHeader(keys.map((key) => (key === "kind: smoke" ? "kind: happy" : key)))).problems, ["header: kind must be one of normal, boundary, negative, permission, state, integration, smoke"]);
  assert.deepEqual(parseScenario(withHeader([...keys, "status: retired"])).problems, ["header: status must be active or deprecated"]);
  assert.deepEqual(parseScenario(withHeader(keys.map((key) => (key === "id: S-0001" ? "id: S-1" : key)))).problems, ["header: id must be a scenario id such as S-0001"]);
  assert.deepEqual(parseScenario(withHeader(keys.map((key) => (key === "covers: []" ? "covers: [T-1.1]" : key)))).problems, ["header: covers must be a list of <item id>/T-N.x"]);
  assert.deepEqual(parseScenario("request GET {orders}/health\n").problems, ["header: a card starts with a --- header block"]);
});

test("a header line that is not a pair is a header problem naming the line", () => {
  assert.deepEqual(parseScenario(withHeader(["id: S-0001", "kind: smoke", "not a pair"])).problems, ['header: yaml-lite: expected "key: value" at line 4: not a pair']);
});

test("an expect or a capture before any request is a step problem (T-1.3)", () => {
  assert.deepEqual(problemsOf(["expect status 200", "request GET {orders}/health"]), ["step 1: expect comes before any request"]);
  assert.deepEqual(problemsOf(["capture id json id", "request GET {orders}/health"]), ["step 1: capture comes before any request"]);
});

test("an indented line not under a request, or not header or body, is a step problem (T-1.3)", () => {
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect status 200", "  header accept: text/plain"]), ["step 2: an indented line sits only under a request"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "  query page=2"]), ["step 1: an indented line under a request is header <Name>: <value> or body <text>"]);
  assert.deepEqual(problemsOf(["request POST {orders}/orders", "  body {}", "  body []"]), ["step 1: a request takes one body"]);
});

test("a wait outside 1 to 20 seconds is a step problem (T-1.3)", () => {
  assert.deepEqual(problemsOf(["request GET {orders}/health", "wait 21s"]), ["step 2: wait takes 1s to 20s"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "wait 0s"]), ["step 2: wait takes 1s to 20s"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "wait 20s"]), []);
});

test("a contains that is not a JSON string is a step problem (T-1.3)", () => {
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect contains ok"]), ['step 2: contains takes a JSON string, such as "ok"']);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect contains 42"]), ['step 2: contains takes a JSON string, such as "ok"']);
});

test("a malformed request, expect or capture line is a step problem", () => {
  assert.deepEqual(problemsOf(["request {orders}/health"]), ["step 1: request takes a method and a target, such as request GET {orders}/health"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect status 99"]), ["step 2: expect is status <code> or contains <JSON string>"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "expect status 600"]), ["step 2: expect status takes a code from 100 to 599"]);
  assert.deepEqual(problemsOf(["request GET {orders}/health", "capture id xml id"]), ["step 2: capture is <name> json <dotted.path> or <name> header <Name>"]);
  assert.deepEqual(problemsOf([]), ["step 1: a card holds no steps; start with a request"]);
});

test("the known and defect labels are read into the header and written back with a matching fingerprint (T-1.1)", () => {
  const labelled = parseScenario(withHeader(["id: S-0002", "kind: normal", "covers: []", "intent: health", "known: DF-0003", "defect: DF-0003", "format: 1"]));
  assert.deepEqual(labelled.problems, []);
  assert.ok(labelled.card);
  assert.deepEqual([labelled.card.header.known, labelled.card.header.defect], ["DF-0003", "DF-0003"]);
  const written = writeScenario(labelled.card);
  assert.match(written, /^known: DF-0003\ndefect: DF-0003$/m);
  assert.ok(fingerprintMatches(written));
  assert.deepEqual(card(written), labelled.card);
});

test("a recorded defect's card with no covers and a known label reads back clean, and its confirmed failure is a known defect, never blamed (T-1.7)", () => {
  const built = defectCard("negative", "an order with a negative quantity is refused", 'request POST {orders}/orders\n  body {"reference": "PKT-{run}", "quantity": -1}\nexpect status 400\n');
  assert.ok("card" in built, JSON.stringify(built));
  const written = writeScenario({ ...built.card, header: { ...built.card.header, id: "S-0001", covers: [], known: "DF-0001" } });
  const { card: read, problems } = parseScenario(written);
  assert.deepEqual(problems, []);
  assert.ok(fingerprintMatches(written));
  assert.deepEqual([read?.header.covers, read?.header.known], [[], "DF-0001"]);
  const cls = classify({ outcome: "failed", unstable: false }, null, false, read?.header.known ?? null);
  assert.equal(cls, "known defect");
  assert.equal(isBlamed(cls), false);
});

test("a known or defect label that is not a defect id is a header problem (T-1.1)", () => {
  const header = ["id: S-0002", "kind: normal", "covers: []", "intent: health", "format: 1"];
  assert.deepEqual(parseScenario(withHeader([...header, "known: 3"])).problems, ["header: known must be a defect id such as DF-0001"]);
  assert.deepEqual(parseScenario(withHeader([...header, "defect: S-0001"])).problems, ["header: defect must be a defect id such as DF-0001"]);
});

test("a card with any problem parses to no card", () => {
  assert.equal(parseScenario([...HEADER, "click #submit", ""].join("\n")).card, null);
});
