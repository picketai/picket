import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entriesFromEnd } from "./tail.mts";
import { withProject } from "#test/project.mts";

const LINES = 6000;
const CORRUPT_AT = 4321;
const PAD = "x".repeat(1000);

function lineOf(n: number): string {
  if (n === CORRUPT_AT) return `{not json ${PAD}`;
  const name = n % 100 === 0 ? "Skill" : "Read";
  return JSON.stringify({ type: "assistant", n, message: { content: [{ type: "tool_use", name }] }, pad: PAD });
}

function transcript(t: TestContext): { path: string; lines: string[] } {
  const path = join(withProject(t, { picket: false }), "t.jsonl");
  const lines = Array.from({ length: LINES }, (_, n) => lineOf(n));
  writeFileSync(path, lines.join("\n"));
  return { path, lines };
}

function numbers(path: string, options?: Parameters<typeof entriesFromEnd>[1]): unknown[] {
  return [...entriesFromEnd(path, options)].map((entry: any) => entry.n);
}

function readable(n: number): boolean {
  return n !== CORRUPT_AT;
}

test("entriesFromEnd yields every readable entry once, newest first, across all three windows", (t) => {
  const { path } = transcript(t);
  const all = Array.from({ length: LINES }, (_, n) => LINES - 1 - n).filter(readable);
  assert.deepEqual(numbers(path), all);
});

test("entriesFromEnd with a 512 KiB bound yields only the entries wholly inside the last 512 KiB", (t) => {
  const { path, lines } = transcript(t);
  const size = Buffer.byteLength(readFileSync(path));
  const start = size - 512 * 1024;
  let offset = 0;
  const inside: number[] = [];
  lines.forEach((line, n) => {
    if (offset > start && readable(n)) inside.push(n);
    offset += Buffer.byteLength(line) + 1;
  });
  assert.ok(inside.length > 400 && inside.length < 520, `${inside.length} entries`);
  assert.deepEqual(numbers(path, { maxBytes: 512 * 1024 }), inside.reverse());
});

test("entriesFromEnd with contains parses only the lines holding that text", (t) => {
  const { path } = transcript(t);
  const skills = Array.from({ length: LINES / 100 }, (_, k) => LINES - 100 - k * 100);
  assert.deepEqual(numbers(path, { contains: '"Skill"' }), skills);
});

test("entriesFromEnd keeps a last line that has no newline", (t) => {
  const { path } = transcript(t);
  assert.equal(readFileSync(path, "utf8").endsWith("\n"), false);
  assert.equal((entriesFromEnd(path).next().value as any).n, LINES - 1);
});

test("entriesFromEnd yields nothing for a missing transcript", () => {
  assert.deepEqual([...entriesFromEnd(join(tmpdir(), "no-such-transcript.jsonl"))], []);
  assert.deepEqual([...entriesFromEnd(null)], []);
});
