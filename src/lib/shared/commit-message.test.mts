import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCommitMessage, COMMIT_TYPES } from "./commit-message.mts";

const problemOf = (raw: string): string => {
  const checked = checkCommitMessage(raw);
  assert.ok("problem" in checked, `expected a problem for ${JSON.stringify(raw)}, got ${JSON.stringify(checked)}`);
  return checked.problem;
};

test("checkCommitMessage drops the staged tail, wrapping backticks or quotes and one trailing period (T-1.1)", () => {
  assert.deepEqual(checkCommitMessage("`feat(x): y.` (staged; approval commits it)"), { message: "feat(x): y" });
  assert.deepEqual(checkCommitMessage('"fix: a."'), { message: "fix: a" });
  assert.deepEqual(checkCommitMessage("'docs: b'"), { message: "docs: b" });
});

test("checkCommitMessage keeps the body after the blank line unchanged (T-1.1)", () => {
  assert.deepEqual(checkCommitMessage("test(x): drop two tests.\n\nDropped:\n- \"a\": now in b.test\n  and c.test"), {
    message: 'test(x): drop two tests\n\nDropped:\n- "a": now in b.test\n  and c.test',
  });
});

test("checkCommitMessage accepts a breaking-change mark and a scope without spaces", () => {
  assert.deepEqual(checkCommitMessage("refactor(route/apply)!: one message"), { message: "refactor(route/apply)!: one message" });
});

test("checkCommitMessage refuses a sha, a capitalised type, a missing space, a free subject and an empty subject (T-1.2)", () => {
  for (const raw of ["3f9c2a1", "Feat: y", "feat(x):y", "Pricing, phase 1 of x", "feat: ", "feat(a b): y", ""]) problemOf(raw);
});

test("checkCommitMessage takes a 72-character subject and refuses a 73-character one (T-1.2)", () => {
  const at72 = `feat: ${"a".repeat(66)}`;
  assert.deepEqual(checkCommitMessage(at72), { message: at72 });
  assert.match(problemOf(`feat: ${"a".repeat(67)}`), /73 characters/);
});

test("checkCommitMessage counts code points, not UTF-16 units", () => {
  const subject = `feat: ${"😀".repeat(66)}`;
  assert.deepEqual(checkCommitMessage(subject), { message: subject });
});

test("every commit problem names all ten types and the limit 72 (T-1.2)", () => {
  for (const raw of ["3f9c2a1", "Feat: y", "feat(x):y", "Pricing, phase 1 of x", `feat: ${"a".repeat(67)}`]) {
    const problem = problemOf(raw);
    for (const type of COMMIT_TYPES) assert.ok(problem.includes(type), `${problem} lacks ${type}`);
    assert.match(problem, /\b72\b/);
  }
});
