import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DriveRow } from "../drive-log.mts";
import { parseArtifact } from "./artifact.mts";
import { carriedResults, compareChecks, containsMap, declaredStrings, mismatchText, phaseRows, readChecks, type CheckResult, type DeclaredCheck, type HttpCheck, type RunCheck } from "./declared-checks.mts";
import { workId } from "./files.mts";
import type { WorkSnapshot } from "./snapshot.mts";

const RECORD = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [src/orders.ts]",
  "    drive:",
  "      - covers: T-1.1",
  "        method: POST",
  "        path: /orders",
  "        status: 201",
  '        contains: ["\\"id\\"", pending, "a, b"]',
  "      - covers: T-1.2",
  "        command: picket state 1",
  "        exit_code: 0",
  "        contains: [open]",
  "    security: false",
  "---",
  "# D",
  "",
  "## Phase 1: Orders",
  "",
  "- **T-1.1** a",
  "- **T-1.2** b",
  "- **T-1.3** c",
  "",
].join("\n");

const HTTP = { covers: "T-1.1", method: "GET", path: "/health", status: 200 };
const RUN = { covers: "T-1.2", command: "npm test", exit_code: 0 };

function problemsOf(check: Record<string, unknown>): string[] {
  return readChecks([check], 1)?.problems ?? [];
}

test("a record's block-form drive list reads as an HTTP and a run check with every field (T-1.1)", () => {
  const drive = parseArtifact(RECORD).phases[0].entry?.drive;
  assert.deepEqual(readChecks(drive, 1), {
    checks: [
      { covers: "T-1.1", method: "POST", path: "/orders", status: 201, contains: ['"id"', "pending", "a, b"] },
      { covers: "T-1.2", command: "picket state 1", exit_code: 0, contains: ["open"] },
    ],
    problems: [],
  });
});

test("true, false and a missing drive key keep their meaning and read as no checks (T-1.2)", () => {
  assert.equal(readChecks(true, 1), null);
  assert.equal(readChecks(false, 1), null);
  assert.equal(readChecks(undefined, 1), null);
});

test("a check without contains reads as contains: [] (T-1.2)", () => {
  assert.deepEqual(readChecks([HTTP, RUN], 1), {
    checks: [
      { ...HTTP, contains: [] },
      { ...RUN, contains: [] },
    ],
    problems: [],
  });
});

test("an empty list is a problem (T-1.3)", () => {
  assert.deepEqual(readChecks([], 1), { checks: [], problems: ["is an empty list; write drive: true, false, or at least one check"] });
});

test("a check with both path and command is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, command: "npm test" }), ["check 1 has both path and command; a check is an HTTP check or a run check"]);
});

test("a check with neither path nor command is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ covers: "T-1.1", status: 200 }), ["check 1 has neither path nor command"]);
});

test("a check that is not a map is a check with neither path nor command (T-1.3)", () => {
  assert.deepEqual(readChecks(["GET /health"], 1)?.problems, ["check 1 has neither path nor command"]);
});

test("a key outside the HTTP check's set is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, exit_code: 0 }), ["check 1 has key exit_code, which an HTTP check does not take"]);
});

test("a key outside the run check's set is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...RUN, status: 200 }), ["check 1 has key status, which a run check does not take"]);
});

test("covers naming another phase's criterion is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, covers: "T-2.1" }), ['check 1 covers "T-2.1", not a T-1.<x> criterion of this phase']);
});

test("covers that is no criterion id is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, covers: "orders" }), ['check 1 covers "orders", not a T-1.<x> criterion of this phase']);
});

test("a missing covers is a problem (T-1.3)", () => {
  const { covers: _covers, ...uncovered } = HTTP;
  assert.deepEqual(problemsOf(uncovered), ["check 1 covers null, not a T-1.<x> criterion of this phase"]);
});

test("a method in lower case is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, method: "get" }), ["check 1 method must be upper-case letters, such as GET"]);
});

test("a path without a leading slash is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...HTTP, path: "health" }), ["check 1 path must start with /"]);
});

