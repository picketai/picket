import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readModel } from "../../shared/env/model.mts";
import type { ResultClass } from "../../shared/scenarios/compare.mts";
import { keyId, workingKey } from "../../shared/scenarios/keys.mts";
import { appendRows, type RunMode, type ScenarioRow } from "../../shared/scenarios/results.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { verb, verify, type VerifyReport } from "./index.mts";
import { stateDir, statePath, STATE_FILES } from "../../shared/paths.mts";
import { phaseOf, readSnapshot } from "../../shared/work/snapshot.mts";
import { writeLayout } from "../../shared/repos.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitRepo, writeIn } from "#test/git.mts";
import { openItem, withProject, writeArtifact } from "#test/project.mts";

function setup(t: TestContext, tests = false) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const s = openItem(root, { lane: "order", title: "Csv" });
  writeFileSync(
    join(root, "work", s.id, "order.md"),
    [
      "---",
      "lane: order",
      "phases:",
      "  - n: 1",
      "    files: [src/http/csv.ts]",
      "    greps:",
      "      - path: src/http/handlers.ts",
      "        pattern: invoices\\.csv",
      `    tests: ${tests}`,
      "    drive: true",
      "---",
      "# O",
      "",
      "## Phase 1: CSV",
      "",
      "t",
    ].join("\n"),
  );
  return { root, id: s.id };
}

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("verify needs an id and a whole phase number (T-4.4)", () => {
  assert.deepEqual(parse([ID, "2"]), { id: ID, phase: 2, runTests: true });
  assert.equal(parse([ID, "2", "--no-tests"]).runTests, false);
  assert.throws(() => parse([ID]), UsageError);
  assert.throws(() => parse([ID, "x"]), UsageError);
});

test("mustHaves reads the phase entry from frontmatter", (t) => {
  const { root, id } = setup(t);
  const mustHaves = (n: number) => phaseOf(readSnapshot(root, id), n)?.entry ?? null;
  const mh = mustHaves(1);
  assert.deepEqual(mh?.files, ["src/http/csv.ts"]);
  assert.equal(mh?.greps?.[0].pattern, "invoices\\.csv");
  assert.equal(mustHaves(2), null);
});

test("verify fails on missing files, passes when files, greps and a drive exist", (t) => {
  const { root, id } = setup(t);
  let r = verify(root, id, 1, { runTests: false, env: process.env });
  assert.equal(r.ok, false);
  assert.equal(r.results.find((x) => x.name === "file:src/http/csv.ts")?.ok, false);
  assert.equal(r.results.find((x) => x.name === "drive_observed")?.ok, false);

  mkdirSync(join(root, "src", "http"), { recursive: true });
  writeFileSync(join(root, "src", "http", "csv.ts"), "export const x = 1;");
  writeFileSync(join(root, "src", "http", "handlers.ts"), 'router.add("GET", "/invoices.csv", h);');
  writeFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify({ kind: "drive", command: "curl http://127.0.0.1:8080/invoices.csv", work_id: id, phase: 1 }) + "\n");
  r = verify(root, id, 1, { runTests: false, env: process.env });
  assert.equal(r.ok, true, JSON.stringify(r.results));

  r = verify(root, id, 2, { runTests: false, env: process.env });
  assert.equal(r.ok, false);
  assert.equal(r.results[0].name, "phase_exists");
});

test("verify counts an unreadable drive-log line in the drive_observed detail", (t) => {
  const { root, id } = setup(t);
  const drive = JSON.stringify({ kind: "drive", command: "curl http://127.0.0.1:8080/invoices.csv", work_id: id, phase: 1 });
  const detail = () => verify(root, id, 1, { runTests: false, env: process.env }).results.find((x) => x.name === "drive_observed");
  writeFileSync(statePath(root, STATE_FILES.driveLog), drive + "\n");
  assert.deepEqual(detail(), { name: "drive_observed", ok: true, detail: "1 drive-class command(s) observed, last: curl http://127.0.0.1:8080/invoices.csv" });
  writeFileSync(statePath(root, STATE_FILES.driveLog), `{not json\n${drive}\n`);
  assert.deepEqual(detail(), { name: "drive_observed", ok: true, detail: "1 drive-class command(s) observed, last: curl http://127.0.0.1:8080/invoices.csv (1 unreadable line skipped)" });
});

