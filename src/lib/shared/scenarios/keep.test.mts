import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CheckResult, HttpCheck } from "../work/declared-checks.mts";
import { writeScenarioFile } from "./files.mts";
import { fingerprintMatches, parseScenario, writeScenario, type Card } from "./format.mts";
import { candidateCard, criterionText, deprecate, keepCandidates, keepText, readCandidates, storeCandidates, type Candidate, type CandidateInput } from "./keep.mts";
import { scenarioProblems } from "./rules.mts";

const CHECK: HttpCheck = { covers: "T-1.1", method: "POST", path: "/orders", status: 201, contains: ["id"] };
const HIT = { method: "POST", path: "/api/orders", status: 201, ms: 3, body: '{"sku":"PKT-test-1","due":"2026-11-22"}' };
const ORDERS = { name: "orders", context: "services/orders" };

function result(overrides: Partial<CheckResult> = {}): CheckResult {
  return { phase: 1, index: 0, check: CHECK, outcome: "prefix", ran: HIT, detail: "", ...overrides };
}

function input(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return { item: "20261115-orders", result: result(), criterion: "an order is created", ts: "2026-11-15T10:00:00.000Z", apps: [ORDERS, { name: "billing", context: "services/billing" }], files: ["services/orders/server.mjs"], ...overrides };
}

function card(overrides: Partial<CandidateInput> = {}): Card {
  const built = candidateCard(input(overrides));
  assert.ok("card" in built, JSON.stringify(built));
  return built.card;
}

function refusal(overrides: Partial<CandidateInput>): string {
  const built = candidateCard(input(overrides));
  assert.ok("notKept" in built, JSON.stringify(built));
  return built.notKept;
}

test("a prefix check becomes a card at the ran path with the body's dates and PKT- ids made relative (T-9.1)", () => {
  const built = card();
  assert.deepEqual(built, {
    header: { id: "S-0000", kind: "normal", covers: ["20261115-orders/T-1.1"], intent: "an order is created", status: "active", format: 1 },
    steps: [
      { word: "request", line: 1, method: "POST", target: "{orders}/api/orders", headers: [["content-type", "application/json"]], body: '{"sku":"PKT-{run}-1","due":"{date:+7d}"}' },
      { word: "expect", line: 2, what: "status", status: 201 },
      { word: "expect", line: 3, what: "contains", text: "id" },
    ],
  });
  assert.deepEqual(scenarioProblems(built, ["orders", "billing"]), []);
  assert.deepEqual(parseScenario(writeScenario(built)).card, built);
});

test("a negative status, a declared service, a replaced scenario and a past date shape the card", () => {
  const check: HttpCheck = { ...CHECK, method: "GET", path: "/orders/x", status: 404, contains: [], service: "billing", replaces: "S-0003" };
  const built = card({ result: result({ check, outcome: "pass", ran: { method: "GET", path: "/orders/x?since=2026-11-14", status: 404, ms: 1 } }) });
  assert.deepEqual([built.header.kind, built.header.supersedes], ["negative", "S-0003"]);
  assert.deepEqual(built.steps, [
    { word: "request", line: 1, method: "GET", target: "{billing}/orders/x?since={date:-1d}", headers: [], body: null },
    { word: "expect", line: 2, what: "status", status: 404 },
  ]);
});

test("each refusal names why the check is not kept (T-9.2)", () => {
  const run = { covers: "T-1.2", command: "npm test", exit_code: 0, contains: [] };
  assert.equal(refusal({ result: result({ check: run, ran: { run: "npm test", exit_code: 0 } }) }), "a run check is never kept; only an HTTP check becomes a saved scenario");
  assert.equal(refusal({ result: result({ outcome: "failed" }) }), "the check failed");
  assert.equal(refusal({ result: result({ outcome: "not_run", ran: null }) }), "the check did not run");
  assert.equal(refusal({ result: result({ ran: { ...HIT, body: '{"sku":"PKT-a","password":"***"}' } }) }), "the logged body holds a masked secret");
  assert.equal(refusal({ files: ["README.md"] }), "the phase's files sit in no app or in several; name one with service");
  assert.equal(refusal({ files: ["services/orders/a.mjs", "services/billing/b.cs"] }), "the phase's files sit in no app or in several; name one with service");
  assert.equal(refusal({ result: result({ ran: { ...HIT, body: '{"sku":"A-1"}' } }) }), "POST changes data it did not create; create it with a PKT- prefix");
});

