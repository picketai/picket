import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(".");
const OLD_NAME = /tether/i;
const RECORD_FOLDERS = ["work/", "artifacts/", "bench/results/", "spike/"];
const PROJECT_MEMORY = ".claude/MEMORY.md";
const SUPERSEDED = "[superseded";
const THIS_FILE = "test/names-picket.test.mjs";

function isRecord(file) {
  return file === THIS_FILE || RECORD_FOLDERS.some((folder) => file.startsWith(folder));
}

function isExemptLine(file, line) {
  return file === PROJECT_MEMORY && line.includes(SUPERSEDED);
}

function offendingLines(file, text) {
  if (OLD_NAME.test(file)) return [`${file}: file name`];
  if (text.includes("\0")) return [];
  return text
    .split(/\r?\n/)
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => OLD_NAME.test(line) && !isExemptLine(file, line))
    .map(({ line, n }) => `${file}:${n}: ${line.trim().slice(0, 120)}`);
}

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.split("\0").filter((file) => file && existsSync(join(ROOT, file)));
}

test("no tracked file outside the records names the old product", () => {
  const offenders = trackedFiles()
    .filter((file) => !isRecord(file))
    .flatMap((file) => offendingLines(file, readFileSync(join(ROOT, file), "utf8")));
  assert.deepEqual(offenders, []);
});

test("the old name is flagged in a shipped skill and in a current memory line, in any case", () => {
  assert.equal(offendingLines("core/skills/ordering/SKILL.md", "Run `picket next`.\nThen ask Tether.").length, 1);
  assert.equal(offendingLines(PROJECT_MEMORY, "- **Name** (2026-10-10): the CLI was TETHER.").length, 1);
  assert.equal(offendingLines("core/skills/ordering/SKILL.md", "Run `picket next`.").length, 0);
});

test("only a superseded line of the project memory and the record folders are exempt", () => {
  assert.equal(offendingLines(PROJECT_MEMORY, "- **Old name tether** [superseded 2026-10-10 by Picket]").length, 0);
  assert.equal(offendingLines("README.md", "- **Old name tether** [superseded 2026-10-10 by Picket]").length, 1);
  for (const file of ["work/x/design.md", "artifacts/strategy/decisions/00001-a.md", "bench/results/r.json", "spike/a.md", THIS_FILE]) assert.equal(isRecord(file), true, file);
  for (const file of ["core/bin/picket.mjs", "test/kernel/names.test.mjs", "workflows/a.md"]) assert.equal(isRecord(file), false, file);
});
