import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArtifact, phasePaths } from "../../dist/lib/shared/work/artifact.mjs";

const lines = (...rows) => rows.join("\n") + "\n";

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

test("a phase heading without a frontmatter entry has a null entry", () => {
  const [only] = parseArtifact(lines("# O", "", "## Phase 1: Only", "", "text")).phases;
  assert.equal(only.entry, null);
  assert.deepEqual(phasePaths(only), []);
});
