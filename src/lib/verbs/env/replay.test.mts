import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describeExit, Refused } from "../../shared/action.mts";
import type { Context } from "../../shared/context.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readModel } from "../../shared/env/model.mts";
import { readLayout } from "../../shared/repos.mts";
import type { BaseInput } from "../../shared/scenarios/base-run.mts";
import { appendDriveRow } from "../../shared/drive-log.mts";
import { labelCard, writeDefect } from "../../shared/scenarios/defects.mts";
import { listScenarios } from "../../shared/scenarios/files.mts";
import { readCandidates } from "../../shared/scenarios/keep.mts";
import type { HttpAdapter, HttpRequest } from "../../shared/scenarios/http.mts";
import { baseKey, keyId } from "../../shared/scenarios/keys.mts";
import { appendRows, readResults, type ResultRow, type ScenarioOutcome } from "../../shared/scenarios/results.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { gitIn, gitOut, gitRepo } from "#test/git.mts";
import { openItem, writeArtifact } from "#test/project.mts";
import { parseArgs } from "../../util/args.mts";
import { renderReplay, replayEnvironment, verb, type ReplayDeps, type ReplayInput, type ReplayReport } from "./replay.mts";
import { mockedFlows, type ReplayLine } from "./replay.mts";
import { parseMock } from "../../shared/mocks/definition.mts";
import { mkdirSync } from "node:fs";

const RECORDED = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };
const VALUE_FLAGS = ["-p", "--project-directory", "-f", "--profile"];
const CARD = ".picket/env/scenarios/S-0001.md";

