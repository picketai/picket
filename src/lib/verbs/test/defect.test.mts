import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { recordStack } from "../../shared/env/stacks.mts";
import { itemKey, stackName } from "../../shared/env/standard.mts";
import type { HttpAdapter } from "../../shared/scenarios/http.mts";
import type { CaseDeps } from "../../shared/testing/cases.mts";
import { readTestRows } from "../../shared/testing/results.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";
import { recordDefect, verb, type DefectInput } from "./defect.mts";

const MODEL = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const VALUE_FLAGS = ["-p", "--project-directory", "-f", "--profile"];
const NOW = "2026-11-17T10:00:00.000Z";
const REFUSED_ORDER = 'request POST {orders}/orders\n  body {"reference": "PKT-{run}", "quantity": -1}\nexpect status 400\n';
const REFUSED_LOOKUP = "request GET {orders}/orders/PKT-{run}-none\nexpect status 404\n";
const INTENT = "an order with a negative quantity is refused";
const EVIDENCE = "POST /orders with quantity -1 answered 201; the API description says quantity is at least 1";
const DESIGN = ["---", "lane: design", "phases:", "  - n: 1", "    files: [services/orders/routes.mjs]", "    drive:", "      - covers: T-1.1", "        method: GET", "        path: /orders/1", "        status: 200", "---", "# D", "", "## Phase 1: Orders", "", "- **T-1.1** an order is read back", ""].join("\n");
const MOCK = "---\nreplaces: payments-api\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\nwhen GET /charges/*\n  status 200\n";
const RECEIVED = "/__picket/received";

const engine: EngineRunner = (_program, args) => {
  const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
  const call = words.join(" ");
  if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
  if (call === "compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
  if (call === "compose config --profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
  if (words[1] === "config") return { status: 0, stdout: MODEL, stderr: "" };
  if (words[1] === "port") return { status: 0, stdout: "0.0.0.0:49153\n", stderr: "" };
  return { status: 0, stdout: "", stderr: "" };
};

function answering(status: number, traffic: unknown[][] = []): HttpAdapter {
  return async (request) => (request.url.endsWith(RECEIVED) ? { status: 200, headers: {}, text: JSON.stringify(traffic.shift() ?? []), error: null } : { status, headers: {}, text: "", error: null });
}

function deps(adapter: HttpAdapter): CaseDeps {
  let next = 0;
  return { runner: engine, adapter, sleep: async () => {}, random: () => new Uint8Array([next++, 1]) };
}

function item(t: TestContext): { ctx: Context; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "design", title: "Orders" });
  writeArtifact(root, id, "design.md", DESIGN);
  recordStack(root, stackName(itemKey(readState(root, id))), { item: id, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: NOW });
  const ctx: Context = { root, cwd: root, now: () => new Date(NOW), env: { PATH: process.env.PATH ?? "" }, home: root, session: null, platform: process.platform };
  return { ctx, id };
}

function defectInput(id: WorkId, steps = REFUSED_ORDER): DefectInput {
  return { id, kind: "negative", intent: INTENT, evidence: EVIDENCE, steps };
}

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Refused) return error.message;
    throw error;
  }
  return assert.fail("the call was not refused");
}

test("steps expecting 400 on a stack answering 201 record K-01 with the run's detail and mocks, and other steps K-02 (T-1.2)", async (t) => {
  const { ctx, id } = item(t);
  const first = await recordDefect(ctx, deps(answering(201)), defectInput(id));
  assert.ok(first.status === "done");
  const second = await recordDefect(ctx, deps(answering(200)), defectInput(id, REFUSED_LOOKUP));
  assert.ok(second.status === "done");
  assert.deepEqual(readTestRows(ctx.root, id), [
    { ts: NOW, round: 1, type: "defect", found: "K-01", kind: "negative", intent: INTENT, steps: REFUSED_ORDER, evidence: EVIDENCE, outcome: "failed", detail: "step 2: expected status 400, got 201", attempts: 2, mocks: ["payments-mock"] },
    { ts: NOW, round: 1, type: "defect", found: "K-02", kind: "negative", intent: INTENT, steps: REFUSED_LOOKUP, evidence: EVIDENCE, outcome: "failed", detail: "step 2: expected status 404, got 200", attempts: 2, mocks: ["payments-mock"] },
  ]);
  assert.equal(verb.render(first.value), `K-01 recorded: ${INTENT}; the stack answered step 2: expected status 400, got 201; it becomes a known defect at close`);
});

