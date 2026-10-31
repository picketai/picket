import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionCounts, decisionsRevisedSince, deferredCriteria, malformedDeferrals, parseArtifact, phasePaths, strategicReviewIds } from "./artifact.mts";

const lines = (...rows: string[]) => rows.join("\n") + "\n";

const RECORD = lines(
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [lib/a.mjs, lib/b.mjs]",
  "    security: false",
  "  - n: 2",
  "    files: [lib/two.mjs]",
  "---",
  "# D",
  "",
  "## Phase 1: A",
  "",
  "**Touch set:**",
  "- `lib/b.mjs`: why",
  "- `lib/dir/`: why",
  "",
  "**Changes:** `lib/ignored.mjs`",
  "- `lib/also-ignored.mjs`: not a touch set line",
  "",
  "- **T-1.1** the step file names `[IRREVERSIBLE]`",
  "",
  "```",
  "[IRREVERSIBLE]",
  "```",
  "",
  "## Phase 2 - B",
  "",
  "- **T-2.1** drop the legacy column [IRREVERSIBLE]",
);

test("parseArtifact reads the phase headings, entries, touch sets and irreversible markers", () => {
  const { front, body, phases } = parseArtifact(RECORD);
  assert.equal(front.lane, "design");
  assert.match(body, /^# D/);
  assert.deepEqual(phases.map((p) => [p.n, p.title]), [[1, "A"], [2, "B"]]);
  assert.deepEqual(phases[0].entry, { n: 1, files: ["lib/a.mjs", "lib/b.mjs"], security: false });
  assert.deepEqual(phases[1].entry, { n: 2, files: ["lib/two.mjs"] });
  assert.deepEqual(phases[0].touchSet, ["lib/b.mjs", "lib/dir/"]);
  assert.deepEqual(phases[1].touchSet, []);
  assert.equal(phases[0].irreversible, false, "inside inline code and a fence");
  assert.equal(phases[1].irreversible, true, "in prose");
});

test("phasePaths gives entry files, then touch-set paths, once each", () => {
  const [first] = parseArtifact(RECORD).phases;
  assert.deepEqual(phasePaths(first), ["lib/a.mjs", "lib/b.mjs", "lib/dir/"]);
});

test("decisionCounts counts the D-### headings and the amended ones by their (rN) marker", () => {
  const body = lines("## Decisions", "", "### D-001: One", "### D-002 (r2): Two", "### D-003: Three (r2 in the name only)", "", "## Phase 1: A");
  assert.deepEqual(decisionCounts(body), { count: 3, amended: 1 });
  assert.deepEqual(decisionCounts("# none"), { count: 0, amended: 0 });
});

test("decisionsRevisedSince gives the ids on revision log lines dated on or after the day, once each, in order", () => {
  const body = lines(
    "## Decisions",
    "- 2026-10-29: D-009 outside the log",
    "## Revision log",
    "",
    "- 2026-10-28: D-001 (r2): older",
    "- 2026-10-29: D-003 (r2): newer; see D-002",
    "- 2026-10-30: D-003 (r3): again",
  );
  assert.deepEqual(decisionsRevisedSince(body, "2026-10-29"), ["D-003", "D-002"]);
  assert.deepEqual(decisionsRevisedSince(body, "2026-10-31"), []);
  assert.deepEqual(decisionsRevisedSince("# no log", "2026-10-29"), []);
});

test("strategicReviewIds names the flagged decision headings and open question lines, never a flag in a paragraph", () => {
  const body = lines(
    "## Decisions",
    "",
    "### D-001: Queue the exports",
    "**Decision:** quote the [STRATEGIC REVIEW NEEDED] flag here and it does not count.",
    "",
    "### D-002: Buy the tax engine [STRATEGIC REVIEW NEEDED]",
    "",
    "## Open questions",
    "",
    "- **OQ-001** Who owns pricing? [STRATEGIC REVIEW NEEDED]",
    "- **OQ-002** Which queue? Default: the existing one.",
  );
  assert.deepEqual(strategicReviewIds(body), ["D-002", "OQ-001"]);
  assert.deepEqual(strategicReviewIds(lines("### D-001: Plain", "- **OQ-001** none")), []);
});

test("strategicReviewIds skips a heading that quotes the flag in backticks", () => {
  assert.deepEqual(strategicReviewIds(lines("### D-003: One flag, `[STRATEGIC REVIEW NEEDED]`, on the line that carries the id")), []);
});

test("deferredCriteria reads the owner and gate of a marker that follows the criterion id", () => {
  const body = lines(
    "## Phase 5: Mail",
    "",
    "- **T-5.1** the order confirmation is queued",
    "- **T-5.4** [DEFERRED: QA, before go-live] the mail renders in a real client",
    "- **T-5.5** the mail renders in a real client [DEFERRED: QA, before go-live]",
    "- **T-5.6** `[DEFERRED: QA, before go-live]` the mail is sent",
  );
  assert.deepEqual(deferredCriteria(body), [{ id: "T-5.4", owner: "QA", gate: "before go-live" }]);
});

test("deferredCriteria skips a criterion inside a fenced block", () => {
  assert.deepEqual(deferredCriteria(lines("```", "- **T-5.4** [DEFERRED: QA, before go-live] x", "```")), []);
});

test("malformedDeferrals names criteria whose marker lacks the owner or the gate", () => {
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** [DEFERRED: QA] x")), ["T-2.1"]);
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** [DEFERRED] x")), ["T-2.1"]);
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** [DEFERRED: QA, ] x")), ["T-2.1"]);
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** x [DEFERRED: QA, before go-live]")), ["T-2.1"]);
});

test("malformedDeferrals passes a well-formed marker and one quoted in a code span", () => {
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** [DEFERRED: QA, before go-live] x")), []);
  assert.deepEqual(malformedDeferrals(lines("- **T-2.1** write it as `[DEFERRED: <owner>, <gate>]` x", "- **T-2.2** `[DEFERRED]` x")), []);
});

test("a phase heading without a frontmatter entry has a null entry", () => {
  const [only] = parseArtifact(lines("# O", "", "## Phase 1: Only", "", "text")).phases;
  assert.equal(only.entry, null);
  assert.deepEqual(phasePaths(only), []);
});
