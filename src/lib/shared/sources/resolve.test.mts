import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReferences } from "./resolve.mts";
import { candidate, lookupOf, only } from "#test/lookup.mts";

const analysis = { name: "analysis", env: "X_ANALYSIS", root: "/sources/analysis", reason: null };
const specs = { name: "specs", env: "X_SPECS", root: null, reason: "X_SPECS is not set" };

test("one candidate resolves single, with its bytes", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true })] } });
  const { refs, bytes } = resolveReferences("see docs/fees.md", [analysis], lookup);
  assert.deepEqual(only(refs[0], "ref", "source", "status", "chosen_by", "branch", "snapshot"), { ref: "docs/fees.md", source: "analysis", status: "resolved", chosen_by: "single", branch: "main", snapshot: null });
  assert.deepEqual(bytes.get("docs/fees.md"), Buffer.from("main"));
});

test("two places with the same hash resolve identical to the main worktree", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("feature/x", "aaa"), candidate("main", "aaa", { main: true })] } });
  const { refs } = resolveReferences("see docs/fees.md", [analysis], lookup);
  assert.deepEqual(only(refs[0], "status", "chosen_by", "branch"), { status: "resolved", chosen_by: "identical", branch: "main" });
});

test("the same hash with no main worktree resolves identical to the first place", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("feat-x", "aaa"), candidate("old", "aaa")] } });
  const { refs } = resolveReferences("see docs/fees.md", [analysis], lookup);
  assert.deepEqual(only(refs[0], "chosen_by", "branch"), { chosen_by: "identical", branch: "feat-x" });
});

test("differing hashes are ambiguous, the labels in place order and no bytes kept", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true }), candidate("feat-x", "bbb"), candidate("old", "aaa")] } });
  const { refs, bytes } = resolveReferences("see docs/fees.md", [analysis], lookup);
  assert.deepEqual(refs, [{ ref: "docs/fees.md", source: "analysis", path: "docs/fees.md", status: "ambiguous", candidates: ["main", "feat-x", "old"] }]);
  assert.equal(bytes.size, 0);
});

test("a pin resolves to the candidate on its branch", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true }), candidate("old", "bbb")] } });
  const { refs, failures } = resolveReferences("per analysis@old:docs/fees.md", [analysis], lookup);
  assert.deepEqual(failures, []);
  assert.deepEqual(only(refs[0], "ref", "path", "chosen_by", "branch", "sha256"), { ref: "analysis@old:docs/fees.md", path: "docs/fees.md", chosen_by: "pin", branch: "old", sha256: "bbb" });
});

test("a pin on a branch without the document fails naming the path, the branch and every place searched", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true })], "docs/other.md": [candidate("feat-x", "ccc"), candidate("old", "ddd")] } });
  const { refs, failures } = resolveReferences("per analysis@old:docs/fees.md", [analysis], lookup);
  assert.deepEqual(refs, []);
  assert.deepEqual(failures, ["analysis@old:docs/fees.md: no docs/fees.md on branch old; searched main, feat-x, old"]);
});

test("a pin to an unreachable source fails with its reason", () => {
  const { failures } = resolveReferences("per specs@main:docs/fees.md", [analysis, specs], lookupOf({}));
  assert.deepEqual(failures, ["specs@main:docs/fees.md: source specs is unreachable (X_SPECS is not set)"]);
});

test("a pin to an undeclared source fails as not declared", () => {
  const { failures } = resolveReferences("per notes@main:docs/fees.md", [analysis], lookupOf({}));
  assert.deepEqual(failures, ["notes@main:docs/fees.md: source notes is not declared"]);
});

test("an unshaped path and a path found nowhere go to unmatched, once each", () => {
  const { refs, unmatched } = resolveReferences("see docs/ré/x.md, notes/missing.md and notes/missing.md", [analysis], lookupOf({}));
  assert.deepEqual(refs, []);
  assert.deepEqual(unmatched, ["docs/ré/x.md", "notes/missing.md"]);
});

test("a story naming 300 documents resolves at most 200", () => {
  const paths = Array.from({ length: 300 }, (_, i) => `d/f${i}.md`);
  const lookup = lookupOf({ analysis: Object.fromEntries(paths.map((p) => [p, [candidate("main", p, { main: true })]])) });
  assert.equal(resolveReferences(paths.join(" "), [analysis], lookup).refs.length, 200);
});

test("the #anchor of a reference stays on its resolved record", () => {
  const lookup = lookupOf({ analysis: { "docs/fees.md": [candidate("main", "aaa", { main: true })] } });
  const { refs } = resolveReferences("see docs/fees.md#late-fees", [analysis], lookup);
  assert.deepEqual(only(refs[0], "ref", "anchor"), { ref: "docs/fees.md", anchor: "late-fees" });
});
