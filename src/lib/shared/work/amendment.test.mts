import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnchangedAmendment, recordDigest } from "./amendment.mts";
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

test("an older amend row with the same record does not make it unchanged when the newest differs", () => {
  assert.equal(isUnchangedAmendment([asked(DIGEST), asked(OTHER, "2026-10-23T12:00:00.000Z")], DIGEST), false);
});