test("drive: true counts only drive rows of this item and phase, not rows with no item or no phase (T-3.6)", (t) => {
  const { root, id } = setup(t);
  const row = (fields: object) => JSON.stringify({ kind: "drive", command: "curl http://127.0.0.1:8080/invoices.csv", ...fields });
  const drive = () => resultNamed(verify(root, id, 1, { runTests: false, env: process.env }), "drive_observed");
  writeFileSync(statePath(root, STATE_FILES.driveLog), `${row({ work_id: id, phase: null })}\n${row({ work_id: null, phase: 1 })}\n${row({ work_id: null, phase: null })}\n`);
  assert.deepEqual(drive(), { name: "drive_observed", ok: false, detail: "no drive row for phase 1 of this item" });
  writeFileSync(statePath(root, STATE_FILES.driveLog), `${row({ work_id: id, phase: 1 })}\n`);
  assert.equal(drive()?.ok, true);
});

function checkSetup(t: TestContext) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  const front = ["---", "lane: order", "phases:", "  - n: 1", "    files: []", "    drive:", "      - covers: T-1.1", "        method: POST", "        path: /orders", "        status: 201", "---"];
  writeArtifact(root, id, "order.md", [...front, "# O", "", "## Phase 1: Orders", "", "- **T-1.1** a", ""].join("\n"));
  const logHit = (path: string, status: number) =>
    writeFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify({ kind: "drive", command: "picket drive", source: "picket drive", work_id: id, phase: 1, hits: [{ method: "POST", path, status, ms: 2 }] }) + "\n");
  return { report: () => verify(root, id, 1, { runTests: false, env: process.env }), logHit };
}

test("verify reports one result per declared check in place of drive_observed", (t) => {
  const { report, logHit } = checkSetup(t);
  logHit("/orders", 400);
  const failedReport = report();
  assert.equal(failedReport.ok, false);
  assert.deepEqual(resultNamed(failedReport, "check:T-1.1"), { name: "check:T-1.1", ok: false, detail: "declared 201, ran 400" });
  assert.equal(resultNamed(failedReport, "drive_observed"), undefined);
  logHit("/api/orders", 201);
  assert.deepEqual(resultNamed(report(), "check:T-1.1"), { name: "check:T-1.1", ok: true, detail: "ran at /api/orders; declared /orders, the user rules at the gate" });
  logHit("/orders", 201);
  assert.deepEqual(resultNamed(report(), "check:T-1.1"), { name: "check:T-1.1", ok: true, detail: "POST /orders → 201" });
});

function unreadableSetup(t: TestContext, drive: string[]) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  const front = ["---", "lane: order", "phases:", "  - n: 1", "    files: []", ...drive, "---"];
  writeArtifact(root, id, "order.md", [...front, "# O", "", "## Phase 1: Orders", "", "- **T-1.1** a", ""].join("\n"));
  return verify(root, id, 1, { runTests: false, env: process.env });
}

test("verify fails closed on a drive list whose only check does not read", (t) => {
  const report = unreadableSetup(t, ["    drive:", "      - covers: T-1.1", "        method: get", "        path: /health", "        status: 200"]);
  assert.equal(report.ok, false);
  assert.deepEqual(resultNamed(report, "drive_checks"), { name: "drive_checks", ok: false, detail: "the record's drive list does not read: check 1 method must be upper-case letters, such as GET" });
});

test("verify fails closed on an empty drive list", (t) => {
  const report = unreadableSetup(t, ["    drive: []"]);
  assert.equal(report.ok, false);
  assert.equal(resultNamed(report, "drive_checks")?.ok, false);
});

