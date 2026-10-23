import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ambiguousRefs, readIntake, SNAPSHOT_MAX_BYTES, writeIntake } from "./intake.mts";
import { resolvedRef, type AmbiguousRef } from "./resolve.mts";
import { parse } from "../../util/yaml-lite.mts";
import { workId } from "../work/files.mts";
import { candidate } from "#test/lookup.mts";
import { withProject } from "#test/project.mts";

const ID = workId("20261023-intake");

function itemRoot(t: TestContext): string {
  const root = withProject(t, { picket: false });
  mkdirSync(join(root, "work", ID), { recursive: true });
  return root;
}

const main = candidate("main", "aaa", { main: true, worktree: "/sources/analysis", commit: "c0ffee", bytes: Buffer.from("# Fees\n") });
const fees = resolvedRef({ ref: "docs/fees.md", path: "docs/fees.md", anchor: "late" }, "analysis", main, "single");
const pricing: AmbiguousRef = { ref: "docs/pricing.md", source: "analysis", path: "docs/pricing.md", status: "ambiguous", candidates: ["main", "feat-x"] };

function writtenRefs(root: string): any[] {
  return parse(readFileSync(join(root, "work", ID, "sources.yaml"), "utf8")).refs as any[];
}

test("both record kinds are written in today's key order, with the snapshot bytes", (t) => {
  const root = itemRoot(t);
  writeIntake(root, ID, { refs: [fees, pricing], unmatched: ["notes/x.md"], failures: [], bytes: new Map([["docs/fees.md", main.bytes]]) });
  const [resolved, ambiguous] = writtenRefs(root);
  assert.deepEqual(Object.keys(resolved), ["ref", "source", "path", "status", "chosen_by", "worktree", "branch", "commit", "sha256", "dirty", "snapshot", "anchor"]);
  assert.deepEqual(Object.keys(ambiguous), ["ref", "source", "path", "status", "candidates"]);
  assert.equal(resolved.snapshot, "sources/analysis/docs/fees.md");
  assert.equal(readFileSync(join(root, "work", ID, resolved.snapshot), "utf8"), "# Fees\n");
  assert.deepEqual(readIntake(root, ID)?.unmatched, ["notes/x.md"]);
});

test("a document over the snapshot cap is recorded with snapshot null and the reason, and no file", (t) => {
  const root = itemRoot(t);
  const big = resolvedRef({ ref: "docs/big.md", path: "docs/big.md" }, "analysis", main, "single");
  writeIntake(root, ID, { refs: [big], unmatched: [], failures: [], bytes: new Map([["docs/big.md", Buffer.alloc(SNAPSHOT_MAX_BYTES + 1)]]) });
  const [ref] = writtenRefs(root);
  assert.equal(ref.snapshot, null);
  assert.equal(ref.snapshot_reason, `${SNAPSHOT_MAX_BYTES + 1} bytes, over the ${SNAPSHOT_MAX_BYTES}-byte snapshot cap`);
  assert.equal(existsSync(join(root, "work", ID, "sources")), false);
});

test("ambiguousRefs returns only the ambiguous records, and nothing without sources.yaml", (t) => {
  const root = itemRoot(t);
  assert.deepEqual(ambiguousRefs(root, ID), []);
  assert.equal(readIntake(root, ID), null);
  writeIntake(root, ID, { refs: [fees, pricing], unmatched: [], failures: [], bytes: new Map() });
  assert.deepEqual(ambiguousRefs(root, ID), [pricing]);
});
