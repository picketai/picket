import { test } from "node:test";
import assert from "node:assert/strict";
import { DIRECTIVE_MARKERS, SUPPRESSION_MARKERS } from "../../dist/lib/shared/comments.mjs";
import { THRESHOLDS, hasThresholds, isTestPath, normaliseLine, scansPath, silencedMoves } from "../../dist/lib/shared/silenced.mjs";

const lines = (...rows) => rows.join("\n");
const kinds = (rel, before, after, bar) => silencedMoves({ rel, before, after, bar }).map((m) => m.kind);

test("every suppression marker is also a directive the comment ban exempts, with no regex written twice", () => {
  for (const marker of SUPPRESSION_MARKERS) assert.ok(DIRECTIVE_MARKERS.includes(marker), String(marker));
  const sources = DIRECTIVE_MARKERS.map(String);
  assert.equal(new Set(sources).size, sources.length);
});

for (const [rel, added, kind] of [
  ["test/fee.test.ts", 'it.skip("rounds half up", () => {});', "skipped-test"],
  ["test/fee.test.ts", 'describe.only("fees", () => {});', "focused-test"],
  ["test/fee.test.ts", 'test.todo("rounds half up");', "skipped-test"],
  ["spec/fee.spec.js", 'xit("rounds", () => {});', "skipped-test"],
  ["spec/fee.spec.js", 'fdescribe("fees", () => {});', "focused-test"],
  ["tests/FeeTests.cs", '[Fact(Skip = "flaky")]', "skipped-test"],
  ["tests/FeeTests.cs", '[Ignore("later")]', "skipped-test"],
  ["tests/test_fee.py", '@pytest.mark.skipif(sys.platform == "win32", reason="x")', "skipped-test"],
  ["tests/test_fee.py", "@unittest.skip", "skipped-test"],
  ["src/test/java/FeeTest.java", "@Disabled", "skipped-test"],
  ["pkg/fee_test.go", 't.Skip("later")', "skipped-test"],
  ["src/fee.ts", "// eslint-disable-next-line no-console", "suppression"],
  ["src/fee.ts", "// @ts-expect-error", "suppression"],
  ["src/fee.py", "x = 1  # noqa", "suppression"],
  ["src/fee.py", "y = f()  # type: ignore", "suppression"],
  ["src/Fee.cs", "#pragma warning disable CS0168", "suppression"],
  ["src/fee.go", "x := 1 //nolint", "suppression"],
]) {
  test(`${rel}: "${added}" is a ${kind}`, () => {
    const moves = silencedMoves({ rel, before: "a();", after: lines(added, "a();") });
    assert.deepEqual(moves, [{ kind, text: normaliseLine(added) }]);
  });
}

test("a kept or moved line is never new", () => {
  const skip = 'it.skip("old", () => {});';
  assert.deepEqual(kinds("test/a.test.ts", lines(skip, "a();"), lines(skip, "a();", "b();")), [], "kept");
  assert.deepEqual(kinds("test/a.test.ts", lines(skip, "a();"), lines("a();", "  " + skip)), [], "moved and reindented");
  assert.deepEqual(kinds("test/a.test.ts", skip, lines(skip, skip)), ["skipped-test"], "a second copy is new");
});

test("a skip inside a string, in markdown, or in a non-test source file is allowed", () => {
  assert.deepEqual(kinds("test/a.test.ts", "", 'const s = ".skip(";'), []);
  assert.deepEqual(kinds("test/a.test.ts", "", 'const s = "it.only(";'), []);
  assert.deepEqual(kinds("docs/testing.md", "", 'it.skip("x", () => {});'), []);
  assert.deepEqual(kinds("src/runner.ts", "", 'it.skip("x", () => {});'), []);
  assert.deepEqual(kinds("test/page.html", "", 'it.skip("x", () => {});'), [], "skip patterns skip markup files");
});

test("a suppression in a markup file is found in its markup comment or its script block", () => {
  assert.deepEqual(kinds("test/page.html", "", "<!-- eslint-disable -->"), ["suppression"]);
  assert.deepEqual(kinds("src/Card.vue", "<script setup>", lines("<script setup>", "// eslint-disable-next-line vue/no-mutating-props")), ["suppression"]);
  assert.deepEqual(kinds("src/Card.svelte", "", "/* istanbul ignore next */"), ["suppression"]);
  assert.ok(scansPath("src/Card.vue"));
});