test("a status outside 100 to 599 or not an integer is a problem (T-1.3)", () => {
  const message = ["check 1 status must be an integer from 100 to 599"];
  assert.deepEqual(problemsOf({ ...HTTP, status: 99 }), message);
  assert.deepEqual(problemsOf({ ...HTTP, status: 600 }), message);
  assert.deepEqual(problemsOf({ ...HTTP, status: 200.5 }), message);
  assert.deepEqual(problemsOf({ ...HTTP, status: "200" }), message);
});

test("an exit_code that is not an integer is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...RUN, exit_code: "zero" }), ["check 1 exit_code must be an integer"]);
});

test("an empty command is a problem (T-1.3)", () => {
  assert.deepEqual(problemsOf({ ...RUN, command: " " }), ["check 1 command must not be empty"]);
});

test("contains that is not a list of non-empty strings is a problem (T-1.3)", () => {
  const message = ["check 1 contains must be a list of non-empty strings"];
  assert.deepEqual(problemsOf({ ...HTTP, contains: "pending" }), message);
  assert.deepEqual(problemsOf({ ...HTTP, contains: ["pending", ""] }), message);
  assert.deepEqual(problemsOf({ ...HTTP, contains: [201] }), message);
});

test("containsMap says which strings the text holds, past any display cut (T-2.1)", () => {
  assert.deepEqual(containsMap("a pending order", ["pending", "paid"]), { pending: true, paid: false });
  const body = `${"x".repeat(2900)}paid${"y".repeat(96)}`;
  assert.equal(body.length, 3000);
  assert.deepEqual(containsMap(body, ["paid"]), { paid: true });
});

test("declaredStrings unites one kind's contains strings without repeats", () => {
  const checks = readChecks(
    [
      { ...HTTP, contains: ["pending", "id"] },
      { ...HTTP, covers: "T-1.3", contains: ["id", "total"] },
      { ...RUN, contains: ["ok"] },
    ],
    1,
  )?.checks ?? [];
  assert.deepEqual(declaredStrings(checks, "http"), ["pending", "id", "total"]);
  assert.deepEqual(declaredStrings(checks, "run"), ["ok"]);
});

const ORDER: HttpCheck = { covers: "T-1.2", method: "POST", path: "/orders", status: 201, contains: ["pending"] };
const TESTS: RunCheck = { covers: "T-1.3", command: "npm test", exit_code: 0, contains: ["pass"] };

function hitRow(path: string, status: number | null, contains?: Record<string, boolean>, method = "POST"): DriveRow {
  const hit = { method, path, status, ms: 3, ...(contains ? { contains } : {}) };
  return { ts: "2026-11-13T10:00:00.000Z", kind: "drive", command: "picket drive", source: "picket drive", work_id: "20261113-x", phase: 1, hits: [hit] };
}

function runRow(run: string, exit_code: number, contains?: Record<string, boolean>): DriveRow {
  return { ts: "2026-11-13T10:00:00.000Z", kind: "drive", command: `picket drive --run ${run}`, source: "picket drive", work_id: "20261113-x", phase: 1, run, exit_code, ...(contains ? { contains } : {}) };
}

function compareOne(check: DeclaredCheck, rows: DriveRow[]): CheckResult {
  return compareChecks([check], rows)[0];
}

test("the latest hit with the declared method and path decides, so an earlier 500 does not fail it (T-3.1)", () => {
  const passed = hitRow("/orders", 201, { pending: true });
  const result = compareOne(ORDER, [hitRow("/orders", 500, { pending: false }), passed]);
  assert.deepEqual(result, { phase: 1, index: 0, check: ORDER, outcome: "pass", ran: passed.hits?.[0], detail: "POST /orders → 201" });
});

test("a hit that differs only by a path prefix is a prefix outcome naming both paths (T-3.2)", () => {
  const row = hitRow("/api/orders", 201, { pending: true });
  assert.deepEqual(compareOne(ORDER, [row]), { phase: 1, index: 0, check: ORDER, outcome: "prefix", ran: row.hits?.[0], detail: "ran at /api/orders; declared /orders, the user rules at the gate" });
});