test("steps the stack passes are refused and record nothing (T-1.3)", async (t) => {
  const { ctx, id } = item(t);
  const message = await refusal(recordDefect(ctx, deps(answering(400)), defectInput(id)));
  assert.equal(message, "the steps passed: a defect's steps assert the correct answer, so a pass records nothing");
  assert.deepEqual(readTestRows(ctx.root, id), []);
});

test("steps whose run meets a mock gap are refused and record nothing (T-1.3)", async (t) => {
  const { ctx, id } = item(t);
  mkdirSync(join(ctx.root, ".picket", "env", "mocks"), { recursive: true });
  writeFileSync(join(ctx.root, ".picket", "env", "mocks", "payments-mock.md"), MOCK);
  const traffic = [[], [{ method: "POST", path: "/refunds", answered: false }]];
  const message = await refusal(recordDefect(ctx, deps(answering(201, traffic)), defectInput(id)));
  assert.equal(message, "the run met a gap in a mock (payments-mock has no answer for POST /refunds); a gap is never a product defect");
  assert.deepEqual(readTestRows(ctx.root, id), []);
});

test("a POST whose body has no PKT- is refused before it runs and records nothing (T-1.3)", async (t) => {
  const { ctx, id } = item(t);
  const unowned = 'request POST {orders}/orders\n  body {"reference": "a", "quantity": -1}\nexpect status 400\n';
  const message = await refusal(recordDefect(ctx, deps(answering(201)), defectInput(id, unowned)));
  assert.equal(message, "the steps change data they did not create; create it with a PKT- prefix");
  assert.deepEqual(readTestRows(ctx.root, id), []);
});

test("the steps of K-01 again are refused and record nothing more (T-1.3)", async (t) => {
  const { ctx, id } = item(t);
  await recordDefect(ctx, deps(answering(201)), defectInput(id));
  const message = await refusal(recordDefect(ctx, deps(answering(201)), defectInput(id)));
  assert.equal(message, "K-01 already records these steps");
  assert.equal(readTestRows(ctx.root, id).length, 1);
});

test("a blocked run is refused with its detail and records nothing (T-1.3)", async (t) => {
  const { ctx, id } = item(t);
  const blocked = "request GET {orders}/orders/{data:missing.id}\nexpect status 404\n";
  const message = await refusal(recordDefect(ctx, deps(answering(200)), defectInput(id, blocked)));
  assert.match(message, /^the steps were blocked: /);
  assert.deepEqual(readTestRows(ctx.root, id), []);
});

test("test defect parses its flags whole and reads the steps from stdin", () => {
  const argv = ["20261117-orders", "--kind", "negative", "--intent", INTENT, "--evidence", EVIDENCE];
  assert.deepEqual(verb.parse(parseArgs(argv, () => REFUSED_ORDER)), { id: "20261117-orders", kind: "negative", intent: INTENT, evidence: EVIDENCE, steps: REFUSED_ORDER });
  assert.throws(() => verb.parse(parseArgs(argv)), /reads its step lines on stdin/);
  assert.throws(() => verb.parse(parseArgs(["20261117-orders", "--kind", "smoke", "--intent", "x", "--evidence", "y"], () => REFUSED_ORDER)), /--kind must be one of/);
});

test("test defect with no arguments gives its usage before it reads stdin (T-1.1)", () => {
  let read = false;
  assert.throws(
    () => verb.parse(parseArgs([], () => ((read = true), REFUSED_ORDER))),
    (error) => error instanceof UsageError && error.message === verb.usage,
  );
  assert.equal(read, false);
});
