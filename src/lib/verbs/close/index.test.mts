import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs, UsageError } from "../../util/args.mts";
import { sourceFor } from "../../shared/env/build-plan.mts";
import type { EngineRunner } from "../../shared/env/engine.mts";
import { readModel } from "../../shared/env/model.mts";
import { readLayout } from "../../shared/repos.mts";
import { keyId, workingKey } from "../../shared/scenarios/keys.mts";
import { readStacks, recordStack } from "../../shared/env/stacks.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { readState, writeState, type Lane } from "../../shared/work/state.mts";
import { openItem, withProject } from "#test/project.mts";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import { Refused } from "../../shared/action.mts";
import type { ResultClass } from "../../shared/scenarios/compare.mts";
import { writeScenario, type Card } from "../../shared/scenarios/format.mts";
import { appendRows, type ScenarioRow } from "../../shared/scenarios/results.mts";
import { appendDataRun } from "../../shared/data/runs.mts";
import { closingBlock } from "./block.mts";
import { close, defaultCloseMessage, type CloseResult, type Closing } from "./close.mts";
import { checkCommitMessage } from "../../shared/commit-message.mts";
import { verb } from "./index.mts";
import { fingerprintMatches } from "../../shared/scenarios/format.mts";
import { listScenarios } from "../../shared/scenarios/files.mts";
import { labelCard, readDefects, writeDefect } from "../../shared/scenarios/defects.mts";
import { appendTestRow, type CaseKind, type CaseRow, type TestEntry } from "../../shared/testing/results.mts";
import { setMarker } from "../../shared/work/markers.mts";
import { appendReply, type ReplyEntry } from "../../shared/work/replies.mts";
import { appendVerdict, type VerdictEntry } from "../../shared/work/verdict-log.mts";
import { chmodSync, existsSync } from "node:fs";
import { parseScenario } from "../../shared/scenarios/format.mts";
import { defectCard } from "../../shared/testing/cases.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

const AUDIT = "order · phases 0 · tokens none · bounces 0 · blocks 0";
const NO_FACTS: Closing = { audit: AUDIT, phases: 0, commits: null, decisions: null, review: null, questions: null, deferred: [], report: null, strategic: [], tested: null, unproved: [], kept: [], defects: [], learned: [], data: [] };

function closed(lane: Lane, closing: Partial<Closing> = {}, rest: Partial<CloseResult> = {}): CloseResult {
  return {
    id: ID as WorkId,
    lane,
    title: "X",
    status: "done",
    created: "2026-10-29T10:00:00.000Z",
    commit: null,
    message: "chore: close X",
    committed: [],
    left_staged: [],
    warnings: [],
    dirty: [],
    left: [],
    repeats: [],
    closing: { ...NO_FACTS, ...closing },
    worktrees: [],
    environment: null,
    ...rest,
  };
}

test("the default close message is the title after chore: close, its first letter lowercased (T-3.1)", () => {
  assert.equal(defaultCloseMessage("Orders"), "chore: close orders");
  assert.equal(defaultCloseMessage("Commit messages share one checked shape"), "chore: close commit messages share one checked shape");
  assert.equal(defaultCloseMessage("A note"), "chore: close a note");
});

test("a title whose first word is an acronym keeps it as given (T-3.1)", () => {
  for (const title of ["PR reviews read the linked ticket", "PRs read tickets", "API keys", "iOS build", "RMS-12 pricing"]) {
    assert.equal(defaultCloseMessage(title), `chore: close ${title}`);
  }
});

test("a long title is cut at its last whole word so the default stays a valid subject (T-3.2)", () => {
  const title = "Commit messages share one checked shape across every repository, today";
  assert.equal(title.length, 70);
  const message = defaultCloseMessage(title);
  assert.equal(message, "chore: close commit messages share one checked shape across every");
  assert.ok(message.length <= 72, message);
  assert.deepEqual(checkCommitMessage(message), { message });
});

test("a long title without a space is cut at 59 characters", () => {
  assert.equal(defaultCloseMessage("x".repeat(70)), `chore: close ${"x".repeat(59)}`);
});

