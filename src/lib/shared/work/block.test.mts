import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BLOCK_FIELDS, blockField, COMMENT_SEPARATOR, commentProposal, detectBlock, parseBlock, proposals, proposedCommit, readBlock, readHeading, saveBlock, WAIVER_SEPARATOR, waiverProposal } from "./block.mts";
import { setMarker } from "./markers.mts";
import { openItem, withProject } from "#test/project.mts";

test("detectBlock names each contract heading and nothing for plain text", () => {
  assert.equal(detectBlock("## Phase 2 of a-b: Title\n\nPHASE DONE"), "phase");
  assert.equal(detectBlock("## Review: a-b\n\nAPPROVED"), "review");
  assert.equal(detectBlock("## Design: a-b"), "artifact");
  assert.equal(detectBlock("## Report: a-b"), "report");
  assert.equal(detectBlock("## Expedited: a-b"), "expedited");
  assert.equal(detectBlock("Phase 2 of a-b is done."), null);
  assert.equal(detectBlock(null), null);
});

test("detectBlock is exported only by shared/work/block.mts", () => {
  const src = resolve("src");
  const exporters = readdirSync(src, { recursive: true, encoding: "utf8" })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => /\.m[jt]s$/.test(file) && !file.includes(".test.") && /export function detectBlock\b/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(exporters, ["lib/shared/work/block.mts"]);
});

const pick = (text: string) => {
  const heading = readHeading(text);
  return heading && { kind: heading.kind, id: heading.id, phase: heading.phase, scope: heading.scope };
};

test("readHeading reads a developer heading's id and phase (T-2.1)", () => {
  assert.deepEqual(pick("## Phase 3 of 20261023-x: Title\n\nPHASE DONE"), { kind: "phase", id: "20261023-x", phase: 3, scope: null });
});

test("readHeading reads a review heading's scope and its phase (T-2.1)", () => {
  assert.deepEqual(pick("## Review: 20261023-x · phase 2\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: 2, scope: "phase" });
  assert.deepEqual(pick("## Review: 20261023-x · cumulative\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: null, scope: "cumulative" });
  assert.deepEqual(pick("## Review: 20261023-x\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: null, scope: null });
});

test("readHeading reads expedited, artifact and report headings (T-2.1)", () => {
  assert.deepEqual(pick("## Expedited: 20261023-x\n\nPHASE DONE"), { kind: "expedited", id: "20261023-x", phase: null, scope: null });
  assert.deepEqual(pick("## Amendment: 20261023-x\n\nAMENDED"), { kind: "artifact", id: "20261023-x", phase: null, scope: null });
  assert.deepEqual(pick("## Report: 20261023-x\n\nREPORT WRITTEN"), { kind: "report", id: "20261023-x", phase: null, scope: null });
});

test("readHeading takes the earliest heading in the text and gives its index (T-2.1)", () => {
  const text = "Intro\n## Review: 20261023-x · phase 2\n\n## Phase 2 of 20261023-x: T\n\nAPPROVED";
  const heading = readHeading(text);
  assert.equal(heading?.kind, "review");
  assert.equal(heading?.index, text.indexOf("## Review"));
});

test("proposedCommit drops the staged tail and is null without a Commit field", () => {
  const block = (commit: string) => `## Phase 1 of 20261023-x: One\n\nDone.\n\nFiles: a.ts\n${commit}\nPHASE DONE\n`;
  assert.equal(proposedCommit(parseBlock(block("Commit: feat(x): y (staged; approval commits it)"))), "feat(x): y");
  assert.equal(proposedCommit(parseBlock(block(""))), null);
});

test("readHeading gives null for text without a block heading (T-2.1)", () => {
  assert.equal(readHeading("Done.\n\n## Notes\n\nnothing"), null);
  assert.equal(readHeading(""), null);
});

test("proposedCommit keeps the indented body under the Commit line, dedented, after a blank line", () => {
  const text = "## Phase 1 of 20261023-x: One\n\nDone.\n\nFiles: a.ts\nCommit: test(x): drop two tests\n\n    Dropped:\n    - \"a\": now in b.test\n      and c.test\n\nPHASE DONE\n";
  assert.equal(proposedCommit(parseBlock(text)), 'test(x): drop two tests\n\nDropped:\n- "a": now in b.test\n  and c.test');
});

test("BLOCK_FIELDS lists the labels kernel code reads from each block kind", () => {
  assert.deepEqual(BLOCK_FIELDS, {
    phase: ["Files", "Tests", "Lint", "Verified", "Red", "Root cause", "Decisions", "Comments", "Waivers", "Commit"],
    review: ["Classes"],
    artifact: [],
    report: [],
    expedited: [],
  });
});

test("blockField reads a listed label's value, Root cause included", () => {
  const block = parseBlock("## Phase 1 of 20261029-x: One\n\nDone.\n\nRed: n/a: docs\nRoot cause: totals were off because the rate was in percent\nPHASE DONE\n");
  assert.equal(blockField(block, "Root cause"), "totals were off because the rate was in percent");
  assert.equal(blockField(block, "Red"), "n/a: docs");
  assert.equal(blockField(block, "Tests"), undefined);
});

test("blockField throws on a label outside BLOCK_FIELDS.phase", () => {
  const block = parseBlock("## Phase 1 of 20261029-x: One\n\nDone.\n\nNope: x\nPHASE DONE\n");
  assert.throws(() => blockField(block, "Nope" as never), /"Nope" is not a phase block field/);
});

test("proposals split a Comments or Waivers line into items, and none or an empty line into nothing", () => {
  assert.deepEqual(proposals('src/a.ts:4 "half-up"; src/b.ts:9 "x; y"', COMMENT_SEPARATOR), ['src/a.ts:4 "half-up"', 'src/b.ts:9 "x; y"']);
  assert.deepEqual(proposals('src/a.ts:4 "skip" because flaky; src/b.test.ts deleted because moved', WAIVER_SEPARATOR), ['src/a.ts:4 "skip" because flaky', "src/b.test.ts deleted because moved"]);
  assert.deepEqual(proposals("none", COMMENT_SEPARATOR), []);
  assert.deepEqual(proposals(undefined, WAIVER_SEPARATOR), []);
});

test("commentProposal reads path, line and text, and null for any other shape", () => {
  assert.deepEqual(commentProposal('src/a.ts:4 "half-up: the tariff"'), { path: "src/a.ts", line: 4, text: "half-up: the tariff" });
  assert.equal(commentProposal("src/a.ts half-up"), null);
});

test("waiverProposal reads a line waiver and a deleted-test waiver, and null for any other shape", () => {
  assert.deepEqual(waiverProposal('src/a.test.ts:12 "it.skip(x)" because flaky upstream'), { path: "src/a.test.ts", text: "it.skip(x)", deleted: false });
  assert.deepEqual(waiverProposal("src/b.test.ts deleted because moved to c.test.ts"), { path: "src/b.test.ts", text: null, deleted: true });
  assert.equal(waiverProposal('src/a.ts:4 "skip"'), null);
});

test("saveBlock keeps an approved phase's block and appends a later block to N.fixes.md", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Fix" });
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nOriginal.\n\nPHASE DONE");
  setMarker(root, id, 2, "approved", new Date());
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nFirst fix.\n\nPHASE DONE");
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nSecond fix.\n\nPHASE DONE");
  assert.match(readBlock(root, id, 2) ?? "", /Original\./);
  const fixes = readFileSync(join(root, "work", id, "phases", "2.fixes.md"), "utf8");
  assert.ok(fixes.indexOf("First fix.") < fixes.indexOf("Second fix."), fixes);
});