test("the criterion text is read from the phase's bullet line", () => {
  const body = "## Phase 1: A\n\n- **T-1.1** an order is created\n- **T-1.10** another\n";
  assert.equal(criterionText(body, "T-1.1"), "an order is created");
  assert.equal(criterionText(body, "T-1.2"), "");
});

test("the keep text says kept on approval, the replaced scenario, or why not", () => {
  const base: Candidate = { covers: "T-1.1", index: 0, outcome: "passed", detail: "", text: "x", replaces: null };
  assert.equal(keepText(base), "kept on approval");
  assert.equal(keepText({ ...base, replaces: "S-0001" }), "kept on approval, replaces S-0001");
  assert.equal(keepText({ ...base, outcome: "failed", detail: "step 2: expected status 201, got 500" }), "not kept: replay failed: step 2: expected status 201, got 500");
  assert.equal(keepText({ ...base, outcome: "not kept", detail: "the check failed", text: null }), "not kept: the check failed");
});

function scratch(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-keep-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("candidates are stored per phase and read back", (t) => {
  const root = scratch(t);
  const one: Candidate = { covers: "T-1.1", index: 0, outcome: "passed", detail: "", text: "x", replaces: null };
  storeCandidates(root, "20261115-orders", 1, [one]);
  storeCandidates(root, "20261115-orders", 2, []);
  assert.deepEqual(readCandidates(root, "20261115-orders"), { "1": [one], "2": [] });
  assert.deepEqual(readCandidates(root, "20261115-other"), {});
});

test("keeping writes the next id with a fresh fingerprint and deprecates the active scenario it replaces", (t) => {
  const root = scratch(t);
  const old = writeScenario({ ...card(), header: { ...card().header, id: "S-0001" } });
  writeScenarioFile(root, "S-0001", old);
  const replacing = writeScenario(card({ result: result({ check: { ...CHECK, replaces: "S-0001" } }) }));
  const kept = keepCandidates(root, [{ covers: "T-1.1", index: 0, outcome: "passed", detail: "", text: replacing, replaces: "S-0001" }]);
  assert.deepEqual(kept, { paths: [".picket/env/scenarios/S-0002.md", ".picket/env/scenarios/S-0001.md"], lines: ["kept S-0002 from T-1.1; S-0001 deprecated, superseded by S-0002"] });
  const written = readFileSync(join(root, ".picket", "env", "scenarios", "S-0002.md"), "utf8");
  assert.ok(fingerprintMatches(written));
  assert.deepEqual([parseScenario(written).card?.header.id, parseScenario(written).card?.header.supersedes], ["S-0002", "S-0001"]);
  const deprecated = readFileSync(join(root, ".picket", "env", "scenarios", "S-0001.md"), "utf8");
  assert.ok(fingerprintMatches(deprecated));
  assert.deepEqual([parseScenario(deprecated).card?.header.status, parseScenario(deprecated).card?.header.superseded_by], ["deprecated", "S-0002"]);
});

test("a replaces naming no active scenario deprecates nothing and says so", (t) => {
  const root = scratch(t);
  const kept = keepCandidates(root, [{ covers: "T-1.1", index: 0, outcome: "passed", detail: "", text: writeScenario(card()), replaces: "S-0009" }]);
  assert.deepEqual(kept.lines, ["kept S-0001 from T-1.1; S-0009 is no active saved scenario; nothing deprecated"]);
  assert.deepEqual(kept.paths, [".picket/env/scenarios/S-0001.md"]);
});

test("deprecate sets the status and the successor and keeps the fingerprint matching", () => {
  const text = deprecate(writeScenario(card()), "S-0004");
  assert.ok(text !== null && fingerprintMatches(text));
  assert.deepEqual([parseScenario(text).card?.header.status, parseScenario(text).card?.header.superseded_by], ["deprecated", "S-0004"]);
  assert.equal(deprecate("not a card", "S-0004"), null);
});