test("close reads the message and the touched paths", () => {
  assert.deepEqual(parse([ID, "--message", "chore: done", "--touched", "a.ts,b.ts"]), { id: ID, message: "chore: done", touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse([ID]), { id: ID, message: undefined, touched: [] });
  assert.throws(() => parse([]), UsageError);
});

test("a fast close names its commit, or that nothing was committed", () => {
  assert.equal(closingBlock(closed("fast", {}, { commit: "abc1234", message: "fix: a" })), `## Expedited closed: ${ID}\nCommit: abc1234 fix: a\nAudit: ${AUDIT}`);
  assert.equal(closingBlock(closed("fast")), `## Expedited closed: ${ID}\nCommit: nothing to commit\nAudit: ${AUDIT}`);
});

test("an order close gives the phases, the commit range and the cumulative verdict", () => {
  const block = closingBlock(closed("order", { phases: 2, commits: { first: "aaa1111", last: "bbb2222" }, review: "APPROVED" }));
  assert.equal(block, `## Order closed: ${ID}\nPhases: 2 · commits aaa1111..bbb2222 · review: APPROVED\nAudit: ${AUDIT}`);
});

test("a design close counts its decisions and the amended ones", () => {
  const block = closingBlock(closed("design", { phases: 3, decisions: { count: 3, amended: 1 }, commits: { first: "aaa1111", last: "bbb2222" }, review: "APPROVED" }));
  assert.equal(block.split("\n")[1], "Phases: 3 · decisions: 3 (1 amended) · commits aaa1111..bbb2222 · review: APPROVED");
  assert.equal(closingBlock(closed("design", { phases: 1, decisions: { count: 2, amended: 0 } })).split("\n")[1], "Phases: 1 · decisions: 2");
});

test("a research close names the report, its findings and the ones for architect review", () => {
  const flagged = closingBlock(closed("research", { report: { findings: 2, architect_review: ["R-002"], strategic_review: [] } }));
  assert.equal(flagged, `## Research closed: ${ID}\nReport: work/${ID}/research.md · findings: 2 · architect review: R-002\nAudit: ${AUDIT}`);
  assert.match(closingBlock(closed("research", { report: { findings: 0, architect_review: [], strategic_review: [] } })), /architect review: no$/m);
});

test("ids flagged for strategic review close the research Report line and the design Phases line", () => {
  const report = closingBlock(closed("research", { report: { findings: 2, architect_review: [], strategic_review: ["R-002"] }, strategic: ["R-002"] }));
  assert.equal(report.split("\n")[1], `Report: work/${ID}/research.md · findings: 2 · architect review: no · strategic review: R-002`);
  const design = closingBlock(closed("design", { phases: 2, decisions: { count: 2, amended: 0 }, review: "APPROVED", strategic: ["D-002"] }));
  assert.equal(design.split("\n")[1], "Phases: 2 · decisions: 2 · review: APPROVED · strategic review: D-002");
});

test("Questions shows only when the cumulative review asked some", () => {
  assert.match(closingBlock(closed("order", { phases: 1, questions: "S-4 header row" })), /^Questions: S-4 header row$/m);
  assert.doesNotMatch(closingBlock(closed("order", { phases: 1 })), /^Questions:/m);
});

test("the Audit line follows the lane line in every lane (T-2.4)", () => {
  const audit = "design · phases 2 · tokens developer 3.5k · bounces 1 · blocks 0";
  for (const lane of ["fast", "order", "design", "research"] as const) {
    const report = lane === "research" ? { findings: 0, architect_review: [], strategic_review: [] } : null;
    assert.equal(closingBlock(closed(lane, { audit, report })).split("\n")[2], `Audit: ${audit}`, lane);
  }
});

test("each deferred criterion gets a Deferred line right after Questions", () => {
  const deferred = [{ id: "T-5.4", owner: "QA", gate: "before go-live" }];
  const lines = closingBlock(closed("design", { phases: 5, decisions: { count: 2, amended: 0 }, questions: "S-4 header row", deferred })).split("\n");
  assert.deepEqual(lines.slice(3), ["Questions: S-4 header row", "Deferred: T-5.4 QA, before go-live"]);
});

test("a close with no deferred criteria prints no Deferred line", () => {
  assert.doesNotMatch(closingBlock(closed("fast")), /^Deferred:/m);
  assert.doesNotMatch(closingBlock(closed("research", { report: { findings: 0, architect_review: [], strategic_review: [] } })), /^Deferred:/m);
});

test("each repeat gets a Repeats line and a Follow-up line, after what is left and the warnings", () => {
  const repeats = [
    { class: "Sl1", items: ["20261020-a", "20261021-b"] as WorkId[] },
    { class: "Ts4", items: ["20261022-c"] as WorkId[] },
  ];
  const left = [{ ts: "t", command: "git worktree remove .worktrees/x", why: "cleanup" }];
  const lines = closingBlock(closed("fast", {}, { repeats, left, left_staged: ["README.md"], warnings: ["HEAD moved"], dirty: ["src/a.ts"] })).split("\n");
  assert.deepEqual(lines.slice(3), [
    "Repeats: Sl1 (20261020-a, 20261021-b)",
    "Repeats: Ts4 (20261022-c)",
    "Left for you: git worktree remove .worktrees/x (cleanup)",
    "Left staged: README.md",
    "WARNING: HEAD moved",
    "WARNING: uncommitted changes: src/a.ts (commit them or `git checkout -- <path>`)",
    "Follow-up: Fix the Sl1 mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in 20261020-a, 20261021-b rejected.",
    "Follow-up: Fix the Ts4 mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in 20261022-c rejected.",
  ]);
});

type EngineCalls = { runner: EngineRunner; calls: string[][] };

function engine(answers: boolean): EngineCalls {
  const calls: string[][] = [];
  const runner: EngineRunner = (program, args) => {
    calls.push([program, ...args]);
    if (!answers) return { status: 1, stdout: "", stderr: "" };
    if (args[0] === "info") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (args[1] === "version") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (args[0] === "ps" && args.includes("json")) return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "ps") return { status: 0, stdout: "c1\n", stderr: "" };
    if (args[0] === "volume") return { status: 0, stdout: "orders-data\n", stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
  return { runner, calls };
}

function doneItem(t: TestContext, { environment }: { environment: boolean }): { root: string; id: WorkId } {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "fast", title: "Orders", source: "PROJ-481" });
  writeState(root, { ...readState(root, id), status: "done" }, new Date());
  if (environment) {
    mkdirSync(join(root, ".picket", "env"), { recursive: true });
    writeFileSync(join(root, ".picket", "env", "compose.yaml"), "services: {}\n");
    recordStack(root, "picket-proj-481", { item: id, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" });
  }
  return { root, id };
}

function closeWith(root: string, id: WorkId, runner: EngineRunner): CloseResult {
  return close(root, id, {}, { now: new Date("2026-11-14T10:00:00Z"), env: {}, cwd: root, runner });
}

test("close of an item with a stack and an environment removes it and reports what was removed (T-8.3)", (t) => {
  const { root, id } = doneItem(t, { environment: true });
  const result = closeWith(root, id, engine(true).runner);
  assert.deepEqual(result.environment, { removed: { containers: ["c1"], volumes: ["orders-data"], networks: [], images: [] }, warning: null });
  assert.deepEqual(readStacks(root), {});
  assert.ok(closingBlock(result).split("\n").includes("Environment: removed 1 container, 1 volume, 0 networks, 0 images"));
});

test("close with no engine warns that the environment was not removed and still ends done (T-8.3)", (t) => {
  const { root, id } = doneItem(t, { environment: true });
  const result = closeWith(root, id, engine(false).runner);
  assert.equal(result.status, "done");
  assert.deepEqual(result.environment, { removed: null, warning: "environment not removed: no container engine" });
  assert.ok(closingBlock(result).split("\n").includes("Environment: environment not removed: no container engine"));
});

test("close with no environment and no stack makes no engine call and reports no environment (T-8.4)", (t) => {
  const { root, id } = doneItem(t, { environment: false });
  const { runner, calls } = engine(true);
  const result = closeWith(root, id, runner);
  assert.equal(result.environment, null);
  assert.deepEqual(calls, []);
  assert.doesNotMatch(closingBlock(result), /^Environment:/m);
});

const SHARED_STACK = "picket-proj-481";

function labelled(item: string | null): EngineCalls {
  const inner = engine(true);
  const labels = item === null ? "" : JSON.stringify({ Labels: `com.docker.compose.project=${SHARED_STACK},io.github.picketai.item=${item}` });
  const runner: EngineRunner = (program, args) => {
    if (args[0] !== "ps" || !args.includes("json")) return inner.runner(program, args);
    inner.calls.push([program, ...args]);
    return { status: 0, stdout: labels, stderr: "" };
  };
  return { runner, calls: inner.calls };
}

function twoItems(t: TestContext, { recordB }: { recordB: boolean }): { root: string; a: WorkId; b: WorkId } {
  const root = withProject(t);
  const { id: a } = openItem(root, { lane: "fast", title: "Orders", source: "PROJ-481" });
  const { id: b } = openItem(root, { lane: "fast", title: "Payments", source: "PROJ-481" });
  writeState(root, { ...readState(root, a), status: "done" }, new Date());
  mkdirSync(join(root, ".picket", "env"), { recursive: true });
  writeFileSync(join(root, ".picket", "env", "compose.yaml"), "services: {}\n");
  if (recordB) recordStack(root, SHARED_STACK, { item: b, session: null, files: [], engine: { name: "docker", program: "docker", prefix: [] }, started: "2026-11-14T10:00:00.000Z" });
  return { root, a, b };
}

function removalCalls(calls: string[][]): string[][] {
  return calls.filter((args) => args.includes("down") || (args[1] === "image" && args[2] === "rm"));
}

test("closing A leaves the shared stack recorded for open item B in place and says whose it is (T-1.1)", (t) => {
  const { root, a, b } = twoItems(t, { recordB: true });
  const before = readStacks(root);
  const { runner, calls } = labelled(b);
  const result = closeWith(root, a, runner);
  assert.deepEqual(removalCalls(calls), []);
  assert.deepEqual(readStacks(root), before);
  assert.equal(before[SHARED_STACK].item, b);
  assert.equal(result.status, "done");
  assert.deepEqual(result.environment, { removed: null, warning: `environment not removed: ${SHARED_STACK} is recorded for ${b}` });
});

test("closing A leaves an unrecorded shared stack whose containers name open item B (T-1.3)", (t) => {
  const { root, a, b } = twoItems(t, { recordB: false });
  const { runner, calls } = labelled(b);
  const result = closeWith(root, a, runner);
  assert.deepEqual(removalCalls(calls), []);
  assert.deepEqual(readStacks(root), {});
  assert.deepEqual(result.environment, { removed: null, warning: `environment not removed: ${SHARED_STACK} belongs to ${b}, which is open; close it first` });
});

test("closing A still purges an unrecorded shared stack labelled with a done item or with none (T-1.4)", (t) => {
  for (const label of ["done", null] as const) {
    const { root, a, b } = twoItems(t, { recordB: false });
    if (label === "done") writeState(root, { ...readState(root, b), status: "done" }, new Date());
    const { runner, calls } = labelled(label === "done" ? b : null);
    const result = closeWith(root, a, runner);
    const down = removalCalls(calls).find((args) => args.includes("down"));
    assert.ok(down, String(label));
    assert.deepEqual(down.slice(-3), ["down", "--volumes", "--remove-orphans"]);
    assert.ok(down.includes(SHARED_STACK), String(label));
    assert.equal(result.environment?.warning, null, String(label));
  }
});

type FastOptions = { lane?: Lane; environment?: boolean; scenario?: "active" | "deprecated" | null };

function fastItem(t: TestContext, { lane = "fast", environment = true, scenario = "active" }: FastOptions = {}): { root: string; id: WorkId; head: () => string } {
  const root = gitRepo(t, { files: { "README.md": "u\n" } });
  if (environment) writeIn(root, ".picket/env/compose.yaml", "services: {}\n");
  if (scenario !== null) {
    const card: Card = { header: { id: "S-0002", kind: "smoke", covers: [], intent: "health", status: scenario, format: 1 }, steps: [{ word: "request", line: 1, method: "GET", target: "{orders}/health", headers: [], body: null }] };
    writeIn(root, ".picket/env/scenarios/S-0002.md", writeScenario(card));
  }
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "environment");
  const { id } = openItem(root, { lane, title: "Orders", source: "PROJ-481" });
  return { root, id, head: () => gitOut(root, "rev-parse", "HEAD") };
}

function affectedRun(root: string, id: WorkId, classes: ResultClass[], reason?: string): void {
  const run: ScenarioRow = { type: "run", run: `r-${classes.join("-")}`, item: id, mode: "affected", key: "k", versions: {}, ...(reason ? { reason } : {}) };
  const results = classes.map((cls, at): ScenarioRow => ({ type: "result", run: run.run, scenario: `S-000${at + 2}`, fingerprint: "sha256:f", key: "k", versions: {}, outcome: cls === "passed" ? "passed" : "failed", attempts: 1, unstable: false, class: cls, detail: "" }));
  appendRows(root, [run, ...results]);
}

const COMMITTER = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };

