import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const TSC = resolve("node_modules/typescript/bin/tsc");
const FIXTURE_ERROR = /mistakes\.mts\((\d+),\d+\): error TS(\d+):/;

const EXPECTED = [
  [8, 2367],
  [9, 2345],
  [10, 2345],
  [11, 2322],
  [12, 1294],
  [13, 7060],
];

function errorLines(output) {
  return output.split(/\r?\n/).filter((line) => /: error TS\d+:/.test(line));
}

function fixtureErrors(lines) {
  return lines.map((line) => line.match(FIXTURE_ERROR)).filter(Boolean).map(([, line, code]) => [Number(line), Number(code)]);
}

test("the type checker rejects each mistake in the fixture on its own line and nothing else (T-2.3)", () => {
  const r = spawnSync(process.execPath, [TSC, "-p", "test/type-rules", "--pretty", "false"], { encoding: "utf8" });
  const lines = errorLines(`${r.stdout}${r.stderr}`);
  assert.notEqual(r.status, 0);
  assert.deepEqual(fixtureErrors(lines), EXPECTED);
  assert.equal(lines.length, EXPECTED.length, lines.join("\n"));
});

test("the error parser reads the line and code of a fixture error and ignores other files", () => {
  const output = ["a/mistakes.mts(4,2): error TS2345: no", "src/x.mts(1,1): error TS1005: other", "  detail line"].join("\n");
  assert.deepEqual(errorLines(output).length, 2);
  assert.deepEqual(fixtureErrors(errorLines(output)), [[4, 2345]]);
});
