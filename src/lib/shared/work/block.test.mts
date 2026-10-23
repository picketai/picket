import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { detectBlock, parseBlock, proposedCommit, readHeading } from "./block.mts";

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