function modelAt(root: string): string {
  return RECORDED.replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`);
}

function engine(root: string): EngineRunner {
  return (_program, args) => {
    const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
    const call = words.join(" ");
    if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (call === "compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (call === "compose config --profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (words[1] === "config") return { status: 0, stdout: modelAt(root), stderr: "" };
    if (words[0] === "image") return { status: 0, stdout: JSON.stringify([{ Config: { Labels: { "org.opencontainers.image.revision": words[2].slice(words[2].lastIndexOf(":") + 1) } } }]), stderr: "" };
    if (words[1] === "port") return { status: 0, stdout: "0.0.0.0:49153\n", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
}

function answering(status: number, text: string): { adapter: HttpAdapter; seen: HttpRequest[] } {
  const seen: HttpRequest[] = [];
  return { seen, adapter: async (request) => (seen.push(request), { status, headers: {}, text, error: null }) };
}

function project(t: TestContext): { ctx: Context; id: WorkId } {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  const { id } = openItem(root, { lane: "order", title: "Orders export", source: "PROJ-481" });
  const ctx: Context = { root, cwd: root, now: () => new Date("2026-11-15T10:00:00Z"), env: ENV, home: root, session: "session-1", platform: process.platform };
  return { ctx, id };
}

type BaseSpy = { calls: BaseInput[]; base: ReplayDeps["base"] };

function baseAnswering(outcome: ScenarioOutcome | { failure: string }): BaseSpy {
  const calls: BaseInput[] = [];
  const base: ReplayDeps["base"] = async (input) => {
    calls.push(input);
    if (typeof outcome !== "string") return outcome;
    const runs = input.scenarios.map((scenario) => ({ id: scenario.id ?? scenario.path, fingerprint: scenario.fingerprint, outcome, attempts: [outcome], unstable: false, byHand: false, detail: "", mocks: [], gaps: [] }));
    return { runs, versions: { orders: "base000" } };
  };
  return { calls, base };
}

function deps(root: string, adapter: HttpAdapter, runner: EngineRunner = engine(root), spy: BaseSpy = baseAnswering({ failure: "no base run expected" })): ReplayDeps {
  let next = 0;
  return { runner, adapter, sleep: async () => {}, random: () => new Uint8Array([next++, 1]), base: spy.base };
}

function failingTwice(): HttpAdapter {
  return answering(500, "boom").adapter;
}

function full(id: WorkId): ReplayInput {
  return { id, mode: "full", only: null };
}

async function replay(ctx: Context, d: ReplayDeps, input: ReplayInput): Promise<{ code: number; report: ReplayReport; text: string }> {
  const exit = describeExit(await replayEnvironment(ctx, d, input));
  const report = exit.json as ReplayReport;
  return { code: exit.code, report, text: renderReplay(report) };
}

function storeBase(ctx: Context, id: WorkId, outcome: ScenarioOutcome): void {
  const model = readModel(JSON.parse(modelAt(ctx.root)));
  const key = keyId(baseKey(ctx.root, readLayout(ctx.root, id), readState(ctx.root, id).base ?? null, model));
  const [card] = listScenarios(ctx.root);
  const row: ResultRow = { type: "result", run: "base-1", scenario: "S-0001", fingerprint: card.fingerprint, key, versions: {}, outcome, attempts: 1, unstable: false, class: "passed", detail: "" };
  appendRows(ctx.root, [{ type: "run", run: "base-1", item: id, mode: "base", key, versions: {} }, row]);
}

async function refusal(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (err) {
    assert.ok(err instanceof Refused, String(err));
    return err.message;
  }
  assert.fail("not refused");
}

test("env replay takes an id and either --affected or --only", () => {
  assert.deepEqual(verb.parse(parseArgs(["20261115-x"])), { id: "20261115-x", mode: "full", only: null });
  assert.deepEqual(verb.parse(parseArgs(["20261115-x", "--affected"])), { id: "20261115-x", mode: "affected", only: null });
  assert.deepEqual(verb.parse(parseArgs(["20261115-x", "--only", "S-0002"])), { id: "20261115-x", mode: "only", only: "S-0002" });
  assert.throws(() => verb.parse(parseArgs([])), /env replay needs <id>/);
  assert.throws(() => verb.parse(parseArgs(["20261115-x", "--affected", "--only", "S-0002"])), /--affected and --only exclude each other/);
});

test("a passing replay prints the scenario and the summary and stores a run and a result row", async (t) => {
  const { ctx, id } = project(t);
  const { adapter, seen } = answering(200, "ok");
  const { code, text } = await replay(ctx, deps(ctx.root, adapter), full(id));
  assert.equal(code, 0);
  assert.equal(text, "S-0001 passed\nreplayed 1 on picket-proj-481: 1 passed\nflow (none): verified up to payments, which is mocked\nknown defects open: none");
  assert.equal(seen[0].url, "http://127.0.0.1:49153/health");
  const [run, result] = readResults(ctx.root);
  assert.ok(run.type === "run" && result.type === "result");
  assert.deepEqual([run.mode, run.item, run.reason], ["full", id, undefined]);
  assert.deepEqual([result.scenario, result.outcome, result.class, result.attempts, result.key], ["S-0001", "passed", "passed", 1, run.key]);
  assert.deepEqual(Object.keys(result.versions), ["orders"]);
});

test("with no engine a run row with the reason is stored and the replay fails (T-4.5)", async (t) => {
  const { ctx, id } = project(t);
  const { code, report, text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter, () => ({ status: 1, stdout: "", stderr: "" })), full(id));
  assert.equal(code, 2);
  assert.equal(report.reason, "no container engine");
  assert.equal(text, "not replayed: no container engine\nknown defects open: none");
  const [row] = readResults(ctx.root);
  assert.deepEqual(row.type === "run" && [row.item, row.mode, row.reason], [id, "full", "no container engine"]);
});

test("with no engine an affected replay stores a run row of mode affected with the reason", async (t) => {
  const { ctx, id } = project(t);
  const { code, text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter, () => ({ status: 1, stdout: "", stderr: "" })), { id, mode: "affected", only: null });
  assert.equal(code, 2);
  assert.equal(text, "not replayed: no container engine\nknown defects open: none");
  const rows = readResults(ctx.root);
  assert.deepEqual(rows.map((row) => row.type === "run" && [row.item, row.mode, row.reason]), [[id, "affected", "no container engine"]]);
});

test("a pass after a failed first attempt prints as unstable, counts as unstable and is stored as an unstable pass", async (t) => {
  const { ctx, id } = project(t);
  const statuses = [500, 200];
  const flaky: HttpAdapter = async () => ({ status: statuses.shift() ?? 200, headers: {}, text: "ok", error: null });
  const { code, report, text } = await replay(ctx, deps(ctx.root, flaky), full(id));
  assert.equal(code, 0);
  assert.equal(report.ok, true);
  assert.equal(text, "S-0001 unstable: step 2: expected status 200, got 500\nreplayed 1 on picket-proj-481: 1 unstable\nflow (none): verified up to payments, which is mocked\nknown defects open: none");
  const result = readResults(ctx.root).find((row) => row.type === "result");
  assert.ok(result && result.type === "result");
  assert.deepEqual([result.scenario, result.outcome, result.unstable, result.class, result.attempts], ["S-0001", "passed", true, "unstable", 2]);
});

test("--affected with no app change still replays a card that does not parse, as blocked", async (t) => {
  const { ctx, id } = project(t);
  writeFileSync(join(ctx.root, ".picket/env/scenarios/S-0002.md"), "request GET {orders}/health\n");
  const { code, text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), { id, mode: "affected", only: null });
  assert.equal(code, 0);
  assert.equal(text, "S-0002 blocked: header: a card starts with a --- header block · changed by hand\nreplayed 1 on picket-proj-481: 1 blocked\nknown defects open: none");
});

test("a failure the stored base passed is a new failure and exits 2; one the base failed exits 0 (T-4.6)", async (t) => {
  const failing = project(t);
  storeBase(failing.ctx, failing.id, "passed");
  const blamed = await replay(failing.ctx, deps(failing.ctx.root, answering(500, "boom").adapter), full(failing.id));
  assert.equal(blamed.code, 2);
  assert.equal(blamed.text, "S-0001 new failure: step 2: expected status 200, got 500\nreplayed 1 on picket-proj-481: 1 new failure\nflow (none): verified up to payments, which is mocked\nknown defects open: none");
  const before = project(t);
  storeBase(before.ctx, before.id, "failed");
  const known = await replay(before.ctx, deps(before.ctx.root, answering(500, "boom").adapter), full(before.id));
  assert.equal(known.code, 0);
  assert.equal(known.text, "S-0001 failing before the item: step 2: expected status 200, got 500\nreplayed 1 on picket-proj-481: 1 failing before the item\nflow (none): verified up to payments, which is mocked\nknown defects open: none");
});

test("a labelled card that fails twice is a known defect: no base run, not blamed, ok (T-1.4)", async (t) => {
  const { ctx, id } = project(t);
  const path = join(ctx.root, CARD);
  writeFileSync(path, labelCard(readFileSync(path, "utf8"), { known: "DF-0001" }));
  const spy = baseAnswering("passed");
  const { code, report, text } = await replay(ctx, deps(ctx.root, failingTwice(), engine(ctx.root), spy), full(id));
  assert.equal(spy.calls.length, 0);
  assert.equal(code, 0);
  assert.equal(report.ok, true);
  assert.equal(text.split("\n")[0], "S-0001 known defect: step 2: expected status 200, got 500");
  const result = readResults(ctx.root).find((row) => row.type === "result");
  assert.ok(result && result.type === "result");
  assert.deepEqual([result.scenario, result.outcome, result.class], ["S-0001", "failed", "known defect"]);
});

const OPEN_DEFECT = { id: "DF-0001", status: "open", opened: "2026-10-10", found_in: "20261010-orders", scenario: "S-0002", expected: "health", actual: "step 2: expected status 200, got 500", evidence: "run r1" } as const;

test("every replay ends with the open known defects and their age in days, or none (T-1.5)", async (t) => {
  const { ctx, id } = project(t);
  const later: Context = { ...ctx, now: () => new Date("2026-11-20T09:00:00Z") };
  assert.equal((await replay(later, deps(ctx.root, answering(200, "ok").adapter), full(id))).text.split("\n").at(-1), "known defects open: none");
  writeDefect(ctx.root, OPEN_DEFECT);
  writeDefect(ctx.root, { ...OPEN_DEFECT, id: "DF-0002", status: "fixed" });
  writeDefect(ctx.root, { ...OPEN_DEFECT, id: "DF-0003", opened: "2026-11-19", scenario: "S-0004" });
  const { text } = await replay(later, deps(ctx.root, answering(200, "ok").adapter), full(id));
  assert.equal(text.split("\n").at(-1), "known defects open: DF-0001 (S-0002) 41 days, DF-0003 (S-0004) 1 day");
  const offline = await replay(later, deps(ctx.root, answering(200, "ok").adapter, () => ({ status: 1, stdout: "", stderr: "" })), full(id));
  assert.equal(offline.text, "not replayed: no container engine\nknown defects open: DF-0001 (S-0002) 41 days, DF-0003 (S-0004) 1 day");
});

function labelled(ctx: Context): void {
  const path = join(ctx.root, CARD);
  writeFileSync(path, labelCard(readFileSync(path, "utf8"), { known: "DF-0001" }));
}

function storedRow(ctx: Context): ResultRow | undefined {
  return readResults(ctx.root).filter((row): row is ResultRow => row.type === "result" && row.run !== "base-1" && !row.run.endsWith("-base")).at(-1);
}

test("a labelled card that passes with no stored base row runs the base once and is fixed outside this item (T-2.4)", async (t) => {
  const { ctx, id } = project(t);
  labelled(ctx);
  const spy = baseAnswering("passed");
  const { code, text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter, engine(ctx.root), spy), full(id));
  assert.equal(code, 0);
  assert.deepEqual(spy.calls.map((call) => call.scenarios.map((scenario) => scenario.id)), [["S-0001"]]);
  assert.equal(text.split("\n")[0], "S-0001 fixed outside this item: no failing run recorded");
  assert.deepEqual([storedRow(ctx)?.class, storedRow(ctx)?.defect], ["fixed outside this item", "DF-0001"]);
});

test("a labelled card that passes beside a stored passed base row runs no base and is fixed outside this item (T-2.4)", async (t) => {
  const { ctx, id } = project(t);
  labelled(ctx);
  storeBase(ctx, id, "passed");
  const spy = baseAnswering("passed");
  await replay(ctx, deps(ctx.root, answering(200, "ok").adapter, engine(ctx.root), spy), full(id));
  assert.equal(spy.calls.length, 0);
  assert.equal(storedRow(ctx)?.class, "fixed outside this item");
});

function committedLabel(ctx: Context, id: WorkId): void {
  labelled(ctx);
  gitIn(ctx.root, "add", "-A");
  gitIn(ctx.root, "commit", "-q", "-m", "label");
  writeState(ctx.root, { ...readState(ctx.root, id), base: gitOut(ctx.root, "rev-parse", "HEAD") }, new Date());
  writeFileSync(join(ctx.root, "services", "orders", "server.mjs"), "item change\n");
  storeBase(ctx, id, "failed");
}

test("a labelled pass the base still fails is a side effect naming the changes, or fixed by this item when the request names it", async (t) => {
  const unnamed = project(t);
  committedLabel(unnamed.ctx, unnamed.id);
  const side = await replay(unnamed.ctx, deps(unnamed.ctx.root, answering(200, "ok").adapter), full(unnamed.id));
  assert.equal(side.code, 0);
  assert.equal(side.text.split("\n")[0], "S-0001 side effect: changed: services/orders/server.mjs");
  const named = project(t);
  committedLabel(named.ctx, named.id);
  writeFileSync(join(named.ctx.root, "work", named.id, "request.md"), "fix the health check, DF-0001.\n");
  const fixed = await replay(named.ctx, deps(named.ctx.root, answering(200, "ok").adapter), full(named.id));
  assert.equal(fixed.text.split("\n")[0], "S-0001 fixed by this item");
});

function baseKeyId(ctx: Context, id: WorkId): string {
  const model = readModel(JSON.parse(modelAt(ctx.root)));
  return keyId(baseKey(ctx.root, readLayout(ctx.root, id), readState(ctx.root, id).base ?? null, model));
}

test("a confirmed failure with no base row runs the base once and stores base rows; the next replay reads them (T-5.4)", async (t) => {
  const { ctx, id } = project(t);
  writeFileSync(join(ctx.root, "services", "orders", "server.mjs"), "item change\n");
  const spy = baseAnswering("passed");
  const first = await replay(ctx, deps(ctx.root, failingTwice(), engine(ctx.root), spy), full(id));
  assert.equal(first.code, 2);
  assert.equal(first.text.split("\n")[0], "S-0001 new failure: step 2: expected status 200, got 500");
  assert.equal(spy.calls.length, 1);
  assert.deepEqual([spy.calls[0].key, spy.calls[0].scenarios.map((scenario) => scenario.id)], ["proj-481", ["S-0001"]]);
  const rows = readResults(ctx.root);
  const baseRun = rows.find((row) => row.type === "run" && row.mode === "base");
  assert.ok(baseRun && baseRun.type === "run");
  assert.deepEqual([baseRun.key, baseRun.versions], [baseKeyId(ctx, id), { orders: "base000" }]);
  assert.ok(rows.some((row) => row.type === "result" && row.run === baseRun.run && row.outcome === "passed" && row.key === baseKeyId(ctx, id)));
  const again = baseAnswering("failed");
  const second = await replay(ctx, deps(ctx.root, failingTwice(), engine(ctx.root), again), full(id));
  assert.equal(again.calls.length, 0);
  assert.equal(second.text.split("\n")[0], "S-0001 new failure: step 2: expected status 200, got 500");
});

test("passing replays and unstable failures start no base run (T-5.5)", async (t) => {
  const { ctx, id } = project(t);
  const spy = baseAnswering("passed");
  assert.equal((await replay(ctx, deps(ctx.root, answering(200, "ok").adapter, engine(ctx.root), spy), full(id))).code, 0);
  const statuses = [500, 200];
  const flaky: HttpAdapter = async () => ({ status: statuses.shift() ?? 200, headers: {}, text: "ok", error: null });
  const unstable = await replay(ctx, deps(ctx.root, flaky, engine(ctx.root), spy), full(id));
  assert.equal(unstable.code, 0);
  assert.equal(spy.calls.length, 0);
});

test("a base that does not start, or no base commit, leaves the failure as no base result with the cause", async (t) => {
  const broken = project(t);
  const failure = await replay(broken.ctx, deps(broken.ctx.root, failingTwice(), engine(broken.ctx.root), baseAnswering({ failure: "compose up failed: orders is unhealthy" })), full(broken.id));
  assert.equal(failure.code, 2);
  assert.equal(failure.text.split("\n")[0], "S-0001 no base result: the base did not start: compose up failed: orders is unhealthy");
  const baseless = project(t);
  const { base: _, ...withoutBase } = readState(baseless.ctx.root, baseless.id);
  writeState(baseless.ctx.root, withoutBase, new Date());
  const spy = baseAnswering("passed");
  const none = await replay(baseless.ctx, deps(baseless.ctx.root, failingTwice(), engine(baseless.ctx.root), spy), full(baseless.id));
  assert.equal(none.text.split("\n")[0], "S-0001 no base result: the item has no base commit");
  assert.equal(spy.calls.length, 0);
});

test("a hand-changed card is marked once and accepted for the next replay (T-4.3)", async (t) => {
  const { ctx, id } = project(t);
  const path = join(ctx.root, CARD);
  writeFileSync(path, readFileSync(path, "utf8").replace('"ok"', '"o"'));
  const first = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), full(id));
  assert.equal(first.text.split("\n")[0], "S-0001 passed · changed by hand");
  const second = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), full(id));
  assert.equal(second.text.split("\n")[0], "S-0001 passed");
});

test("a hand change that breaks a safety rule is blocked and never accepted", async (t) => {
  const { ctx, id } = project(t);
  const path = join(ctx.root, CARD);
  writeFileSync(path, readFileSync(path, "utf8").replace("{orders}/health", "http://example.com/health"));
  for (let round = 0; round < 2; round++) {
    const { code, text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), full(id));
    assert.equal(code, 0);
    assert.equal(text.split("\n")[0], "S-0001 blocked: rule 1: step 1 sends to http://example.com/health; a request goes only to {<service>} of the environment · changed by hand");
  }
});

test("--affected on an unchanged item replays nothing; --only of an unknown id refuses", async (t) => {
  const { ctx, id } = project(t);
  const none = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), { id, mode: "affected", only: null });
  assert.equal(none.code, 0);
  assert.equal(none.text, "no saved scenarios to replay\nknown defects open: none");
  assert.equal(await refusal(() => replayEnvironment(ctx, deps(ctx.root, answering(200, "ok").adapter), { id, mode: "only", only: "S-0009" })), "no saved scenario S-0009");
});

test("a done item refuses before any engine call", async (t) => {
  const { ctx, id } = project(t);
  writeState(ctx.root, { ...readState(ctx.root, id), status: "done" }, new Date());
  const calls: string[] = [];
  const runner: EngineRunner = (_program, args) => (calls.push(args.join(" ")), { status: 1, stdout: "", stderr: "" });
  assert.match(await refusal(() => replayEnvironment(ctx, deps(ctx.root, answering(200, "ok").adapter, runner), full(id))), /is done; env replay runs only for an open or blocked item$/);
  assert.deepEqual(calls, []);
});

const REPLACING_ORDER = [
  "---",
  "lane: order",
  "phases:",
  "  - n: 1",
  "    files: [services/orders/server.mjs]",
  "    drive:",
  "      - covers: T-1.1",
  "        method: GET",
  "        path: /health",
  "        status: 503",
  "        replaces: S-0001",
  "---",
  "# O",
  "",
  "## Phase 1: Health",
  "",
  "- **T-1.1** health answers 503 while orders drains",
  "",
].join("\n");

const TWO_CHECKS = [
  "---",
  "lane: order",
  "phases:",
  "  - n: 1",
  "    files: [services/orders/server.mjs]",
  "    drive:",
  "      - covers: T-1.1",
  "        method: POST",
  "        path: /orders",
  "        status: 201",
  "      - covers: T-1.2",
  "        method: POST",
  "        path: /refunds",
  "        status: 201",
  "---",
  "# O",
  "",
  "## Phase 1: Orders",
  "",
  "- **T-1.1** an order is created",
  "- **T-1.2** a refund is created",
  "",
].join("\n");

const byPath: HttpAdapter = async (request) => {
  const status = request.url.endsWith("/health") ? 200 : request.url.endsWith("/orders") ? 201 : 500;
  return { status, headers: {}, text: "ok", error: null };
};

test("each HTTP check of the phase becomes a candidate replayed once, stored with its outcome (T-9.3)", async (t) => {
  const { ctx, id } = project(t);
  writeArtifact(ctx.root, id, "order.md", TWO_CHECKS);
  const hits = [
    { method: "POST", path: "/orders", status: 201, ms: 2, body: '{"sku":"PKT-a-1"}' },
    { method: "POST", path: "/refunds", status: 201, ms: 2, body: '{"order":"PKT-a-1"}' },
  ];
  appendDriveRow(ctx.root, { ts: "2026-11-15T09:00:00.000Z", kind: "drive", command: "picket drive", source: "picket drive", work_id: id, phase: 1, hits });
  const { code, text } = await replay(ctx, deps(ctx.root, byPath), full(id));
  assert.equal(code, 0);
  assert.deepEqual(text.split("\n").slice(-3, -1), ["keep T-1.1: replay passed; kept on approval", "keep T-1.2: not kept: replay failed: step 2: expected status 201, got 500"]);
  const [orders, refunds] = readCandidates(ctx.root, id)["1"];
  assert.deepEqual([orders.covers, orders.outcome, orders.detail, orders.replaces], ["T-1.1", "passed", "", null]);
  assert.deepEqual([refunds.covers, refunds.outcome, refunds.detail], ["T-1.2", "failed", "step 2: expected status 201, got 500"]);
  assert.match(orders.text ?? "", /^request POST \{orders\}\/orders$/m);
});

test("a phase with no drive list stores no candidates and prints no keep line", async (t) => {
  const { ctx, id } = project(t);
  const { text } = await replay(ctx, deps(ctx.root, answering(200, "ok").adapter), full(id));
  assert.ok(!text.includes("keep "), text);
  assert.deepEqual(readCandidates(ctx.root, id), {});
});

test("a failing scenario that a phase of the item replaces is classed replaced by this item and exits 0 (T-7.5)", async (t) => {
  const { ctx, id } = project(t);
  writeArtifact(ctx.root, id, "order.md", REPLACING_ORDER);
  writeFileSync(join(ctx.root, "services", "orders", "server.mjs"), "drains\n");
  const spy = baseAnswering("passed");
  const { code, text } = await replay(ctx, deps(ctx.root, answering(503, "draining").adapter, engine(ctx.root), spy), full(id));
  assert.equal(code, 0);
  assert.equal(text, "S-0001 replaced by this item: step 2: expected status 200, got 503\nreplayed 1 on picket-proj-481: 1 replaced by this item\nflow (none): verified up to payments, which is mocked\nkeep T-1.1: not kept: the check did not run\nknown defects open: none");
  assert.equal(spy.calls.length, 0);
});

const PAYMENTS_DEFINITION = "---\nreplaces: payments\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\nwhen POST /charges\n  status 201\n";

function stubbedEngine(root: string): EngineRunner {
  const inner = engine(root);
  const model = JSON.parse(modelAt(root));
  delete model.services["payments-mock"].ports;
  delete model.services["payments-mock"].healthcheck;
  return (program, args) => (args.includes("config") && args.includes("json") ? { status: 0, stdout: JSON.stringify(model), stderr: "" } : inner(program, args));
}

test("each stored result row carries the run's mocks and gaps, and the gap joins the line's detail (T-4.1)", async (t) => {
  const { ctx, id } = project(t);
  mkdirSync(join(ctx.root, ".picket", "env", "mocks"));
  writeFileSync(join(ctx.root, ".picket", "env", "mocks", "payments-mock.md"), PAYMENTS_DEFINITION);
  const logs = [[], [{ method: "POST", path: "/refunds", answered: false }]];
  const adapter: HttpAdapter = async (request) =>
    request.url.endsWith("/__picket/received") ? { status: 200, headers: {}, text: JSON.stringify(logs.shift() ?? []), error: null } : { status: 200, headers: {}, text: "ok", error: null };
  const { text } = await replay(ctx, deps(ctx.root, adapter, stubbedEngine(ctx.root)), full(id));
  const results = readResults(ctx.root).filter((row): row is ResultRow => row.type === "result");
  assert.deepEqual(results.map(({ scenario, mocks, gaps }) => ({ scenario, mocks, gaps })), [{ scenario: "S-0001", mocks: ["payments-mock"], gaps: ["payments-mock has no answer for POST /refunds"] }]);
  assert.deepEqual(text.split("\n"), ["S-0001 passed: gap: payments-mock has no answer for POST /refunds", "replayed 1 on picket-proj-481: 1 passed", "flow (none): verified up to payments, which is mocked", "known defects open: none"]);
});

function line(scenario: string, flow: string, mocks: string[]): ReplayLine {
  return { scenario, class: "passed", detail: "", byHand: false, flow, mocks };
}

test("one flow line per flow whose runs had mocks, naming the real services (T-4.2)", () => {
  const mocks = [{ service: "payments-mock", path: ".picket/env/mocks/payments-mock.md", ...parseMock(PAYMENTS_DEFINITION, "payments-mock") }];
  const lines = [line("S-0001", "checkout", ["payments-mock"]), line("S-0002", "checkout", ["payments-mock"]), line("S-0003", "search", [])];
  const report: ReplayReport = { ok: true, stack: "picket-a", reason: null, lines, flows: mockedFlows(lines, mocks), keeps: [], open: [] };
  assert.deepEqual(renderReplay(report).split("\n").filter((text) => text.startsWith("flow ")), ["flow checkout: verified up to payments, which is mocked"]);
  const unnamed = [line("S-0004", "(none)", ["payments-mock", "ledger-mock"])];
  assert.deepEqual(renderReplay({ ...report, lines: unnamed, flows: mockedFlows(unnamed, mocks) }).split("\n").at(-2), "flow (none): verified up to ledger and payments, which are mocked");
});
