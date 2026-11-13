import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArtifact } from "./artifact.mts";
import { containsMap, declaredStrings, readChecks } from "./declared-checks.mts";

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

test("a check with problems is left out and its valid neighbour is still read", () => {
  assert.deepEqual(readChecks([{ ...HTTP, path: "health" }, RUN], 1), {
    checks: [{ ...RUN, contains: [] }],
    problems: ["check 1 path must start with /"],
  });
});