function closeFast(root: string, id: WorkId): CloseResult {
  return close(root, id, {}, { now: new Date("2026-11-15T10:00:00Z"), env: { ...process.env, ...COMMITTER }, cwd: root, runner: engine(false).runner });
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

test("a fast item with an active scenario and no affected replay is refused, stays open and commits nothing (T-10.1)", (t) => {
  const { root, id, head } = fastItem(t);
  const before = head();
  assert.equal(refusal(() => closeFast(root, id)), `run picket env replay ${id} --affected before closing`);
  assert.equal(readState(root, id).status, "open");
  assert.equal(head(), before);
});

test("a latest affected run with a new failure refuses naming the scenario and the way out (T-10.2)", (t) => {
  const { root, id } = fastItem(t);
  affectedRun(root, id, ["passed"]);
  affectedRun(root, id, ["new failure"]);
  assert.equal(
    refusal(() => closeFast(root, id)),
    `S-0002 new failure after this change: fix the change, or, if the request changes this behaviour on purpose, run picket set ${id} status=abandoned and take it to the order lane`,
  );
  assert.equal(readState(root, id).status, "open");
});

test("an affected run with no engine lets the close commit (T-10.2)", (t) => {
  const { root, id, head } = fastItem(t);
  const before = head();
  affectedRun(root, id, [], "no container engine");
  const result = closeFast(root, id);
  assert.equal(result.status, "done");
  assert.notEqual(head(), before);
});

const RECORDED_MODEL = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const VALUE_FLAGS = ["-p", "--project-directory", "-f", "--profile"];

function umbrellaModelAt(root: string): string {
  return RECORDED_MODEL.replaceAll('"/umbrella/', `"${root.replaceAll("\\", "/")}/`);
}

function umbrellaEngine(root: string): EngineRunner {
  return (_program, args) => {
    const words = args.filter((arg, i) => !VALUE_FLAGS.includes(arg) && !VALUE_FLAGS.includes(args[i - 1]));
    const call = words.join(" ");
    if (call === "info --format json") return { status: 0, stdout: '{"OSType":"linux"}', stderr: "" };
    if (call === "compose version --format json") return { status: 0, stdout: '{"version":"2.29.1"}', stderr: "" };
    if (call === "compose config --profiles") return { status: 0, stdout: "picket-data\n", stderr: "" };
    if (words[1] === "config") return { status: 0, stdout: umbrellaModelAt(root), stderr: "" };
    return { status: 0, stdout: "", stderr: "" };
  };
}

const UMBRELLA_ENV = { ...process.env, ...COMMITTER };

function umbrellaItem(t: TestContext): { root: string; id: WorkId; head: () => string } {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  const { id } = openItem(root, { lane: "fast", title: "Orders", source: "PROJ-481" });
  return { root, id, head: () => gitOut(root, "rev-parse", "HEAD") };
}

function keyedAffectedRun(root: string, id: WorkId, classes: ResultClass[]): void {
  const model = readModel(JSON.parse(umbrellaModelAt(root)));
  const layout = readLayout(root, id);
  const key = keyId(workingKey(root, layout, model, UMBRELLA_ENV));
  const versions = Object.fromEntries(model.services.filter((service) => service.role === "app" && service.build !== null && service.profiles.length === 0).map((service) => [service.name, sourceFor(root, layout, service, UMBRELLA_ENV).version]));
  const run: ScenarioRow = { type: "run", run: "r-keyed", item: id, mode: "affected", key, versions };
  const results = classes.map((cls, at): ScenarioRow => ({ type: "result", run: run.run, scenario: `S-000${at + 1}`, fingerprint: "sha256:f", key, versions, outcome: cls === "passed" ? "passed" : "failed", attempts: 1, unstable: false, class: cls, detail: "" }));
  appendRows(root, [run, ...results]);
}

function closeUmbrella(root: string, id: WorkId, runner: EngineRunner): CloseResult {
  return close(root, id, {}, { now: new Date("2026-11-15T10:00:00Z"), env: UMBRELLA_ENV, cwd: root, runner });
}

test("an affected run on the working key with only passes and old failures lets the close commit", (t) => {
  const { root, id, head } = umbrellaItem(t);
  const before = head();
  keyedAffectedRun(root, id, ["passed", "failing before the item"]);
  const result = closeUmbrella(root, id, umbrellaEngine(root));
  assert.equal(result.status, "done");
  assert.notEqual(head(), before);
});

test("an app edited after the affected run refuses the close as stale, naming the app", (t) => {
  const { root, id, head } = umbrellaItem(t);
  keyedAffectedRun(root, id, ["passed"]);
  writeFileSync(join(root, "services", "orders", "server.mjs"), "edited after the replay\n");
  const before = head();
  assert.equal(refusal(() => closeUmbrella(root, id, umbrellaEngine(root))), `stale: orders changed since the affected replay; run picket env replay ${id} --affected`);
  assert.equal(readState(root, id).status, "open");
  assert.equal(head(), before);
});

test("a keyed affected run with no engine at close refuses because the replay cannot be checked", (t) => {
  const { root, id, head } = umbrellaItem(t);
  keyedAffectedRun(root, id, ["passed"]);
  const before = head();
  assert.equal(refusal(() => closeUmbrella(root, id, engine(false).runner)), `the affected replay cannot be checked against the working tree: no container engine; run picket env replay ${id} --affected`);
  assert.equal(readState(root, id).status, "open");
  assert.equal(head(), before);
});

test("an order item, and a fast item without the environment or an active scenario, close as before (T-10.3)", (t) => {
  for (const options of [{ lane: "order" as Lane }, { environment: false }, { scenario: null }, { scenario: "deprecated" as const }]) {
    const { root, id } = fastItem(t, options);
    if (options.lane === "order") writeState(root, { ...readState(root, id), status: "done" }, new Date());
    assert.equal(closeFast(root, id).status, "done", JSON.stringify(options));
  }
});

const TESTED_DESIGN = "---\nlane: design\nphases:\n  - n: 1\n    files: [src/a.js]\n  - n: 2\n    files: [src/b.js]\n    drive:\n      - covers: T-2.1\n        method: GET\n        path: /orders\n        status: 200\n      - covers: T-2.3\n        method: POST\n        path: /orders\n        status: 201\n---\n# D\n\n## Phase 1: A\n\nt\n\n## Phase 2: B\n\n- **T-2.1** orders are listed\n- **T-2.3** an order is placed\n";
const STAGE_TS = (minute: number) => new Date(`2026-11-17T10:${String(minute).padStart(2, "0")}:00.000Z`);
const GET_STEPS = "request GET {orders}/orders\nexpect status 200\n";
const OWNED_POST = 'request POST {orders}/orders\n  body {"reference": "PKT-{run}"}\nexpect status 201\n';
const UNOWNED_POST = 'request POST {orders}/orders\n  body {"reference": "a"}\nexpect status 201\n';

type StageSetup = { lane?: Lane; environment?: boolean; verdicts?: [string, string, string | null, Partial<VerdictEntry>?][]; cases?: TestEntry[]; replies?: ReplyEntry[]; done?: boolean };

function testCase(id: string, kind: CaseKind, steps: string, fields: Partial<CaseRow> = {}): TestEntry {
  return { round: 2, type: "case", case: id, criterion: "T-2.1", kind, intent: "orders are listed", steps, outcome: "passed", attempts: 1, unstable: false, detail: "", mocks: [], ...fields };
}

function testedItem(t: TestContext, { lane = "design", environment = true, verdicts = [], cases = [], replies = [], done = false }: StageSetup = {}): { root: string; id: WorkId } {
  const root = gitRepo(t, { files: { "README.md": "u\n" } });
  if (environment) {
    writeIn(root, ".picket/env/compose.yaml", "services: {}\n");
    const card: Card = { header: { id: "S-0002", kind: "smoke", covers: [], intent: "health", status: "active", format: 1 }, steps: [{ word: "request", line: 1, method: "GET", target: "{orders}/health", headers: [], body: null }] };
    writeIn(root, ".picket/env/scenarios/S-0002.md", writeScenario(card));
  }
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "--allow-empty", "-m", "environment");
  const { id } = openItem(root, { lane, title: "Orders" });
  writeIn(root, `work/${id}/${lane}.md`, TESTED_DESIGN.replace("lane: design", `lane: ${lane}`));
  for (const n of [1, 2]) for (const mark of ["done", "approved", "reviewed"] as const) setMarker(root, id, n, mark, STAGE_TS(0));
  verdicts.forEach(([agent, verdict, scope, extra = {}], at) => appendVerdict(root, id, { agent, verdict, phase: agent === "tester" ? null : 2, scope, through: null, ...extra }, STAGE_TS(at + 1)));
  for (const entry of cases) appendTestRow(root, id, entry, STAGE_TS(20));
  for (const entry of replies) appendReply(root, id, entry, STAGE_TS(30));
  if (done) writeState(root, { ...readState(root, id), status: "done" }, new Date());
  return { root, id };
}