test("a marker word outside a comment is not a suppression, nor is a mypy setting that tightens a check", () => {
  assert.deepEqual(kinds("src/a.ts", "", "const opts = { type: ignoreCase };"), []);
  assert.deepEqual(kinds("src/a.ts", "", "const nolintRules = [];"), []);
  assert.deepEqual(kinds("src/a.py", "", "# mypy: disallow-untyped-defs"), []);
  assert.deepEqual(kinds("src/a.py", "", "# mypy: ignore-errors"), ["suppression"]);
  assert.deepEqual(kinds("src/Fee.cs", "", '[SuppressMessage("Style", "IDE0060")]'), ["suppression"]);
});

test("isTestPath is the shape lint.craft used for test files", () => {
  for (const p of ["test/a.mjs", "src/__tests__/a.js", "a.test.ts", "a.spec.js", "FeeTests.cs", "fee_test.go", "test_fee.py", "spec/a.rb"]) assert.ok(isTestPath(p), p);
  for (const p of ["src/fee.ts", "src/contest/fee.ts", "lib/specify.mjs", "src/versions/latest.ts", "src/contest.js", "app/protest.py", "src/Latest.cs"]) assert.equal(isTestPath(p), false, p);
  for (const p of ["src/FeeTest.java", "src/test.js", "src/fee-test.ts", "src/Orders.Tests.cs"]) assert.ok(isTestPath(p), p);
});

test("a coverage threshold lowered below its previous value is a threshold move; raised is not", () => {
  const before = lines("export default {", "  test: { coverage: { thresholds: { lines: 80 } } },", "};");
  assert.deepEqual(kinds("vitest.config.ts", before, before.replace("lines: 80", "lines: 70")), ["threshold"]);
  assert.deepEqual(kinds("vitest.config.ts", before, before.replace("lines: 80", "lines: 90")), []);
});

test("a fresh threshold under the quality bar is a move; at or above it is not", () => {
  const written = lines("export default {", "  test: { coverage: { thresholds: { lines: 80 } } },", "};");
  assert.deepEqual(kinds("vitest.config.ts", "", written, { coverage_min: 85 }), ["threshold"]);
  assert.deepEqual(kinds("vitest.config.ts", "", written, { coverage_min: 80 }), []);
  assert.deepEqual(kinds("vitest.config.ts", "", written, {}), []);
});

test("raising --max-warnings in package.json is a move; lowering it is not", () => {
  const pkg = (n) => lines("{", `  "scripts": { "lint": "eslint . --max-warnings ${n}" }`, "}");
  assert.deepEqual(kinds("package.json", pkg(0), pkg(5)), ["threshold"]);
  assert.deepEqual(kinds("package.json", pkg(5), pkg(0)), []);
  assert.deepEqual(kinds("package.json", "", pkg(3), { max_warnings: 0 }), ["threshold"]);
});

for (const [rel, before, after] of [
  ["package.json", '"coverageThreshold": { "global": { "branches": 90 } }', '"coverageThreshold": { "global": { "branches": 60 } }'],
  ["package.json", '"test": "c8 --check-coverage --lines 90 node --test"', '"test": "c8 --check-coverage --lines 50 node --test"'],
  [".nycrc.json", '"statements": 95,', '"statements": 75,'],
  ["jest.config.js", "functions: 90,", "functions: 10,"],
  ["pyproject.toml", 'addopts = "--cov-fail-under=90"', 'addopts = "--cov-fail-under=70"'],
  ["setup.cfg", "fail_under = 90", "fail_under = 80"],
  ["tests/Fee.Tests.csproj", "<Threshold>90</Threshold>", "<Threshold>70</Threshold>"],
]) {
  test(`THRESHOLDS: ${rel} "${after}" is weaker than "${before}"`, () => {
    assert.deepEqual(kinds(rel, before, after), ["threshold"]);
    assert.deepEqual(kinds(rel, after, before), []);
  });
}

test("every THRESHOLDS row names a direction and a quality bar key", () => {
  for (const row of THRESHOLDS) {
    assert.ok(["higher", "lower"].includes(row.stricter), row.tool);
    assert.ok(["coverage_min", "max_warnings"].includes(row.bar), row.tool);
    assert.ok(row.key.flags.includes("g"), row.tool);
  }
});

test("an unknown file never yields a threshold move", () => {
  assert.equal(hasThresholds("src/coverage.ts"), false);
  assert.deepEqual(kinds("src/coverage.ts", "const lines = { lines: 80 };", "const lines = { lines: 10 };"), []);
});

test("scansPath covers code files and threshold files only", () => {
  assert.ok(scansPath("src/a.ts"));
  assert.ok(scansPath("package.json"));
  assert.ok(scansPath("pytest.ini"));
  assert.equal(scansPath("README.md"), false);
  assert.ok(scansPath("src/a.html"), "markup is scanned for suppressions");
});