test("an exact-path hit is preferred over a later prefix hit", () => {
  const exact = hitRow("/orders", 201, { pending: true });
  assert.equal(compareOne(ORDER, [exact, hitRow("/api/orders", 201, { pending: true })]).outcome, "pass");
});

test("a status other than the declared one fails with declared versus ran (T-3.3)", () => {
  const row = hitRow("/orders", 400, { pending: true });
  assert.deepEqual(compareOne(ORDER, [row]), { phase: 1, index: 0, check: ORDER, outcome: "failed", ran: row.hits?.[0], detail: "declared 201, ran 400" });
});

test("a string mapped to false fails naming the string (T-3.3)", () => {
  const row = hitRow("/orders", 201, { pending: false });
  assert.deepEqual(compareOne(ORDER, [row]), { phase: 1, index: 0, check: ORDER, outcome: "failed", ran: row.hits?.[0], detail: '"pending" not in the body' });
});

test("a string absent from the map fails as not checked by the logged drive (T-3.3)", () => {
  const row = hitRow("/orders", 201);
  assert.deepEqual(compareOne(ORDER, [row]), { phase: 1, index: 0, check: ORDER, outcome: "failed", ran: row.hits?.[0], detail: '"pending" not checked by the logged drive' });
});

test("no hit at the declared resource is not run, naming the last hit of the same method", () => {
  const row = hitRow("/payments", 201, { pending: true });
  assert.deepEqual(compareOne(ORDER, [row, hitRow("/orders", 200, {}, "GET")]), { phase: 1, index: 0, check: ORDER, outcome: "not_run", ran: row.hits?.[0], detail: "not run; last ran POST /payments" });
});

test("only picket drive rows of this item and phase count; others leave the check not run (T-3.4)", () => {
  const good = hitRow("/orders", 201, { pending: true });
  const others: DriveRow[] = [{ ...good, work_id: "20261113-y" }, { ...good, phase: 2 }, { ...good, phase: null }, { ...good, source: undefined }];
  const counted = phaseRows(others, workId("20261113-x"), 1);
  assert.deepEqual(counted, []);
  assert.deepEqual(compareOne(ORDER, counted), { phase: 1, index: 0, check: ORDER, outcome: "not_run", ran: null, detail: "not run" });
  assert.deepEqual(phaseRows([...others, good], workId("20261113-x"), 1), [good]);
});

test("a run check matches only the exact command (T-3.5)", () => {
  const watch = runRow("npm test -- --watch", 0, { pass: true });
  assert.deepEqual(compareOne(TESTS, [watch]), { phase: 1, index: 0, check: TESTS, outcome: "not_run", ran: { run: "npm test -- --watch", exit_code: 0, contains: { pass: true } }, detail: 'not run; last ran "npm test -- --watch"' });
});

test("an exact run with the declared exit code and every string passes (T-3.5)", () => {
  assert.deepEqual(compareOne(TESTS, [runRow("npm test", 0, { pass: true })]), { phase: 1, index: 0, check: TESTS, outcome: "pass", ran: { run: "npm test", exit_code: 0, contains: { pass: true } }, detail: '"npm test" → exit 0' });
});

test("an exact run with another exit code fails with declared versus ran (T-3.5)", () => {
  assert.deepEqual(compareOne(TESTS, [runRow("npm test", 1, { pass: true })]), { phase: 1, index: 0, check: TESTS, outcome: "failed", ran: { run: "npm test", exit_code: 1, contains: { pass: true } }, detail: "declared exit 0, ran exit 1" });
});

test("a run output missing a string fails naming it", () => {
  assert.equal(compareOne(TESTS, [runRow("npm test", 0, { pass: false })]).detail, '"pass" not in the output');
});

test("compareChecks keeps each check's index in the declared list", () => {
  assert.deepEqual(compareChecks([ORDER, TESTS], []).map(({ index, outcome }) => [index, outcome]), [[0, "not_run"], [1, "not_run"]]);
});

const ORDER_DRIVE = [{ covers: "T-1.2", method: "POST", path: "/orders", status: 201 }];

