import { test } from "node:test";
import assert from "node:assert/strict";
import { EXIT, Refused, action, describeExit, done, failed, refuse } from "./action.mts";
import { UsageError } from "../util/args.mts";
import { fixedContext } from "#test/context.mts";

const CONTEXT = fixedContext("/r", { now: new Date(0), home: "/h" });

test("action turns a thrown Refused into a refused outcome with its details (T-1.2)", async () => {
  const run = action(async () => {
    throw new Refused("x", { id: "a" });
  });
  assert.deepEqual(await run({}, CONTEXT), { status: "refused", message: "x", details: { id: "a" } });
});

test("action rethrows any other error, UsageError included (T-1.2)", async () => {
  const crash = new Error("boom");
  await assert.rejects(action(async () => Promise.reject(crash))({}, CONTEXT), (err) => err === crash);
  await assert.rejects(action(async () => Promise.reject(new UsageError("bad")))({}, CONTEXT), UsageError);
});

test("action passes the input and context through and returns the outcome as is", async () => {
  const run = action(async (input, { root }) => done({ input, root }));
  assert.deepEqual(await run(7, CONTEXT), { status: "done", value: { input: 7, root: "/r" } });
});

test("describeExit maps each outcome to its exit code and JSON (T-1.2)", () => {
  assert.deepEqual(describeExit(done({ n: 1 })), { code: 0, json: { n: 1 } });
  assert.deepEqual(describeExit(failed({ ok: false })), { code: 2, json: { ok: false } });
  assert.deepEqual(describeExit(refuse("x", { id: "a" })), { code: 2, json: { ok: false, error: "x", id: "a" } });
  assert.deepEqual(describeExit(refuse("y")), { code: 2, json: { ok: false, error: "y" } });
});

test("usage errors and crashes exit 1 (T-1.2)", () => {
  assert.equal(EXIT.usage, 1);
  assert.equal(EXIT.crash, 1);
});

test("Refused and UsageError are errors with a message", () => {
  const refused = new Refused("no");
  assert.equal(refused instanceof Error, true);
  assert.deepEqual([refused.message, refused.details], ["no", {}]);
  assert.equal(new UsageError("u").message, "u");
});