test("verify on a malformed package.json fails tests as undetected and carries the parse warning", (t) => {
  const { root, id } = setup(t, true);
  writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
  const r = verify(root, id, 1, { runTests: true, env: process.env });
  assert.deepEqual(r.results.find((x) => x.name === "tests"), { name: "tests", ok: false, detail: "no test command detected" });
  assert.match(r.warnings?.[0] ?? "", /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
});

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const WRITES_RAN = { scripts: { test: "node -e \"require('fs').writeFileSync('ran.txt', 'x')\"" } };

function worktreeSetup(t: TestContext) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  writeArtifact(
    root,
    id,
    "order.md",
    [
      "---",
      "lane: order",
      "phases:",
      "  - n: 1",
      "    files: [src/Orders/pricing.cs]",
      "    greps:",
      "      - path: src/Orders/pricing.cs",
      "        pattern: worktree copy",
      "  - n: 2",
      "    files: [src/Orders/pricing.cs]",
      "    tests: true",
      "  - n: 3",
      "    files: [src/Billing/fees.cs]",
      "    tests: true",
      "---",
      "# O",
      "",
      "## Phase 1: Files",
      "",
      "## Phase 2: Orders tests",
      "",
      "## Phase 3: Billing tests",
      "",
    ].join("\n"),
  );
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: WORKTREE }, { path: "src/Billing", base: null }] });
  return { root, id };
}

const resultNamed = (report: VerifyReport, name: string) => report.results.find((x) => x.name === name);

test("verify reads a plan path's file and grep in the recorded worktree, not the main checkout (T-3.1, T-3.2)", (t) => {
  const { root, id } = worktreeSetup(t);
  const check = () => verify(root, id, 1, { runTests: false, env: process.env });
  writeIn(root, "src/Orders/pricing.cs", "worktree copy\n");
  assert.equal(resultNamed(check(), "file:src/Orders/pricing.cs")?.ok, false);

  writeIn(root, `${WORKTREE}/pricing.cs`, "older text\n");
  const report = check();
  assert.deepEqual(resultNamed(report, "file:src/Orders/pricing.cs"), { name: "file:src/Orders/pricing.cs", ok: true, detail: `at ${WORKTREE}/pricing.cs` });
  assert.equal(resultNamed(report, "grep:src/Orders/pricing.cs:worktree copy")?.ok, false);

  writeIn(root, `${WORKTREE}/pricing.cs`, "worktree copy\n");
  assert.equal(check().ok, true);
});

test("verify runs a nested phase's tests in its worktree only, and passes a checkout with no suite (T-3.3)", (t) => {
  const { root, id } = worktreeSetup(t);
  writeFileSync(join(root, "package.json"), JSON.stringify(WRITES_RAN));
  writeIn(root, `${WORKTREE}/package.json`, JSON.stringify(WRITES_RAN));
  writeIn(root, `${WORKTREE}/pricing.cs`, "x\n");
  const orders = verify(root, id, 2, { runTests: true, env: process.env });
  assert.deepEqual(resultNamed(orders, `tests:${WORKTREE}`), { name: `tests:${WORKTREE}`, ok: true, detail: "npm test" });
  assert.equal(resultNamed(orders, "tests"), undefined);
  assert.equal(existsSync(join(root, WORKTREE, "ran.txt")), true);
  assert.equal(existsSync(join(root, "ran.txt")), false);
  assert.equal(existsSync(statePath(root, "verify-src-Orders-.worktrees-RMS-12-test.log")), true);

  mkdirSync(join(root, "src", "Billing"), { recursive: true });
  const billing = verify(root, id, 3, { runTests: true, env: process.env });
  assert.deepEqual(resultNamed(billing, "tests:src/Billing"), { name: "tests:src/Billing", ok: true, detail: "no suite detected" });
});

function grepSetup(t: TestContext, absentLine: string[]) {
  const root = withProject(t, { picket: false });
  mkdirSync(stateDir(root), { recursive: true });
  const { id } = openItem(root, { lane: "order", title: "Units" });
  const front = ["---", "lane: order", "phases:", "  - n: 1", "    files: []", "    greps:", "      - path: src/units.ts", "        pattern: \\bmetres\\b", ...absentLine, "---"];
  writeArtifact(root, id, "order.md", [...front, "# O", "", "## Phase 1: Units", ""].join("\n"));
  const result = () => verify(root, id, 1, { runTests: false, env: process.env }).results[1];
  return { root, result };
}