const blockLines = (result: CloseResult) => closingBlock(result).split("\n");

test("the closing line names each mock's real service from its definition, else the name before -mock, sorted (T-4.3)", (t) => {
  const cases = [testCase("C-01", "normal", GET_STEPS, { mocks: ["payments-mock"] }), testCase("C-02", "boundary", GET_STEPS, { mocks: ["ledger-mock", "payments-mock"] })];
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"], ["tester", "APPROVED", "test", { round: 2 }]], cases });
  writeIn(root, ".picket/env/mocks/payments-mock.md", "---\nreplaces: payments-api\nsource: recorded\nrecorded: 2026-11-18\nformat: 1\n---\nwhen GET /charges/*\n  status 200\n");
  const lines = blockLines(closeFast(root, id));
  assert.ok(lines.includes("Not verified end to end: ledger, payments-api"), lines.join("\n"));
});

test("each SQL run of the item prints a Data line with server, database, exit status and approval after the tested lines, and an old row says the approval is not recorded (T-8.5, T-5.3, T-5.4)", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  appendDataRun(root, { at: "2026-11-18T10:00:00.000Z", item: id, entry: "customer", path: "data/customer.sql", sha256: "a".repeat(64), server: "sql01", database: "orders_test", status: 0 });
  appendDataRun(root, { at: "2026-11-18T10:00:00.000Z", item: "20261118-other", entry: "other", path: "data/other.sql", sha256: "b".repeat(64), server: "sql02", database: "x", status: 1 });
  appendDataRun(root, { at: "2026-11-18T11:00:00.000Z", item: id, entry: "customer", path: "data/customer.sql", sha256: "a".repeat(64), server: "sql01", database: "orders_test", status: 0, confirmation: "c-1", approved_at: "2026-11-18T09:00:00.000Z" });
  const lines = blockLines(closeFast(root, id));
  const old = "Data: customer ran on server sql01, database orders_test, exit 0, approval not recorded";
  assert.deepEqual(lines.filter((line) => line.startsWith("Data: ")), [old, "Data: customer ran on server sql01, database orders_test, exit 0, approved 2026-11-18T09:00:00.000Z"]);
  assert.ok(lines.indexOf(old) > lines.findIndex((line) => line.startsWith("Tested: ")), lines.join("\n"));
});

