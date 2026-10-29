import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { workId } from "../../shared/work/files.mts";
import { instanceTag } from "../../shared/work/send.mts";
import { readVerdicts } from "../../shared/work/verdict-log.mts";
import { verb, type OpenInput } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";

const parse = (argv: string[], stdin?: () => string) => verb.parse(parseArgs(argv, stdin));

const ENDPOINT = "add a /summary endpoint";
const MIGRATION = "migrate the fees table to the new schema";
const QUESTION = "how does the fee rounding work today?";

function input(lane: string, text: string | null, userLane = false): OpenInput {
  return { lane, title: `Open ${lane}`, id: undefined, request: text === null ? null : { text }, ticket: undefined, story: undefined, source: undefined, session: undefined, userLane };
}

async function opened(t: TestContext, lane: string, text: string | null, userLane = false) {
  const root = withProject(t, { host: true, picket: false });
  return { root, outcome: await verb.run(input(lane, text, userLane), fixedContext(root, { session: "S" })) };
}

function workItems(root: string): string[] {
  const dir = join(root, "work");
  return existsSync(dir) ? readdirSync(dir) : [];
}

test("open builds its next send for the session that opened the item", async (t) => {
  const { outcome } = await opened(t, "order", "add a fee");
  assert.ok(outcome.status === "done");
  const { next } = outcome.value;
  assert.equal(next.action, "write_artifact");
  assert.deepEqual(next.send.map((s) => `${s.tool} ${s.to}`), [`Agent ${instanceTag(next.id)}-architect`]);
  assert.match(next.send[0].message, /^request: work\/.*\/request\.md$/m);
});

test("open refuses a fast lane for a request admit puts in order, names order and --user-lane, and writes nothing", async (t) => {
  const { root, outcome } = await opened(t, "fast", ENDPOINT);
  assert.ok(outcome.status === "refused");
  assert.match(outcome.message, /admit answers order/);
  assert.match(outcome.message, /--user-lane/);
  assert.equal(outcome.details.admitted, "order");
  assert.deepEqual(workItems(root), []);
});

test("open refuses a lighter lane than admit's and a research lane on either side of a change", async (t) => {
  for (const [lane, text, admitted] of [
    ["order", MIGRATION, "design"],
    ["research", ENDPOINT, "order"],
    ["order", QUESTION, "research"],
  ]) {
    const { outcome } = await opened(t, lane, text);
    assert.ok(outcome.status === "refused", `${lane}: ${text}`);
    assert.equal(outcome.details.admitted, admitted, `${lane}: ${text}`);
  }
});

test("open takes a heavier lane than admit's, and a lane without a request text, with no check", async (t) => {
  for (const [lane, text] of [
    ["design", ENDPOINT],
    ["fast", null],
  ] as const) {
    const { root, outcome } = await opened(t, lane, text);
    assert.ok(outcome.status === "done", `${lane}: ${text}`);
    assert.deepEqual(readVerdicts(root, workId(outcome.value.id)).rows, []);
  }
});

test("with --user-lane the refused item opens and its first verdict row records admit's lane", async (t) => {
  const { root, outcome } = await opened(t, "fast", ENDPOINT, true);
  assert.ok(outcome.status === "done");
  const [{ ts: _ts, ...first }] = readVerdicts(root, workId(outcome.value.id)).rows;
  assert.deepEqual(first, { agent: "user", verdict: "user-lane", phase: null, scope: null, through: null, admitted: "order" });
});

test("open needs a lane and a title, and takes the request from --text, a file or standard input", () => {
  const base = { lane: "order", title: "Fees", id: undefined, request: null, ticket: undefined, story: undefined, source: undefined, session: undefined, userLane: false };
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees"]), base);
  assert.equal(parse(["--lane", "fast", "--title", "Fees", "--user-lane"]).userLane, true);
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--text", "add a fee"]).request, { text: "add a fee" });
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--request", "req.md"]).request, { file: "req.md" });
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--request", "-"], () => "piped").request, { text: "piped" });
  assert.throws(() => parse(["--lane", "order"]), (err) => err instanceof UsageError && /needs --lane and --title/.test(err.message));
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--text", ""]), UsageError);
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--request", "-"], () => ""), UsageError);
  assert.throws(() => parse(["--lane", "order", "--title", "Fees", "--ticket", "SHOP-1"]), UsageError);
});