function snapOf(phases: { n: number; approved: boolean; drive: unknown }[]): WorkSnapshot {
  return { state: { id: "20261113-x" }, phases: phases.map(({ n, approved, drive }) => ({ n, approved, entry: { n, drive } })) } as unknown as WorkSnapshot;
}

function orderHit(phase: number, path: string, status = 201): DriveRow {
  return { ...hitRow(path, status), phase };
}

test("carriedResults lists the prefix outcomes of approved phases below the given one", () => {
  const phaseTwoDrive = [{ covers: "T-2.1", method: "POST", path: "/orders", status: 201 }];
  const snap = snapOf([
    { n: 1, approved: true, drive: ORDER_DRIVE },
    { n: 2, approved: false, drive: phaseTwoDrive },
  ]);
  const rows = [orderHit(1, "/api/orders"), orderHit(2, "/api/orders")];
  const carried = carriedResults(snap, rows, 2);
  assert.deepEqual(carried.map(({ phase, check, outcome }) => [phase, check.covers, outcome]), [[1, "T-1.2", "prefix"]]);
  assert.deepEqual(carriedResults(snap, rows, 1), []);
});

test("carriedResults leaves out failed, passed and unapproved phases' outcomes", () => {
  const snap = snapOf([
    { n: 1, approved: true, drive: ORDER_DRIVE },
    { n: 2, approved: true, drive: true },
  ]);
  assert.deepEqual(carriedResults(snap, [orderHit(1, "/api/orders", 400)], 3), []);
  assert.deepEqual(carriedResults(snap, [orderHit(1, "/orders")], 3), []);
  assert.deepEqual(carriedResults(snapOf([{ n: 1, approved: false, drive: ORDER_DRIVE }]), [orderHit(1, "/api/orders")], 3), []);
});

test("mismatchText gives one line per outcome in declared versus ran form", () => {
  const order = { ...ORDER, contains: [] };
  assert.equal(mismatchText(compareOne(order, [hitRow("/orders", 400)])), "T-1.2 POST /orders: declared 201, ran 400");
  assert.equal(mismatchText(compareOne(order, [hitRow("/api/orders", 201)])), "T-1.2 POST /orders ran at /api/orders; approval corrects the record");
  assert.equal(mismatchText(compareOne(TESTS, [runRow("npm test", 1, { pass: true })])), 'T-1.3 run "npm test": declared exit 0, ran exit 1');
  assert.equal(mismatchText(compareOne(order, [hitRow("/health", 200, undefined, "POST")])), "T-1.2 POST /orders: not run; last ran POST /health");
});

const TEMPLATES = new URL("../../../skills/documenting/templates/", import.meta.url);
const SAMPLE_VALUES: Record<string, string> = { covers: "T-1.1", method: "POST", path: "/orders", status: "201", contains: "[pending]", command: "npm test", exit_code: "0" };
const PLACEHOLDER_FIELD = /^(\s*(?:- )?)(covers|method|path|status|contains|command|exit_code): \[REPLACE:[^\]]*\]$/gm;

function sampledTemplate(name: string): string {
  const text = readFileSync(new URL(name, TEMPLATES), "utf8");
  return text.replace(PLACEHOLDER_FIELD, (_line, lead: string, key: string) => `${lead}${key}: ${SAMPLE_VALUES[key]}`);
}

for (const name of ["design.md", "order.md"]) {
  test(`the ${name} template's drive example reads as two checks with no problems (T-7.1)`, () => {
    const drive = parseArtifact(sampledTemplate(name)).phases[0].entry?.drive;
    assert.deepEqual(readChecks(drive, 1), {
      checks: [
        { covers: "T-1.1", method: "POST", path: "/orders", status: 201, contains: ["pending"] },
        { covers: "T-1.1", command: "npm test", exit_code: 0, contains: ["pending"] },
      ],
      problems: [],
    });
  });
}

test("a check with problems is left out and its valid neighbour is still read", () => {
  assert.deepEqual(readChecks([{ ...HTTP, path: "health" }, RUN], 1), {
    checks: [{ ...RUN, contains: [] }],
    problems: ["check 1 path must start with /"],
  });
});