test("an item with no tester verdict names the mocks of its latest full replay (T-4.4)", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  const rows: ScenarioRow[] = [
    { type: "run", run: "r1", item: id, mode: "full", key: "k", versions: {} },
    { type: "result", run: "r1", scenario: "S-0002", fingerprint: "sha256:f", key: "k", versions: {}, outcome: "passed", attempts: 1, unstable: false, class: "passed", detail: "", mocks: ["payments-mock"], gaps: [] },
  ];
  appendRows(root, rows);
  const result = closeFast(root, id);
  assert.equal(result.closing.tested, "not tested");
  assert.ok(blockLines(result).includes("Not verified end to end: payments"), blockLines(result).join("\n"));
});

test("a tester APPROVED in round 2 prints its counts, the mocked service and the kept cases (T-9.1, T-9.4, T-9.5)", (t) => {
  const cases = [
    testCase("C-01", "normal", GET_STEPS, { mocks: ["payments-mock"] }),
    testCase("C-02", "boundary", OWNED_POST),
    testCase("C-03", "state", GET_STEPS, { unstable: true, attempts: 2 }),
    testCase("C-04", "negative", UNOWNED_POST),
    testCase("C-05", "permission", "request GET {orders}/orders\n  header x-key: ***\nexpect status 200\n"),
    { round: 2, type: "cell", criterion: "T-2.3", kind: "state", outcome: "not covered", why: "the cap is reached" } as TestEntry,
  ];
  const verdicts: StageSetup["verdicts"] = [["reviewer", "APPROVED", "cumulative"], ["tester", "CHANGES REQUIRED", "test", { round: 1, test_route: "user" }], ["tester", "APPROVED", "test", { round: 2 }]];
  const replies: ReplyEntry[] = [{ action: "resolve_tests", phase: null, reply: "t: yes", choice: "answers", answers: "yes" }];
  const { root, id } = testedItem(t, { verdicts, cases, replies });
  const result = closeFast(root, id);
  const lines = blockLines(result);
  assert.ok(lines.includes("Tested: APPROVED in round 2 · 5 passed, 1 not covered"), lines.join("\n"));
  assert.ok(lines.includes("Not verified end to end: payments"), lines.join("\n"));
  assert.ok(lines.includes("Kept: S-0003 (T-2.1 normal), S-0004 (T-2.1 boundary)"), lines.join("\n"));
  for (const file of ["S-0003.md", "S-0004.md"]) {
    const path = `.picket/env/scenarios/${file}`;
    assert.ok(result.committed.includes(path), result.committed.join(", "));
    assert.ok(fingerprintMatches(readFileSync(join(root, path), "utf8")), file);
  }
  assert.equal(listScenarios(root).length, 3);
});

function failingBeforeRun(root: string, id: WorkId, run: string): void {
  const versions = { orders: "1a2b3c4" };
  const rows: ScenarioRow[] = [
    { type: "run", run, item: id, mode: "full", key: "k", versions },
    { type: "result", run, scenario: "S-0002", fingerprint: "sha256:f", key: "k", versions, outcome: "failed", attempts: 2, unstable: false, class: "failing before the item", detail: "step 1: expected status 200, got 500" },
  ];
  appendRows(root, rows);
}

const LABELLED_CARD = ".picket/env/scenarios/S-0002.md";
const FIRST_DEFECT = ".picket/env/scenarios/defects/DF-0001.md";

test("closing an item whose full run failed before the item records an open defect, labels the card and commits both (T-1.6)", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  failingBeforeRun(root, id, "r1");
  const result = closeFast(root, id);
  assert.deepEqual(readDefects(root), [
    { id: "DF-0001", status: "open", opened: "2026-11-15", found_in: id, scenario: "S-0002", expected: "health", actual: "step 1: expected status 200, got 500", evidence: "run r1 on orders 1a2b3c4" },
  ]);
  const card = readFileSync(join(root, LABELLED_CARD), "utf8");
  assert.match(card, /^known: DF-0001$/m);
  assert.ok(fingerprintMatches(card));
  assert.ok(result.committed.includes(LABELLED_CARD) && result.committed.includes(FIRST_DEFECT), result.committed.join(", "));
  assert.deepEqual(gitOut(root, "status", "--porcelain", "--", ".picket/env/scenarios"), "");
  assert.deepEqual(result.closing.defects, ["DF-0001 recorded from S-0002"]);
  const lines = blockLines(result);
  assert.ok(lines.includes("Known defects: DF-0001 recorded from S-0002"), lines.join("\n"));
});

