import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hostMismatchReport, hostTypeErrors } from "../../scripts/mods-report.mjs";

const FIXTURE = new URL("./mods-report/validate-2.1.325.json", import.meta.url);
const DIST_ROOT = "/repo/dist";
const TYPE_ERROR_MESSAGE = /^error TS\d+:/;

function fixture() {
  return JSON.parse(readFileSync(FIXTURE, "utf8"));
}

function withoutTypeErrors(report) {
  const keep = (findings) => findings.filter((finding) => !TYPE_ERROR_MESSAGE.test(finding.message));
  const strip = (section) => ({ ...section, errors: keep(section.errors), warnings: keep(section.warnings) });
  return { ...report, manifest: strip(report.manifest), contents: report.contents.map(strip) };
}

function countsByFile(errors) {
  const counts = new Map();
  for (const { file } of errors) counts.set(file, (counts.get(file) ?? 0) + 1);
  return Object.fromEntries(counts);
}

test("hostTypeErrors reads the 27 type errors of the 2.1.325 report, by file and in report order (T-1.2)", () => {
  const errors = hostTypeErrors(fixture(), DIST_ROOT);
  assert.equal(errors.length, 27);
  assert.deepEqual(errors[0], { file: "hooks/mods/index.tsx", line: 38, column: 57, code: "TS2345" });
  assert.deepEqual(countsByFile(errors), {
    "hooks/mods/index.tsx": 1,
    "hooks/mods/markdown/hooks/index.test.tsx": 16,
    "hooks/mods/markdown/hooks/index.tsx": 1,
    "hooks/mods/markdown/hooks/picket-markdown.test.tsx": 2,
    "hooks/mods/status/hooks/index.test.tsx": 7,
  });
});

test("hostTypeErrors counts nothing in a report whose type errors are removed, notes, advice and directory findings included (T-1.3)", () => {
  assert.deepEqual(hostTypeErrors(withoutTypeErrors(fixture()), DIST_ROOT), []);
});

test("hostMismatchReport names the version and count, then one location line per error in report order (T-1.4)", () => {
  const errors = hostTypeErrors(fixture(), DIST_ROOT);
  const lines = hostMismatchReport("2.1.325", errors).split("\n");
  assert.equal(lines.length, 28);
  assert.equal(lines[0], "mods: the mods do not match the hook API types of Claude Code 2.1.325: 27 type errors");
  assert.equal(lines[1], "  hooks/mods/index.tsx:38:57 TS2345");
  assert.ok(lines.includes("  hooks/mods/markdown/hooks/index.tsx:75:17 TS2345"));
  assert.deepEqual(lines.slice(1), errors.map(({ file, line, column, code }) => `  ${file}:${line}:${column} ${code}`));
});

test("the captured report names every file under /repo/dist/, so no machine path is committed (T-1.5)", () => {
  const report = fixture();
  const files = [report.manifest.file, ...report.contents.map((section) => section.file)];
  assert.ok(files.length > 0);
  for (const file of files) assert.ok(file.startsWith("/repo/dist/"), file);
});
