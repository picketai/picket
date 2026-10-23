import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ambiguousRefs, readIntake, SNAPSHOT_MAX_BYTES, writeIntake } from "../../dist/lib/shared/sources/intake.mjs";
import { resolvedRef } from "../../dist/lib/shared/sources/resolve.mjs";
import { parse } from "../../dist/lib/util/yaml-lite.mjs";
import { candidate } from "./lookup-fixture.mjs";

const ID = "20261023-intake";

function withItem(fn) {
  const root = mkdtempSync(join(tmpdir(), "picket-intake-"));
  try {
    mkdirSync(join(root, "work", ID), { recursive: true });
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const main = candidate("main", "aaa", { main: true, worktree: "/sources/analysis", commit: "c0ffee", bytes: Buffer.from("# Fees\n") });
const fees = resolvedRef({ ref: "docs/fees.md", path: "docs/fees.md", anchor: "late" }, "analysis", main, "single");
const pricing = { ref: "docs/pricing.md", source: "analysis", path: "docs/pricing.md", status: "ambiguous", candidates: ["main", "feat-x"] };

function writtenRefs(root) {
  return parse(readFileSync(join(root, "work", ID, "sources.yaml"), "utf8")).refs;
}

test("both record kinds are written in today's key order, with the snapshot bytes", () => {
  withItem((root) => {
    writeIntake(root, ID, { refs: [fees, pricing], unmatched: ["notes/x.md"], failures: [], bytes: new Map([["docs/fees.md", main.bytes]]) });
    const [resolved, ambiguous] = writtenRefs(root);
    assert.deepEqual(Object.keys(resolved), ["ref", "source", "path", "status", "chosen_by", "worktree", "branch", "commit", "sha256", "dirty", "snapshot", "anchor"]);
    assert.deepEqual(Object.keys(ambiguous), ["ref", "source", "path", "status", "candidates"]);
    assert.equal(resolved.snapshot, "sources/analysis/docs/fees.md");
    assert.equal(readFileSync(join(root, "work", ID, resolved.snapshot), "utf8"), "# Fees\n");
    assert.deepEqual(readIntake(root, ID).unmatched, ["notes/x.md"]);
  });
});

test("a document over the snapshot cap is recorded with snapshot null and the reason, and no file", () => {
  withItem((root) => {
    const big = resolvedRef({ ref: "docs/big.md", path: "docs/big.md" }, "analysis", main, "single");
    writeIntake(root, ID, { refs: [big], unmatched: [], failures: [], bytes: new Map([["docs/big.md", Buffer.alloc(SNAPSHOT_MAX_BYTES + 1)]]) });
    const [ref] = writtenRefs(root);
    assert.equal(ref.snapshot, null);
    assert.equal(ref.snapshot_reason, `${SNAPSHOT_MAX_BYTES + 1} bytes, over the ${SNAPSHOT_MAX_BYTES}-byte snapshot cap`);
    assert.equal(existsSync(join(root, "work", ID, "sources")), false);
  });
});

test("ambiguousRefs returns only the ambiguous records, and nothing without sources.yaml", () => {
  withItem((root) => {
    assert.deepEqual(ambiguousRefs(root, ID), []);
    assert.equal(readIntake(root, ID), null);
    writeIntake(root, ID, { refs: [fees, pricing], unmatched: [], failures: [], bytes: new Map() });
    assert.deepEqual(ambiguousRefs(root, ID), [pricing]);
  });
});