test("a second close, or another item's run holding the same row, writes no second entry (T-1.7)", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  failingBeforeRun(root, id, "r1");
  closeFast(root, id);
  const again = closeFast(root, id);
  assert.deepEqual(again.closing.defects, []);
  assert.ok(!blockLines(again).some((line) => line.startsWith("Known defects:")));
  const { id: other } = openItem(root, { lane: "order", title: "Other" });
  writeState(root, { ...readState(root, other), status: "done" }, new Date());
  failingBeforeRun(root, other, "r2");
  assert.deepEqual(closeFast(root, other).closing.defects, []);
  assert.deepEqual(readDefects(root).map((entry) => entry.id), ["DF-0001"]);
});

function knownItem(t: TestContext, cls: ResultClass, detail: string): { root: string; id: WorkId } {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  writeDefect(root, { id: "DF-0001", status: "open", opened: "2026-10-10", found_in: "20261010-orders", scenario: "S-0002", expected: "health", actual: "step 1: expected status 200, got 500", evidence: "run r0 on orders 1a2b3c4" });
  writeIn(root, LABELLED_CARD, labelCard(readFileSync(join(root, LABELLED_CARD), "utf8"), { known: "DF-0001" }));
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "known defect");
  const versions = { orders: "5d6e7f8" };
  appendRows(root, [
    { type: "run", run: "r1", item: id, mode: "full", key: "k", versions },
    { type: "result", run: "r1", scenario: "S-0002", fingerprint: "sha256:f", key: "k", versions, outcome: "passed", attempts: 1, unstable: false, class: cls, detail, defect: "DF-0001" },
  ]);
  return { root, id };
}

test("a known defect fixed outside the item is closed with its range, relabelled and committed (T-2.7)", (t) => {
  const { root, id } = knownItem(t, "fixed outside this item", "orders 1a2b3c4..5d6e7f8");
  const result = closeFast(root, id);
  const [entry] = readDefects(root);
  assert.deepEqual(entry, { id: "DF-0001", status: "fixed", opened: "2026-10-10", found_in: "20261010-orders", scenario: "S-0002", expected: "health", actual: "step 1: expected status 200, got 500", evidence: "run r0 on orders 1a2b3c4", fixed: "2026-11-15", fixed_in: id, reason: "fixed outside this item", range: "orders 1a2b3c4..5d6e7f8" });
  const card = readFileSync(join(root, LABELLED_CARD), "utf8");
  assert.match(card, /^defect: DF-0001$/m);
  assert.doesNotMatch(card, /^known:/m);
  assert.ok(fingerprintMatches(card));
  assert.ok(result.committed.includes(LABELLED_CARD) && result.committed.includes(FIRST_DEFECT), result.committed.join(", "));
  assert.ok(blockLines(result).includes("Known defects: DF-0001 fixed outside this item (orders 1a2b3c4..5d6e7f8)"), blockLines(result).join("\n"));
});

test("a known defect fixed by the item is closed with no range", (t) => {
  const { root, id } = knownItem(t, "fixed by this item", "");
  const result = closeFast(root, id);
  const [entry] = readDefects(root);
  assert.deepEqual([entry.status, entry.reason, entry.range], ["fixed", "fixed by this item", undefined]);
  assert.deepEqual(result.closing.defects, ["DF-0001 fixed by this item"]);
});

test("a side effect leaves the entry open and the label in place, and says so (T-2.7)", (t) => {
  const { root, id } = knownItem(t, "side effect", "changed: src/orders/cart.ts");
  const before = readFileSync(join(root, LABELLED_CARD), "utf8");
  const result = closeFast(root, id);
  assert.equal(readDefects(root)[0].status, "open");
  assert.equal(readFileSync(join(root, LABELLED_CARD), "utf8"), before);
  assert.ok(blockLines(result).includes("Known defects: DF-0001 side effect (changed: src/orders/cart.ts); still open"), blockLines(result).join("\n"));
});

test("a later run that did not replay is passed over for the run before it", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  failingBeforeRun(root, id, "r1");
  appendRows(root, [{ type: "run", run: "r2", item: id, mode: "full", key: "", versions: {}, reason: "no container engine" }]);
  assert.deepEqual(closeFast(root, id).closing.defects, ["DF-0001 recorded from S-0002"]);
});

test("a result on a deprecated card records nothing", (t) => {
  const { root, id } = testedItem(t, { verdicts: [["reviewer", "APPROVED", "cumulative"]], done: true });
  failingBeforeRun(root, id, "r1");
  const card = readFileSync(join(root, LABELLED_CARD), "utf8");
  writeIn(root, LABELLED_CARD, card.replace("status: active", "status: deprecated"));
  gitIn(root, "commit", "-q", "-am", "deprecate");
  assert.deepEqual(closeFast(root, id).closing.defects, []);
  assert.deepEqual(readDefects(root), []);
});

const FOUND_STEPS = 'request POST {orders}/orders\n  body {"reference": "PKT-{run}", "quantity": -1}\nexpect status 400\n';
const FOUND_CARD = ".picket/env/scenarios/S-0001.md";
const FOUND_ROW: TestEntry = { round: 1, type: "defect", found: "K-01", kind: "negative", intent: "an order with a negative quantity is refused", steps: FOUND_STEPS, evidence: "POST /orders answered 201", outcome: "failed", detail: "step 2: expected status 400, got 201", attempts: 2, mocks: ["payments-mock"] };

function foundItem(t: TestContext): { root: string; id: WorkId } {
  return testedItem(t, { environment: false, verdicts: [["reviewer", "APPROVED", "cumulative"]], cases: [FOUND_ROW], done: true });
}

