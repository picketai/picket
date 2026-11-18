import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeExit } from "../../shared/action.mts";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { verb as approve } from "./approve.mts";
import type { DataApproval } from "../../shared/data/approvals.mts";
import { verb as show, type ShownFile } from "./show.mts";

const SQL = "insert into customers (name) values ('PKT-seed');\n";
const DIGEST = /^data\/customer\.sql · sha256:([0-9a-f]{64}) · (.+)$/;

function project(t: TestContext): string {
  const root = withProject(t);
  mkdirSync(join(root, ".picket", "env", "data"), { recursive: true });
  writeFileSync(join(root, ".picket", "env", "data", "customer.sql"), SQL);
  writeFileSync(join(root, ".picket", "env", "compose.yaml"), "services: {}\n");
  return root;
}

async function shown(root: string, path = "data/customer.sql"): Promise<{ text: string; sha256: string; status: string }> {
  const outcome = await show.run(show.parse(parseArgs([path])), fixedContext(root));
  assert.equal(outcome.status, "done");
  const text = show.render(describeExit(outcome).json as ShownFile);
  const [, sha256, status] = text.split("\n")[0].match(DIGEST) ?? [];
  return { text, sha256, status };
}

function approvals(root: string): object[] {
  return readFileSync(join(root, ".picket", "state", "data", "approvals.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

test("data show prints the path, the digest and the status, a blank line, then the whole file (T-7.1)", async (t) => {
  const root = project(t);
  const { text, sha256, status } = await shown(root);
  assert.match(sha256, /^[0-9a-f]{64}$/);
  assert.equal(status, "not approved");
  assert.equal(text, `data/customer.sql · sha256:${sha256} · not approved\n\n${SQL}`);
});

test("data approve with the digest show printed appends one row, and show then says approved (T-7.2)", async (t) => {
  const root = project(t);
  const { sha256 } = await shown(root);
  const ctx = { ...fixedContext(root), session: "session-7" };
  const outcome = await approve.run(approve.parse(parseArgs(["data/customer.sql", "--sha256", sha256])), ctx);
  assert.equal(outcome.status, "done");
  assert.equal(approve.render(describeExit(outcome).json as DataApproval), `approved data/customer.sql sha256:${sha256.slice(0, 12)}`);
  assert.deepEqual(approvals(root), [{ path: "data/customer.sql", sha256, at: "2026-10-23T10:00:00.000Z", session: "session-7" }]);
  assert.equal((await shown(root)).status, "approved");
});

test("another digest is refused, and one changed byte turns an approval into changed since approval (T-7.3)", async (t) => {
  const root = project(t);
  const { sha256 } = await shown(root);
  const other = await approve.run({ path: "data/customer.sql", sha256: "a".repeat(64) }, fixedContext(root));
  assert.ok(other.status === "refused");
  assert.equal(other.message, "the file changed since it was shown; run picket data show data/customer.sql again");
  await approve.run({ path: "data/customer.sql", sha256 }, fixedContext(root));
  writeFileSync(join(root, ".picket", "env", "data", "customer.sql"), SQL.replace("seed", "seee"));
  assert.equal((await shown(root)).status, "changed since approval");
});

test("show and approve refuse a path outside data/ (T-7.4)", async (t) => {
  const root = project(t);
  for (const path of ["../compose.yaml", "/etc/hosts", "data/../compose.yaml"]) {
    const showed = await show.run({ path }, fixedContext(root));
    const approved = await approve.run({ path, sha256: "a".repeat(64) }, fixedContext(root));
    assert.deepEqual([showed.status, approved.status], ["refused", "refused"], path);
  }
});

test("approve's parse needs a path and a 64-hex digest", () => {
  for (const argv of [["data/customer.sql"], ["data/customer.sql", "--sha256", "abc"], ["--sha256", "a".repeat(64)]]) {
    assert.throws(() => approve.parse(parseArgs(argv)), UsageError, argv.join(" "));
  }
  assert.deepEqual(approve.parse(parseArgs(["data/customer.sql", "--sha256", "A".repeat(64)])), { path: "data/customer.sql", sha256: "a".repeat(64) });
});
