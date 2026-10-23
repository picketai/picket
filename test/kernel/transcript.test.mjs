import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { entriesFromEnd } from "../../dist/lib/shared/transcript/tail.mjs";
import { detectBlock } from "../../dist/lib/shared/work/block.mjs";

const LINES = 6000;
const CORRUPT_AT = 4321;
const PAD = "x".repeat(1000);

function lineOf(n) {
  if (n === CORRUPT_AT) return `{not json ${PAD}`;
  const name = n % 100 === 0 ? "Skill" : "Read";
  return JSON.stringify({ type: "assistant", n, message: { content: [{ type: "tool_use", name }] }, pad: PAD });
}

function withTranscript(fn) {
  const dir = mkdtempSync(join(tmpdir(), "transcript-"));
  const path = join(dir, "t.jsonl");
  const lines = Array.from({ length: LINES }, (_, n) => lineOf(n));
  writeFileSync(path, lines.join("\n"));
  try {
    fn(path, lines);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function numbers(path, options) {
  return [...entriesFromEnd(path, options)].map((entry) => entry.n);
}

function readable(n) {
  return n !== CORRUPT_AT;
}

test("entriesFromEnd yields every readable entry once, newest first, across all three windows", () => {
  withTranscript((path) => {
    const all = Array.from({ length: LINES }, (_, n) => LINES - 1 - n).filter(readable);
    assert.deepEqual(numbers(path), all);
  });
});

test("entriesFromEnd with a 512 KiB bound yields only the entries wholly inside the last 512 KiB", () => {
  withTranscript((path, lines) => {
    const size = Buffer.byteLength(readFileSync(path));
    const start = size - 512 * 1024;
    let offset = 0;
    const inside = [];
    lines.forEach((line, n) => {
      if (offset > start && readable(n)) inside.push(n);
      offset += Buffer.byteLength(line) + 1;
    });
    assert.ok(inside.length > 400 && inside.length < 520, `${inside.length} entries`);
    assert.deepEqual(numbers(path, { maxBytes: 512 * 1024 }), inside.reverse());
  });
});

test("entriesFromEnd with contains parses only the lines holding that text", () => {
  withTranscript((path) => {
    const skills = Array.from({ length: LINES / 100 }, (_, k) => LINES - 100 - k * 100);
    assert.deepEqual(numbers(path, { contains: '"Skill"' }), skills);
  });
});

test("entriesFromEnd keeps a last line that has no newline", () => {
  withTranscript((path) => {
    assert.equal(readFileSync(path, "utf8").endsWith("\n"), false);
    assert.equal(entriesFromEnd(path).next().value.n, LINES - 1);
  });
});

test("entriesFromEnd yields nothing for a missing transcript", () => {
  assert.deepEqual([...entriesFromEnd(join(tmpdir(), "no-such-transcript.jsonl"))], []);
  assert.deepEqual([...entriesFromEnd(null)], []);
});

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
  const exporters = readdirSync(src, { recursive: true })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => /\.m[jt]s$/.test(file) && /export function detectBlock\b/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(exporters, ["lib/shared/work/block.mts"]);
});
