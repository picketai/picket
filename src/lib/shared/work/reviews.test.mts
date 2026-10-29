import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readHeading } from "./block.mts";
import { reviewFileName, reviewQuestions, reviewRel, saveReview } from "./reviews.mts";
import { openItem, withProject } from "#test/project.mts";

test("each saved review scope has one file name, a phase review one per phase", () => {
  assert.equal(reviewFileName("crosscheck", null), "crosscheck.md");
  assert.equal(reviewFileName("phase", 2), "phase-2.md");
  assert.equal(reviewFileName("checkpoint", null), "checkpoint.md");
  assert.equal(reviewFileName("cumulative", null), "cumulative.md");
  assert.throws(() => reviewFileName("phase", null), /needs a phase number/);
});

test("reviewRel names the file under the work item's reviews folder", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "design", title: "Saved" });
  assert.equal(reviewRel(id, "phase", 3), `work/${id}/reviews/phase-3.md`);
});

test("saveReview keeps the block from its heading with LF endings and replaces an older file", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "design", title: "Saved" });
  const block = (word: string) => `Preamble the lead should not see.\r\n## Review: ${id} · cumulative\r\n\r\n${word}.\r\n\r\nAPPROVED\r\n`;
  const first = block("First");
  saveReview(root, id, readHeading(first)!, first);
  const second = block("Second");
  saveReview(root, id, readHeading(second)!, second);
  const dir = join(root, "work", id, "reviews");
  assert.deepEqual(readdirSync(dir), ["cumulative.md"]);
  assert.equal(readFileSync(join(dir, "cumulative.md"), "utf8"), `## Review: ${id} · cumulative\n\nSecond.\n\nAPPROVED\n`);
});

test("reviewQuestions reads the cumulative review's Questions value, and null when it is none or absent", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Asked" });
  assert.equal(reviewQuestions(root, id), null);
  const save = (questions: string) => {
    const text = `## Review: ${id} · cumulative\n\nOne sentence.\n\n${questions}Findings: clean\n\nAPPROVED\n`;
    saveReview(root, id, readHeading(text)!, text);
  };
  save("Questions: S-4 whether the export keeps the header row\n");
  assert.equal(reviewQuestions(root, id), "S-4 whether the export keeps the header row");
  save("Questions: none\n");
  assert.equal(reviewQuestions(root, id), null);
  save("");
  assert.equal(reviewQuestions(root, id), null);
});

test("saveReview refuses a pull request review and one with no scope", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "design", title: "Saved" });
  assert.throws(() => saveReview(root, id, { scope: "pr", phase: null, index: 0 }, "x"), /pr review is not saved/);
  assert.throws(() => saveReview(root, id, { scope: null, phase: null, index: 0 }, "x"), /scopeless review is not saved/);
});