test("closing an item holding a recorded defect writes an open entry and a known card, commits both and names them (T-1.5)", (t) => {
  const { root, id } = foundItem(t);
  const result = closeFast(root, id);
  assert.deepEqual(readDefects(root), [
    { id: "DF-0001", status: "open", opened: "2026-11-17", found_in: id, scenario: "S-0001", expected: "an order with a negative quantity is refused", actual: "step 2: expected status 400, got 201", evidence: "POST /orders answered 201; through a mock: payments-mock", case: "K-01" },
  ]);
  const text = readFileSync(join(root, FOUND_CARD), "utf8");
  const { card, problems } = parseScenario(text);
  assert.deepEqual(problems, []);
  assert.ok(fingerprintMatches(text));
  assert.deepEqual([card?.header.known, card?.header.covers, card?.header.kind, card?.header.intent, card?.header.status], ["DF-0001", [], "negative", "an order with a negative quantity is refused", "active"]);
  assert.equal(text.slice(text.indexOf("request ")), FOUND_STEPS);
  assert.ok(result.committed.includes(FOUND_CARD) && result.committed.includes(FIRST_DEFECT), result.committed.join(", "));
  assert.ok(blockLines(result).includes("Known defects: DF-0001 recorded from K-01 (S-0001)"), blockLines(result).join("\n"));
});

test("a second close writes no second entry or card for a recorded defect (T-1.6)", (t) => {
  const { root, id } = foundItem(t);
  closeFast(root, id);
  assert.deepEqual(closeFast(root, id).closing.defects, []);
  assert.deepEqual(readDefects(root).map((entry) => entry.id), ["DF-0001"]);
  assert.deepEqual(listScenarios(root).map((scenario) => scenario.id), ["S-0001"]);
});

test("a close whose commit fails leaves neither the entry nor the card of a recorded defect on disk (T-1.6)", (t) => {
  const { root, id } = foundItem(t);
  const hook = join(root, ".git", "hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\necho 'blocked by hook' >&2\nexit 1\n");
  chmodSync(hook, 0o755);
  assert.match(refusal(() => closeFast(root, id)), /blocked by hook/);
  assert.equal(existsSync(join(root, FIRST_DEFECT)), false);
  assert.equal(existsSync(join(root, FOUND_CARD)), false);
});

const ROUND_TWO = new Date(Date.UTC(2026, 10, 18, 10));

function rerunOf(outcome: "passed" | "failed" | "blocked", detail: string): TestEntry {
  return { ...FOUND_ROW, round: 2, outcome, detail, attempts: 1 } as TestEntry;
}

test("a recorded defect whose rerun passed records nothing and says so (T-2.1)", (t) => {
  const { root, id } = foundItem(t);
  appendTestRow(root, id, rerunOf("passed", ""), ROUND_TWO);
  const result = closeFast(root, id);
  assert.deepEqual(readDefects(root), []);
  assert.deepEqual(listScenarios(root), []);
  assert.ok(blockLines(result).includes("Known defects: K-01 passed in round 2, not recorded"), blockLines(result).join("\n"));
});

test("a recorded defect failing again records one entry with the newest detail, opened on the first day (T-2.2)", (t) => {
  const { root, id } = foundItem(t);
  appendTestRow(root, id, rerunOf("failed", "step 2: expected status 400, got 202"), ROUND_TWO);
  closeFast(root, id);
  assert.deepEqual(readDefects(root).map((entry) => [entry.id, entry.status, entry.actual, entry.opened, entry.case]), [["DF-0001", "open", "step 2: expected status 400, got 202", "2026-11-17", "K-01"]]);
  assert.deepEqual(listScenarios(root).map((scenario) => [scenario.id, scenario.card?.header.known]), [["S-0001", "DF-0001"]]);
});

test("a recorded defect whose rerun was blocked keeps the failing run's detail (T-2.3)", (t) => {
  const { root, id } = foundItem(t);
  appendTestRow(root, id, rerunOf("blocked", "payments-mock has no answer for POST /refunds"), ROUND_TWO);
  closeFast(root, id);
  assert.deepEqual(readDefects(root).map((entry) => [entry.id, entry.actual, entry.opened]), [["DF-0001", "step 2: expected status 400, got 201", "2026-11-17"]]);
});

test("a recorded defect whose steps no longer parse is named with its problems and the others are recorded (T-2.4)", (t) => {
  const broken = "fetch the orders\nexpect status 400\n";
  const unparsed = { ...FOUND_ROW, steps: broken } as TestEntry;
  const other = { ...FOUND_ROW, found: "K-02" } as TestEntry;
  const { root, id } = testedItem(t, { environment: false, verdicts: [["reviewer", "APPROVED", "cumulative"]], cases: [unparsed, other], done: true });
  const built = defectCard("negative", "an order with a negative quantity is refused", broken);
  assert.ok("problems" in built);
  const result = closeFast(root, id);
  assert.deepEqual(readDefects(root).map((entry) => [entry.id, entry.case]), [["DF-0001", "K-02"]]);
  assert.deepEqual(listScenarios(root).map((scenario) => scenario.id), ["S-0001"]);
  assert.deepEqual(result.closing.defects, [`K-01 not recorded: ${built.problems.join(", ")}`, "DF-0001 recorded from K-02 (S-0001)"]);
});

const DEFECT_ESCAPE: TestEntry = { round: 1, type: "escape", case: "DF-0001", root_cause: "the health route skipped the database ping", escaped: "unit test" };

test("a fast close is refused while the request names an open known defect with no escape row, and closes once it has one (T-2.4)", (t) => {
  const { root, id, head } = fastItem(t, { scenario: null });
  writeDefect(root, { id: "DF-0001", status: "open", opened: "2026-10-10", found_in: "20261010-orders", scenario: "S-0002", expected: "health", actual: "y", evidence: "z" });
  writeIn(root, `work/${id}/request.md`, "fixes DF-0001\n");
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "known defect");
  const before = head();
  assert.equal(refusal(() => closeFast(root, id)), `record where DF-0001 escaped first: picket test escape ${id} DF-0001 --root-cause "<text>" --escaped "<point>"`);
  assert.equal(readState(root, id).status, "open");
  assert.equal(head(), before);
  appendTestRow(root, id, DEFECT_ESCAPE, STAGE_TS(5));
  assert.equal(closeFast(root, id).status, "done");
});

test("a known defect fixed by the item takes the root cause and escape point of its escape row (T-2.5)", (t) => {
  const { root, id } = knownItem(t, "fixed by this item", "");
  appendTestRow(root, id, DEFECT_ESCAPE, STAGE_TS(5));
  closeFast(root, id);
  const [entry] = readDefects(root);
  assert.deepEqual([entry.status, entry.reason, entry.root_cause, entry.escaped], ["fixed", "fixed by this item", "the health route skipped the database ping", "unit test"]);
});

