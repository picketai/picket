import { test } from "node:test";
import assert from "node:assert/strict";
import { frameDigest, isOutOfFrameAmendment, isUnchangedAmendment, namedChecks, recordDigest } from "./amendment.mts";
import type { VerdictRow } from "./verdict-log.mts";

const BODY = "## Decisions\n\n### D-001: One\n";
const DIGEST = recordDigest(BODY);
const OTHER = recordDigest("## Decisions\n\n### D-001: Two\n");

function asked(record?: string, ts = "2026-10-23T10:00:00.000Z"): VerdictRow {
  return { ts, agent: "reviewer", verdict: "CHANGES REQUIRED", phase: 2, scope: "cumulative", through: null, amend: "AMENDMENT NEEDED: T-2.4 x", ...(record ? { record } : {}) };
}

const PLAIN: VerdictRow = { ts: "2026-10-23T11:00:00.000Z", agent: "architect", verdict: "AMENDED", phase: 2, scope: null, through: null, record: DIGEST };

test("recordDigest gives the same 64-character hex for equal bodies and a different one when one character changes", () => {
  assert.match(DIGEST, /^[0-9a-f]{64}$/);
  assert.equal(recordDigest(BODY), DIGEST);
  assert.notEqual(recordDigest(BODY.replace("One", "Onf")), DIGEST);
});

test("an amendment is unchanged when the newest prior amend row carries the same record", () => {
  assert.equal(isUnchangedAmendment([asked(DIGEST), PLAIN], DIGEST), true);
});

test("an amendment counts as changed with no amend row, a row without record, or no record of its own", () => {
  assert.equal(isUnchangedAmendment([PLAIN], DIGEST), false);
  assert.equal(isUnchangedAmendment([asked()], DIGEST), false);
  assert.equal(isUnchangedAmendment([asked(DIGEST)], undefined), false);
});

type Check = Record<string, unknown>;

function checkedPhases(edit: { t15?: Check; t16?: Check; pattern?: string; files?: string[] } = {}) {
  const t15 = { covers: "T-1.5", command: "node --test a", exit_code: 0, contains: ["# pass 1"], ...edit.t15 };
  const t16 = { covers: "T-1.6", command: "node b", exit_code: 0, contains: ["ok"], ...edit.t16 };
  const entry = { n: 1, files: edit.files ?? ["src/a.mts"], greps: [{ path: "src/a.mts", pattern: edit.pattern ?? "export function a" }], tests: true, drive: [t15, t16] };
  return [{ entry }, { entry: { n: 2, files: ["src/b.mts"] } }];
}

const NAMED = ["T-1.5"];
const BASE_FRAME = frameDigest(checkedPhases(), NAMED);

test("namedChecks keeps the amend line's ids that a declared drive check covers, in line order", () => {
  assert.deepEqual(namedChecks(checkedPhases(), "AMENDMENT NEEDED: T-1.5 the drive check expects # pass 1"), ["T-1.5"]);
  assert.deepEqual(namedChecks(checkedPhases(), "AMENDMENT NEEDED: T-1.6 and T-1.5, T-2.1 too"), ["T-1.6", "T-1.5"]);
  assert.deepEqual(namedChecks(checkedPhases(), "AMENDMENT NEEDED: T-2.1 the wording"), []);
});

test("frameDigest ignores the named check's contains, exit_code and command (T-3.2)", () => {
  for (const t15 of [{ contains: ["ℹ pass 1"] }, { exit_code: 1 }, { command: "node --test b" }]) {
    assert.equal(frameDigest(checkedPhases({ t15 }), NAMED), BASE_FRAME, JSON.stringify(t15));
  }
});

test("frameDigest changes with another check's contains, a grep pattern, a files entry or the named check's covers (T-3.2)", () => {
  const changed = [checkedPhases({ t16: { contains: ["fine"] } }), checkedPhases({ pattern: "export function b" }), checkedPhases({ files: ["src/a.mts", "src/c.mts"] }), checkedPhases({ t15: { covers: "T-1.7" } })];
  for (const phases of changed) assert.notEqual(frameDigest(phases, NAMED), BASE_FRAME);
});

test("an amendment is out of frame only when both it and the newest prior amend row carry different frames", () => {
  const ask = { ...asked(DIGEST), frame: BASE_FRAME };
  assert.equal(isOutOfFrameAmendment([ask, PLAIN], "f".repeat(64)), true);
  assert.equal(isOutOfFrameAmendment([ask], BASE_FRAME), false);
  assert.equal(isOutOfFrameAmendment([asked(DIGEST)], "f".repeat(64)), false);
  assert.equal(isOutOfFrameAmendment([ask], undefined), false);
});

test("an older amend row with the same record does not make it unchanged when the newest differs", () => {
  assert.equal(isUnchangedAmendment([asked(DIGEST), asked(OTHER, "2026-10-23T12:00:00.000Z")], DIGEST), false);
});
