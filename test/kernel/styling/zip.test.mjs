import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { extractEntry, readEntries } from "../../../core/lib/styling/zip.mjs";
import { buildZip } from "./host-fixture.mjs";

function withZip(entries, fn) {
  const dir = mkdtempSync(join(tmpdir(), "picket-zip-"));
  try {
    const path = join(dir, "test.zip");
    writeFileSync(path, buildZip(entries));
    fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("readEntries and extractEntry read a stored and a deflated entry back byte for byte (T-4.1)", () => {
  const stored = Buffer.from("stored bytes\n");
  const deflated = Buffer.from("deflated ".repeat(200));
  const entries = [
    { name: "a/stored.txt", data: stored },
    { name: "b/deflated.ttf", data: deflated, compressed: deflateRawSync(deflated), method: 8 },
  ];
  withZip(entries, (path) => {
    const read = readEntries(path);
    assert.deepEqual(read.map((entry) => [entry.name, entry.method, entry.size]), [["a/stored.txt", 0, stored.length], ["b/deflated.ttf", 8, deflated.length]]);
    assert.ok(extractEntry(path, read[0]).equals(stored));
    assert.ok(extractEntry(path, read[1]).equals(deflated));
  });
});

test("an entry with the encryption flag throws (T-4.1)", () => {
  withZip([{ name: "secret.ttf", data: Buffer.from("x"), flags: 1 }], (path) => {
    assert.throws(() => readEntries(path), /encrypted/);
  });
});

test("a deflated entry that inflates past its recorded size throws", () => {
  const data = Buffer.from("z".repeat(1000));
  withZip([{ name: "bomb.ttf", data: data.subarray(0, 10), compressed: deflateRawSync(data), method: 8 }], (path) => {
    assert.throws(() => extractEntry(path, readEntries(path)[0]));
  });
});

test("a file that is not a zip throws", () => {
  const dir = mkdtempSync(join(tmpdir(), "picket-zip-"));
  try {
    const path = join(dir, "plain.txt");
    writeFileSync(path, "not a zip");
    assert.throws(() => readEntries(path), /not a zip/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
