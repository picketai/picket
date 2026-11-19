import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Refused } from "../action.mts";
import { approvalStatus, fileDigest, recordApproval, sqlFile } from "./approvals.mts";

const SQL = "insert into customers (name) values ('PKT-seed');\n";

function project(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "picket-data-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".picket", "env", "data"), { recursive: true });
  writeFileSync(join(root, ".picket", "env", "data", "customer.sql"), SQL);
  writeFileSync(join(root, ".picket", "env", "compose.yaml"), "services: {}\n");
  return root;
}

function refusal(run: () => unknown): string {
  try {
    run();
  } catch (err) {
    assert.ok(err instanceof Refused, String(err));
    return err.message;
  }
  assert.fail("not refused");
}

test("a SQL file is named from .picket/env/ and normalized; its digest is the sha256 of its bytes", (t) => {
  const root = project(t);
  const file = sqlFile(root, "data/./customer.sql");
  assert.equal(file.path, "data/customer.sql");
  assert.equal(fileDigest(file.abs), createHash("sha256").update(SQL).digest("hex"));
});

test("a path that leaves data/, an absolute path and a missing file are refused (T-7.4)", (t) => {
  const root = project(t);
  for (const path of ["../compose.yaml", "/etc/hosts", "data/../compose.yaml", "data"]) {
    assert.match(refusal(() => sqlFile(root, path)), /is not a file under \.picket\/env\/data\/; name it from \.picket\/env\/, such as data\/customer\.sql$/, path);
  }
  assert.equal(refusal(() => sqlFile(root, "data/absent.sql")), "data/absent.sql does not exist under .picket/env/");
});

test("the status compares the latest approval row for the file with the digest it is given (T-7.2, T-7.3, T-3.4)", (t) => {
  const root = project(t);
  const file = sqlFile(root, "data/customer.sql");
  const digest = fileDigest(file.abs);
  assert.equal(approvalStatus(root, file, digest), "not approved");
  recordApproval(root, file.path, "0".repeat(64), "s-1", new Date("2026-11-18T10:00:00Z"));
  assert.equal(approvalStatus(root, file, digest), "changed since approval");
  recordApproval(root, file.path, digest, "s-1", new Date("2026-11-18T10:01:00Z"));
  assert.equal(approvalStatus(root, file, digest), "approved");
  writeFileSync(file.abs, SQL.replace("seed", "seeds"));
  assert.equal(approvalStatus(root, file, fileDigest(file.abs)), "changed since approval");
});