test("an absent grep passes when the pattern does not match and fails when it does", (t) => {
  const { root, result } = grepSetup(t, ["        absent: true"]);
  writeIn(root, "src/units.ts", "export const unit = 'kilometres';\n");
  assert.deepEqual(result(), { name: "absent:src/units.ts:\\bmetres\\b", ok: true, detail: "" });
  writeIn(root, "src/units.ts", "export const unit = 'metres';\n");
  assert.deepEqual(result(), { name: "absent:src/units.ts:\\bmetres\\b", ok: false, detail: "" });
});

test("an absent grep passes on a missing file and says so", (t) => {
  const { result } = grepSetup(t, ["        absent: true"]);
  assert.deepEqual(result(), { name: "absent:src/units.ts:\\bmetres\\b", ok: true, detail: "file missing" });
});

test("a grep without absent passes on a match and fails on no match or a missing file", (t) => {
  const { root, result } = grepSetup(t, []);
  assert.deepEqual(result(), { name: "grep:src/units.ts:\\bmetres\\b", ok: false, detail: "" });
  writeIn(root, "src/units.ts", "export const unit = 'kilometres';\n");
  assert.deepEqual(result(), { name: "grep:src/units.ts:\\bmetres\\b", ok: false, detail: "" });
  writeIn(root, "src/units.ts", "export const unit = 'metres';\n");
  assert.deepEqual(result(), { name: "grep:src/units.ts:\\bmetres\\b", ok: true, detail: "" });
});

test("verify names the status, command and log of a failed test step", (t) => {
  const { root, id } = setup(t, true);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }));
  const r = verify(root, id, 1, { runTests: true, env: process.env });
  assert.deepEqual(r.results.find((x) => x.name === "tests"), { name: "tests", ok: false, detail: "failed · npm test · log .picket/state/verify-test.log" });
  assert.equal(existsSync(statePath(root, "verify-test.log")), true);
});

const RECORDED_MODEL = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const STOCK_FINDING = "stock: services/stock is not in the environment: add a service, or list it as shared, ignored or pending";

