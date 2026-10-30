import { test } from "node:test";
import assert from "node:assert/strict";
import { briefLines, hasBriefHeading, readBrief, withBrief, type Brief } from "./brief.mts";

const BRIEF: Brief = { purpose: "bill late fees", in_scope: "the fees module", out_of_scope: "refunds" };

test("a request with a brief is the request, a blank line, then the three lines under ## Brief", () => {
  const expected = "add a fee\n\n## Brief\npurpose: bill late fees\nin scope: the fees module\nout of scope: refunds\n";
  assert.equal(withBrief("add a fee", BRIEF), expected);
  assert.equal(withBrief("add a fee\n", BRIEF), expected);
});

test("the brief written into a request reads back unchanged", () => {
  assert.deepEqual(readBrief(withBrief("add a fee", BRIEF)), BRIEF);
  assert.deepEqual(readBrief(withBrief("add a fee", BRIEF).replaceAll("\n", "\r\n")), BRIEF);
});

test("the last ## Brief section wins, and the section ends at the next heading", () => {
  const quoted = withBrief("quote:\n## Brief\npurpose: old\nin scope: old\nout of scope: old\n\n# Ask", BRIEF);
  assert.deepEqual(readBrief(quoted), BRIEF);
  assert.equal(readBrief("x\n\n## Brief\npurpose: p\nin scope: s\n## Notes\nout of scope: o\n"), null);
});

test("no request, no section or a missing or empty key reads as no brief", () => {
  assert.equal(readBrief(null), null);
  assert.equal(readBrief("add a fee\n"), null);
  assert.equal(readBrief("x\n\n## Brief\npurpose: p\nin scope: s\n"), null);
  assert.equal(readBrief("x\n\n## Brief\npurpose: p\nin scope: s\nout of scope: \n"), null);
});

test("hasBriefHeading finds a ## Brief line on its own, never one inside a longer line", () => {
  assert.equal(hasBriefHeading("add a fee\r\n## Brief\r\npurpose: p"), true);
  assert.equal(hasBriefHeading("add a fee; see ## Brief in the wiki\n### Brief\n"), false);
});

test("the message lines are purpose, in scope, out of scope in that order, and none without a brief", () => {
  assert.deepEqual(briefLines(BRIEF), ["purpose: bill late fees", "in scope: the fees module", "out of scope: refunds"]);
  assert.deepEqual(briefLines(null), []);
});
