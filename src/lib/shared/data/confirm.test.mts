import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withProject } from "#test/project.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { workId } from "../work/files.mts";
import { confirmationsPath, confirmRun, readConfirmations, sha256Hex, voidPending, type Confirmation } from "./confirm.mts";
import type { RunPlan } from "./plan.mts";

const SQL = Buffer.from("insert into customers (name) values ('PKT-seed');\n");
const NOW = new Date("2026-11-19T10:00:00.000Z");
const LATER = new Date("2026-11-19T10:01:00.000Z");
const NONCE_SHA = sha256Hex("a".repeat(64));

function planned(t: TestContext): { root: string; plan: RunPlan } {
  const root = withProject(t);
  const abs = join(root, ".picket", "env", "data", "customer.sql");
  mkdirSync(join(root, ".picket", "env", "data"), { recursive: true });
  writeFileSync(abs, SQL);
  const sha256 = sha256Hex(SQL);
  const plan: RunPlan = {
    item: workId("20261119-orders"),
    entry: "customer",
    service: "orders-sql",
    variable: "PICKET_DATA_ORDERS_SQL",
    path: "data/customer.sql",
    abs,
    sha256,
    target: { server: "sql01", database: "orders_test" },
    approval: { path: "data/customer.sql", sha256, at: "2026-11-18T09:00:00.000Z", session: "s-approve" },
  };
  return { root, plan };
}

function refusal(run: () => unknown): string {
  try {
    run();
  } catch (err) {
    assert.ok(err instanceof Error, String(err));
    return err.message;
  }
  assert.fail("not refused");
}

test("confirmRun writes the given bytes as the snapshot and appends one row naming the session, run, pair and nonce hash", (t) => {
  const { root, plan } = planned(t);
  const row = confirmRun(root, plan, SQL, "s1", NONCE_SHA, NOW);
  assert.match(row.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(row, {
    id: row.id,
    at: "2026-11-19T10:00:00.000Z",
    session: "s1",
    item: "20261119-orders",
    entry: "customer",
    service: "orders-sql",
    path: "data/customer.sql",
    sha256: plan.sha256,
    server: "sql01",
    database: "orders_test",
    snapshot: `${STATE_FILES.dataSnapshots}/${plan.sha256}.sql`,
    nonce_sha256: NONCE_SHA,
  });
  assert.deepEqual(readFileSync(statePath(root, row.snapshot)), SQL);
  assert.deepEqual(readConfirmations(root), [row]);
});

test("confirmRun refuses with no session or with bytes other than the planned digest, and writes neither row nor snapshot", (t) => {
  const { root, plan } = planned(t);
  assert.equal(refusal(() => confirmRun(root, plan, SQL, null, NONCE_SHA, NOW)), "the hook payload names no session, so no confirmation is written and nothing can run");
  assert.equal(refusal(() => confirmRun(root, plan, Buffer.from("drop table customers;\n"), "s1", NONCE_SHA, NOW)), "data/customer.sql changed while the dialog was prepared; ask again");
  assert.equal(existsSync(confirmationsPath(root)), false);
  assert.equal(existsSync(statePath(root, STATE_FILES.dataSnapshots)), false);
});

test("voidPending voids each untaken, unvoided row of the session once and leaves other sessions and settled rows alone", (t) => {
  const { root, plan } = planned(t);
  const first = confirmRun(root, plan, SQL, "s1", NONCE_SHA, NOW);
  const second = confirmRun(root, plan, SQL, "s1", NONCE_SHA, NOW);
  const taken = confirmRun(root, plan, SQL, "s1", NONCE_SHA, NOW);
  const other = confirmRun(root, plan, SQL, "s2", NONCE_SHA, NOW);
  writeFileSync(confirmationsPath(root), `${readFileSync(confirmationsPath(root), "utf8")}${JSON.stringify({ id: taken.id, taken_at: NOW.toISOString() })}\n`);
  assert.equal(voidPending(root, "s1", LATER), 2);
  assert.equal(voidPending(root, "s1", LATER), 0);
  assert.equal(voidPending(root, "s3", LATER), 0);
  const settled = readConfirmations(root).filter((row) => !("nonce_sha256" in row));
  assert.deepEqual(settled, [
    { id: taken.id, taken_at: NOW.toISOString() },
    { id: first.id, voided_at: LATER.toISOString() },
    { id: second.id, voided_at: LATER.toISOString() },
  ]);
  assert.ok(!settled.some((row) => row.id === other.id));
  assert.equal((readConfirmations(root).filter((row) => "nonce_sha256" in row) as Confirmation[]).length, 4);
});
