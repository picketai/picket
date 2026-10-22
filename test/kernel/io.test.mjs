import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendJsonl, readJson, readJsonl, readText } from "../../dist/lib/io.mjs";

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "picket-io-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("readJsonl keeps valid rows, ignores blank lines and counts a bad line as skipped (T-1.4)", () => {
  withTempDir((dir) => {
    const path = join(dir, "log.jsonl");
    writeFileSync(path, '{"a":1}\r\n\n{bad\n{"a":2}\n');
    assert.deepEqual(readJsonl(path), { rows: [{ a: 1 }, { a: 2 }], skipped: 1 });
  });
});

test("readJsonl on a missing file is no rows and nothing skipped (T-1.4)", () => {
  withTempDir((dir) => assert.deepEqual(readJsonl(join(dir, "none.jsonl")), { rows: [], skipped: 0 }));
});

test("readText and readJson are null for a missing file (T-1.4)", () => {
  withTempDir((dir) => {
    assert.equal(readText(join(dir, "none.txt")), null);
    assert.equal(readJson(join(dir, "none.json")), null);
  });
});

test("readJson parses a file and is null for text that is not JSON", () => {
  withTempDir((dir) => {
    writeFileSync(join(dir, "good.json"), '{"k":[1]}');
    writeFileSync(join(dir, "bad.json"), "{ not json");
    assert.deepEqual(readJson(join(dir, "good.json")), { k: [1] });
    assert.equal(readJson(join(dir, "bad.json")), null);
  });
});

test("readText throws for an error other than a missing file", () => {
  withTempDir((dir) => assert.throws(() => readText(dir), (err) => err.code === "EISDIR" || err.code === "EPERM"));
});

test("appendJsonl creates a missing folder and appends one line per row (T-1.4)", () => {
  withTempDir((dir) => {
    const path = join(dir, "a", "b", "log.jsonl");
    appendJsonl(path, { n: 1 });
    appendJsonl(path, { n: 2 });
    assert.equal(readFileSync(path, "utf8"), '{"n":1}\n{"n":2}\n');
  });
});
