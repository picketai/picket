import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY_CHARS, glossaryBody, injectedGlossary } from "./glossary.mts";

const NOTE = "Cut at 6,000 characters; read .claude/MEMORY.md for the rest.";
const HEAD = "x".repeat(5000);
const TAIL = "y".repeat(1500);

function assertCut(out: string, kept: string) {
  assert.equal(out, `${kept}\n\n${NOTE}`);
  assert.ok(kept.length <= GLOSSARY_CHARS, String(kept.length));
}

test("a body of 5,999 or exactly 6,000 characters is injected whole with no note", () => {
  for (const length of [5999, 6000]) {
    const body = `${"a".repeat(length - 10)}\n${"b".repeat(9)}`;
    assert.equal(injectedGlossary(body), body, String(length));
  }
});

test("an over-limit body is cut before a **Term** that follows a blank line", () => {
  assertCut(injectedGlossary(`${HEAD}\n\n**Term**:\n${TAIL}`), HEAD);
});

test("an over-limit body is cut before the last - ** decision line in range", () => {
  assertCut(injectedGlossary(`${HEAD}\n- **First**: a\n- **Second**: ${TAIL}`), `${HEAD}\n- **First**: a`);
});

test("an over-limit body is cut before a ## heading", () => {
  assertCut(injectedGlossary(`${HEAD}\n## Decisions\n${TAIL}`), HEAD);
});

test("a ** line with no blank line before it is not an entry boundary", () => {
  assertCut(injectedGlossary(`${HEAD}\n\n**Term**:\n**Bold** ${TAIL}`), HEAD);
});

test("a body with no entry boundary in range is cut at the last whole line", () => {
  const kept = `${"a".repeat(3000)}\n${"b".repeat(2000)}`;
  assertCut(injectedGlossary(`${kept}\n${"c".repeat(2000)}`), kept);
});

test("a body whose first line passes the limit is injected as the note alone", () => {
  assert.equal(injectedGlossary(`${"a".repeat(6001)}\nb`), NOTE);
});

test("a CRLF body is measured and injected as LF, so an LF length of 6,000 stays whole", () => {
  const crlf = `${"a".repeat(2999)}\r\n${"b".repeat(3000)}`;
  assert.equal(glossaryBody(crlf).includes("\r"), false);
  assert.equal(injectedGlossary(crlf), `${"a".repeat(2999)}\n${"b".repeat(3000)}`);
});
