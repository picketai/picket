import { test } from "node:test";
import assert from "node:assert/strict";
import { pickMutant } from "./mutant.mts";
import { gitOut, gitRepo, writeIn } from "#test/git.mts";

const SOURCE = "export function same(a, b) {\n  return 0;\n}\n";

test("an operator in a string or comment is never mutated, and a test file is never chosen (T-6.4)", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": SOURCE } });
  const base = gitOut(root, "rev-parse", "HEAD");
  writeIn(root, "src/same.js", SOURCE.replace("return 0;", 'return 0;\n  const s = "a === b"; // a && b'));
  writeIn(root, "test/same.test.js", "if (a === b) throw new Error();\n");
  writeIn(root, "src/same.test.js", "expect(a === b).toBe(true);\n");
  assert.equal(pickMutant(root, base), null);
  writeIn(root, "src/later.js", "const ok = a < b && c;\n");
  assert.deepEqual(pickMutant(root, base), { path: "src/later.js", line: 1, col: 13, from: "<", to: ">=" });
});

test("generics and arrows are not comparisons; the first operator by path, line and column is picked", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": SOURCE } });
  const base = gitOut(root, "rev-parse", "HEAD");
  writeIn(root, "src/b.ts", "const m: Map<string, number> = new Map();\nconst f = (x) => x;\nconst t = x >= 1 || false;\n");
  writeIn(root, "src/a.ts", "const y = 1;\n");
  writeIn(root, "src/c.ts", "const z = a === b;\n");
  assert.deepEqual(pickMutant(root, base), { path: "src/b.ts", line: 3, col: 12, from: ">=", to: "<" });
});
