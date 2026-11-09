import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import type { Brief } from "../../shared/work/brief.mts";
import { workFile, workId } from "../../shared/work/files.mts";
import { instanceTag } from "../../shared/work/send.mts";
import { readSnapshot } from "../../shared/work/snapshot.mts";
import { readVerdicts } from "../../shared/work/verdict-log.mts";
import { verb, type OpenInput } from "./index.mts";
import { fixedContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";

const parse = (argv: string[], stdin?: () => string) => verb.parse(parseArgs(argv, stdin));

const ENDPOINT = "add a /summary endpoint";
const MIGRATION = "migrate the fees table to the new schema";
const QUESTION = "how does the fee rounding work today?";
const BRIEF: Brief = { purpose: "bill late fees", in_scope: "the fees module", out_of_scope: "refunds" };
const BRIEF_FLAGS = ["--purpose", "bill late fees", "--in-scope", "the fees module", "--out-of-scope", "refunds"];

function input(lane: string, text: string | null, userLane = false, brief: Brief | null = null): OpenInput {
  return { lane, title: `Open ${lane}`, id: undefined, request: text === null ? null : { text }, brief, ticket: undefined, story: undefined, source: undefined, session: undefined, userLane };
}

async function opened(t: TestContext, lane: string, text: string | null, userLane = false, brief: Brief | null = null) {
  const root = withProject(t, { host: true, picket: false });
  return { root, outcome: await verb.run(input(lane, text, userLane, brief), fixedContext(root, { session: "S" })) };
}

function savedRequest(root: string, id: string): string {
  return readFileSync(workFile(root, workId(id), "request.md"), "utf8");
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

const SMALL_FIX = "Fix the typo in the fee helper.";

test("open refuses research for a pending answer with admit's reason as the remedy, and opens it as fast", async (t) => {
  const refused = await opened(t, "research", SMALL_FIX);
  assert.ok(refused.outcome.status === "refused");
  assert.equal(refused.outcome.details.admitted, "pending");
  assert.match(refused.outcome.message, /follow admit's reason/);
  assert.doesNotMatch(refused.outcome.message, /--lane pending/);
  const fast = await opened(t, "fast", SMALL_FIX);
  assert.ok(fast.outcome.status === "done");
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
  const base = { lane: "order", title: "Fees", id: undefined, request: null, brief: null, ticket: undefined, story: undefined, source: undefined, session: undefined, userLane: false };
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

test("open takes the three brief flags together with a request", () => {
  assert.deepEqual(parse(["--lane", "order", "--title", "Fees", "--text", "add a fee", ...BRIEF_FLAGS]).brief, BRIEF);
  assert.equal(parse(["--lane", "order", "--title", "Fees", "--text", "add a fee"]).brief, null);
});

test("open refuses two of the three brief flags, an empty or multi-line value, and a brief with no request", () => {
  const brief = (flags: string[], request = ["--text", "add a fee"]) => () => parse(["--lane", "order", "--title", "Fees", ...request, ...flags]);
  const isBriefUsage = (err: unknown) => err instanceof UsageError && /--purpose, --in-scope and --out-of-scope together/.test(err.message);
  assert.throws(brief(BRIEF_FLAGS.slice(0, 4)), isBriefUsage);
  assert.throws(brief(["--purpose", " ", ...BRIEF_FLAGS.slice(2)]), isBriefUsage);
  assert.throws(brief([...BRIEF_FLAGS.slice(0, 2), "--in-scope", "fees\nand refunds", ...BRIEF_FLAGS.slice(4)]), isBriefUsage);
  assert.throws(brief(BRIEF_FLAGS, []), isBriefUsage);
});

test("an item opened with a brief saves it under ## Brief after the request and reads it back", async (t) => {
  const { root, outcome } = await opened(t, "order", "add a fee", false, BRIEF);
  assert.ok(outcome.status === "done");
  assert.equal(savedRequest(root, outcome.value.id), "add a fee\n\n## Brief\npurpose: bill late fees\nin scope: the fees module\nout of scope: refunds\n");
  assert.deepEqual(readSnapshot(root, workId(outcome.value.id)).brief, BRIEF);
  assert.match(outcome.value.next.send[0].message, /^request: .*\npurpose: bill late fees\nin scope: the fees module\nout of scope: refunds$/m);
});

const PASTED_BRIEF = "add a fee\n\n## Brief\npurpose: pasted purpose\nin scope: pasted scope\nout of scope: pasted exclusion\n";

test("open refuses a request that already holds a ## Brief heading when no brief flags are given, names the flags, and writes nothing", async (t) => {
  const { root, outcome } = await opened(t, "order", PASTED_BRIEF);
  assert.ok(outcome.status === "refused");
  assert.match(outcome.message, /"## Brief" heading; pass --purpose, --in-scope and --out-of-scope/);
  assert.deepEqual(workItems(root), []);
});

test("with the brief flags, a request holding its own ## Brief opens and the flags' brief is the one read back", async (t) => {
  const { root, outcome } = await opened(t, "order", PASTED_BRIEF, false, BRIEF);
  assert.ok(outcome.status === "done");
  assert.deepEqual(readSnapshot(root, workId(outcome.value.id)).brief, BRIEF);
});

test("an item opened without a brief saves the request exactly as given", async (t) => {
  const { root, outcome } = await opened(t, "order", "add a fee");
  assert.ok(outcome.status === "done");
  assert.equal(savedRequest(root, outcome.value.id), "add a fee");
  assert.equal(readSnapshot(root, workId(outcome.value.id)).brief, null);
});