function engineRunner(root: string): EngineRunner {
  return (_program, args) => {
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (args.at(-1) === "--profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (args.includes("config")) return { status: 0, stdout: RECORDED_MODEL.replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`), stderr: "" };
    return { status: 1, stdout: "", stderr: "" };
  };
}

const noEngine: EngineRunner = () => ({ status: 1, stdout: "", stderr: "" });

function environmentItem(t: TestContext, { stockAtBase, phaseFile }: { stockAtBase: boolean; phaseFile: string }): { root: string; id: WorkId } {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  if (stockAtBase) writeIn(root, "services/stock/package.json", "{}\n");
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  const { id } = openItem(root, { lane: "order", title: "Stock" });
  writeArtifact(root, id, "order.md", ["---", "lane: order", "phases:", "  - n: 1", `    files: [${phaseFile}]`, "    tests: false", "    drive: false", "---", "# O", "", "## Phase 1: Stock", "", "t"].join("\n"));
  return { root, id };
}

const environmentOf = (report: VerifyReport) => report.results.find((x) => x.name === "environment");

test("a phase that adds an out-of-step service fails the environment result naming it (T-9.1)", (t) => {
  const { root, id } = environmentItem(t, { stockAtBase: false, phaseFile: "services/stock/package.json" });
  writeIn(root, "services/stock/package.json", "{}\n");
  const report = verify(root, id, 1, { runTests: false, env: {}, cwd: root, runner: engineRunner(root) });
  assert.deepEqual(environmentOf(report), { name: "environment", ok: false, detail: `out of step: ${STOCK_FINDING}` });
  assert.equal(report.ok, false);
});

test("an out-of-step folder present at the base and untouched is a warning, not a failure (T-9.2)", (t) => {
  const { root, id } = environmentItem(t, { stockAtBase: true, phaseFile: "README.md" });
  const report = verify(root, id, 1, { runTests: false, env: {}, cwd: root, runner: engineRunner(root) });
  assert.deepEqual(environmentOf(report), { name: "environment", ok: true, detail: "in step for the paths this item changed" });
  assert.deepEqual(report.warnings, [`environment: ${STOCK_FINDING}`]);
  assert.equal(report.ok, true);
});

test("a root without an environment gets no environment result (T-9.3)", (t) => {
  const { root, id } = setup(t);
  assert.equal(environmentOf(verify(root, id, 1, { runTests: false, env: {}, cwd: root, runner: noEngine })), undefined);
});

test("with the environment and no engine, the environment result fails as not checked (T-9.4)", (t) => {
  const { root, id } = environmentItem(t, { stockAtBase: false, phaseFile: "README.md" });
  const report = verify(root, id, 1, { runTests: false, env: {}, cwd: root, runner: noEngine });
  assert.deepEqual(environmentOf(report), { name: "environment", ok: false, detail: "environment not checked: no container engine" });
  assert.equal(scenariosOf(report), undefined);
});

const scenariosOf = (report: VerifyReport) => report.results.find((x) => x.name === "scenarios");
const ENV = { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "" };

function changedOrders(t: TestContext): { root: string; id: WorkId; key: string } {
  const { root, id } = environmentItem(t, { stockAtBase: false, phaseFile: "services/orders/server.mjs" });
  writeIn(root, "services/orders/server.mjs", "export const changed = true;\n");
  const model = readModel(JSON.parse(RECORDED_MODEL.replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`)));
  return { root, id, key: keyId(workingKey(root, readSnapshot(root, id).layout, model, ENV)) };
}

function replayed(root: string, id: WorkId, key: string, classes: ResultClass[], mode: RunMode = "full", versions: Record<string, string> = {}): void {
  const run: ScenarioRow = { type: "run", run: `r-${mode}-${key}`, item: id, mode, key, versions };
  const results = classes.map((cls, at): ScenarioRow => {
    const outcome = cls === "passed" ? "passed" : "failed";
    return { type: "result", run: run.run, scenario: `S-000${at + 1}`, fingerprint: "sha256:f", key, versions, outcome, attempts: outcome === "passed" ? 1 : 2, unstable: false, class: cls, detail: "" };
  });
  appendRows(root, [run, ...results]);
}

function verifyScenarios(root: string, id: WorkId) {
  return scenariosOf(verify(root, id, 1, { runTests: false, env: ENV, cwd: root, runner: engineRunner(root) }));
}

test("a full replay under the working key holding a new failure fails the scenarios result naming it (T-6.1)", (t) => {
  const { root, id, key } = changedOrders(t);
  replayed(root, id, key, ["passed", "new failure"]);
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: false, detail: "S-0002 new failure" });
});

test("a full replay with only passes and old failures is ok and summarised (T-6.2)", (t) => {
  const { root, id, key } = changedOrders(t);
  replayed(root, id, key, ["passed", "failing before the item"]);
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: true, detail: "2 replayed: 1 passed, 1 failing before the item" });
});

test("a changed item with no replay fails as not replayed; an unchanged one is ok (T-6.3)", (t) => {
  const { root, id } = changedOrders(t);
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: false, detail: `not replayed: run picket env replay ${id}` });
  const clean = environmentItem(t, { stockAtBase: false, phaseFile: "README.md" });
  assert.deepEqual(verifyScenarios(clean.root, clean.id), { name: "scenarios", ok: true, detail: "no app or environment change since the base" });
});

test("a full replay under another key is stale naming the app; an only replay does not count (T-6.4)", (t) => {
  const { root, id, key } = changedOrders(t);
  replayed(root, id, key, ["passed"], "only");
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: false, detail: `not replayed: run picket env replay ${id}` });
  replayed(root, id, "0123456789ab", ["passed"], "full", { orders: "0000000" });
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: false, detail: `stale: orders changed since the replay; run picket env replay ${id}` });
});

test("a full run row with a reason fails as not replayed with the reason", (t) => {
  const { root, id } = changedOrders(t);
  appendRows(root, [{ type: "run", run: "r-none", item: id, mode: "full", key: "", versions: {}, reason: "no container engine" }]);
  assert.deepEqual(verifyScenarios(root, id), { name: "scenarios", ok: false, detail: `not replayed: no container engine; run picket env replay ${id}` });
});

test("a root without an environment gets no scenarios result (T-6.5)", (t) => {
  const { root, id } = setup(t);
  assert.equal(scenariosOf(verify(root, id, 1, { runTests: false, env: {}, cwd: root, runner: noEngine })), undefined);
});