test("a known defect fixed outside the item takes no root cause or escape point even with an escape row (T-2.5)", (t) => {
  const { root, id } = knownItem(t, "fixed outside this item", "orders 1a2b3c4..5d6e7f8");
  appendTestRow(root, id, DEFECT_ESCAPE, STAGE_TS(5));
  closeFast(root, id);
  const [entry] = readDefects(root);
  assert.deepEqual([entry.status, entry.reason, entry.root_cause, entry.escaped], ["fixed", "fixed outside this item", undefined, undefined]);
});

test("a known defect fixed by the item counts with another item's unit test escape in the Learned line and the memory (T-2.6)", (t) => {
  const { root, id } = knownItem(t, "fixed by this item", "");
  writeDefect(root, { id: "DF-0002", status: "fixed", opened: "2026-11-01", found_in: "20261101-a", scenario: "none", expected: "x", actual: "y", evidence: "z", case: "C-01", root_cause: "a rounding slip", escaped: "unit test", fixed: "2026-11-02", fixed_in: "20261101-a", reason: "fixed by this item" });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "earlier defect");
  appendTestRow(root, id, DEFECT_ESCAPE, STAGE_TS(5));
  const result = closeFast(root, id);
  const memory = ".claude/agent-memory/picket-developer/escaped-defects.md";
  assert.ok(blockLines(result).includes(`Learned: unit test in 2 items (DF-0001, DF-0002) to ${memory}`), blockLines(result).join("\n"));
  assert.match(readFileSync(join(root, memory), "utf8"), /DF-0001 \([^)]*\): the health route skipped the database ping/);
});

const FIX_ROUND: StageSetup["verdicts"] = [["reviewer", "APPROVED", "cumulative"], ["tester", "CHANGES REQUIRED", "test", { round: 1, test_route: "fix" }], ["tester", "APPROVED", "test", { round: 2 }]];

function fixedCaseRows(escaped: string | null): TestEntry[] {
  const escape: TestEntry[] = escaped === null ? [] : [{ round: 2, type: "escape", case: "C-03", root_cause: "the total skipped the discount", escaped }];
  return [
    testCase("C-03", "normal", GET_STEPS, { round: 1, outcome: "failed", attempts: 2, detail: "step 2: expected status 200, got 500" }),
    { round: 1, type: "class", case: "C-03", class: "product", evidence: "the service answered 500" },
    ...escape,
    testCase("C-03", "normal", GET_STEPS),
  ];
}

test("a product case fixed in the next round becomes a fixed entry with every field, once (T-3.4)", (t) => {
  const { root, id } = testedItem(t, { verdicts: FIX_ROUND, cases: fixedCaseRows("unit test") });
  const result = closeFast(root, id);
  assert.deepEqual(readDefects(root), [
    {
      id: "DF-0001",
      status: "fixed",
      opened: "2026-11-17",
      found_in: id,
      scenario: "S-0003",
      expected: "orders are listed",
      actual: "step 2: expected status 200, got 500",
      evidence: "the service answered 500",
      case: "C-03",
      root_cause: "the total skipped the discount",
      escaped: "unit test",
      fixed: "2026-11-15",
      fixed_in: id,
      reason: "fixed by this item",
    },
  ]);
  assert.ok(result.committed.includes(FIRST_DEFECT), result.committed.join(", "));
  assert.ok(blockLines(result).includes("Known defects: DF-0001 fixed by this item (C-03)"), blockLines(result).join("\n"));
  closeFast(root, id);
  assert.deepEqual(readDefects(root).map((entry) => entry.id), ["DF-0001"]);
});

test("a second item that escaped a unit test prints the Learned line and writes the developer's memory, uncommitted (T-3.7)", (t) => {
  const { root, id } = testedItem(t, { verdicts: FIX_ROUND, cases: fixedCaseRows("unit test") });
  writeDefect(root, { id: "DF-0001", status: "fixed", opened: "2026-11-01", found_in: "20261101-a", scenario: "none", expected: "x", actual: "y", evidence: "z", case: "C-01", root_cause: "a rounding slip", escaped: "unit test", fixed: "2026-11-02", fixed_in: "20261101-a", reason: "fixed by this item" });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "earlier defect");
  const result = closeFast(root, id);
  const memory = ".claude/agent-memory/picket-developer/escaped-defects.md";
  assert.ok(blockLines(result).includes(`Learned: unit test in 2 items (DF-0001, DF-0002) to ${memory}`), blockLines(result).join("\n"));
  assert.match(readFileSync(join(root, memory), "utf8"), /^- Defects escaped a unit test in 2 items: DF-0001 \(20261101-a\): a rounding slip; DF-0002 \(/m);
  assert.ok(!result.committed.some((path) => path.startsWith(".claude/")), result.committed.join(", "));
});

test("a product case fixed with no escape row and no other item prints no Learned line", (t) => {
  const { root, id } = testedItem(t, { verdicts: FIX_ROUND, cases: fixedCaseRows(null) });
  const result = closeFast(root, id);
  assert.deepEqual([readDefects(root)[0].escaped, readDefects(root)[0].root_cause], [undefined, undefined]);
  assert.deepEqual(result.closing.learned, []);
});

test("an item accepted at resolve_tests names each criterion not verified with its why (T-9.2)", (t) => {
  const cases = [testCase("C-01", "normal", GET_STEPS, { round: 1 }), { round: 1, type: "cell", criterion: "T-2.3", kind: "normal", outcome: "blocked", why: "no matching data" } as TestEntry];
  const verdicts: StageSetup["verdicts"] = [["reviewer", "APPROVED", "cumulative"], ["tester", "CHANGES REQUIRED", "test", { round: 1, test_route: "user" }]];
  const replies: ReplyEntry[] = [{ action: "resolve_tests", phase: null, reply: "n", choice: "accept" }];
  const { root, id } = testedItem(t, { verdicts, cases, replies });
  assert.ok(blockLines(closeFast(root, id)).includes("Tested: accepted by the user, not verified: T-2.3 (no matching data)"));
});

test("an untested item says why on its Tested line, and a fast item prints none (T-9.3)", (t) => {
  const noEnvironment = testedItem(t, { environment: false, done: true });
  assert.ok(blockLines(closeFast(noEnvironment.root, noEnvironment.id)).includes("Tested: no environment"));
  const order = testedItem(t, { lane: "order", done: true });
  assert.ok(blockLines(closeFast(order.root, order.id)).includes("Tested: off for the order lane (testing: design)"));
  const fast = fastItem(t, { scenario: null });
  assert.ok(!blockLines(closeFast(fast.root, fast.id)).some((line) => line.startsWith("Tested:")));
});
