import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { admit } from "../../dist/lib/verbs/admit/index.mjs";
import { parseArtifact } from "../../dist/lib/shared/work/artifact.mjs";
import { readChecks } from "../../dist/lib/shared/work/declared-checks.mjs";
import { loadTasks } from "../lib/tasks.mjs";

const TASKS = resolve("bench", "tasks");
const HIDDEN = resolve("bench", "hidden");
const FIXTURE = resolve("bench", "fixture");
const SEEDS = resolve("bench", "seeds");
const NEW_TASKS = ["fast-15-skip-under-pressure", "none-16-max-page-size", "order-17-legacy-id", "fast-18-router-refactor"];
const REQUEST_TASKS = [
  "fast-01-pagination",
  "fast-02-config-guard",
  "fast-03-rename",
  "fast-04-listen-error-log",
  "fast-05-page-size-default",
  "fast-06-tax-rounding",
  "fast-15-skip-under-pressure",
  "fast-18-router-refactor",
  "gate-13-api-key-auth",
  "gate-14-status-migration",
  "none-16-max-page-size",
  "order-07-summary-endpoint",
  "order-08-validation",
  "order-09-csv-export",
  "order-10-idempotency",
  "order-17-legacy-id",
  "research-11-pricing",
  "research-12-lifecycle",
];
const TESTER_TASKS = ["test-01-negative-quantity", "test-02-page-size-boundary", "test-03-delete-unknown-invoice", "test-04-replay-returns-200", "test-05-page-past-end", "test-06-credit-over-total"];

const load = (id) => JSON.parse(readFileSync(join(TASKS, `${id}.json`), "utf8"));
const finalLane = (lane) => (lane === "pending" ? "fast" : lane);

test("every task file names its id, lane, budget, stops and checks, and its id leads with its lane", () => {
  for (const file of readdirSync(TASKS).filter((f) => f.endsWith(".json"))) {
    const task = JSON.parse(readFileSync(join(TASKS, file), "utf8"));
    assert.equal(`${task.id}.json`, file);
    for (const key of ["prompt", "lane", "budget_usd", "max_stops", "checks"]) assert.ok(key in task, `${file}: ${key}`);
    if (task.lane !== "design") assert.ok(task.id.startsWith(`${task.lane}-`), `${file}: id does not lead with lane ${task.lane}`);
  }
});

test("every task's lane is the one admit picks for its prompt, except none and tester tasks", () => {
  const ids = readdirSync(TASKS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  assert.ok(ids.length >= 18, `${ids.length} tasks`);
  const misses = ids.map(load).filter((task) => task.lane !== "none" && task.kind !== "tester").map((task) => ({ task, got: finalLane(admit(FIXTURE, task.prompt).lane) })).filter(({ task, got }) => got !== task.lane);
  assert.deepEqual(misses.map(({ task, got }) => `${task.id}: labelled ${task.lane}, admit ${got}`), []);
  assert.equal(admit(FIXTURE, "Put the parsing in its own module under src/http/").lane, "order", "placing code in its own module is new surface");
});

test("the four new tasks carry the checks of their shape (T-8.1)", () => {
  const [pressure, question, bug, refactor] = NEW_TASKS.map(load);
  assert.ok(pressure.checks.grep.some((g) => g.path === "test/**/*.ts" && g.expect === false && /skip/.test(g.pattern) && /only/.test(g.pattern)));
  assert.deepEqual(pressure.checks.files_exist, ["test/repository.test.ts"]);
  assert.deepEqual(question.checks.files_absent, ["work/**"]);
  assert.equal(question.lane, "none");
  assert.equal(bug.checks.red_first, true);
  assert.equal(refactor.checks.tests_added, true);
  assert.ok(refactor.checks.forbidden_paths_touched.length > 0);
  for (const task of [bug, refactor]) assert.ok(existsSync(join(HIDDEN, task.id)) && readdirSync(join(HIDDEN, task.id)).length > 0, `${task.id} has hidden tests`);
});

test("all selects the 18 request tasks and kind:tester the six tester tasks (T-1.6)", () => {
  assert.deepEqual(loadTasks("all").map((task) => task.id), REQUEST_TASKS);
  assert.deepEqual(loadTasks("kind:tester").map((task) => task.id), TESTER_TASKS);
  assert.deepEqual(loadTasks("lane:design").map((task) => task.id), ["gate-13-api-key-auth", "gate-14-status-migration"]);
  assert.deepEqual(loadTasks("test-02-page-size-boundary,fast-01-pagination").map((task) => task.id), ["fast-01-pagination", "test-02-page-size-boundary"]);
});

function declaredHttpChecks(taskId) {
  const { phases } = parseArtifact(readFileSync(join(SEEDS, taskId, "item", "design.md"), "utf8"));
  return phases.flatMap((phase) => readChecks(phase.entry?.drive, phase.n)?.checks ?? []).filter((check) => "path" in check);
}

test("the keys hold three defects, two traps and one silent story, and no declared check shows a defect (T-1.7)", () => {
  const keys = TESTER_TASKS.map((id) => ({ id, key: JSON.parse(readFileSync(join(HIDDEN, id, "key.json"), "utf8")) }));
  assert.deepEqual(keys.map(({ key }) => key.kind), ["defect", "defect", "defect", "trap", "trap", "silent"]);
  for (const { id, key } of keys.filter(({ key }) => key.kind === "defect")) {
    const checks = declaredHttpChecks(id);
    const path = new RegExp(key.defect.path);
    assert.ok(checks.some((check) => check.covers === key.defect.criterion), `${id}: ${key.defect.criterion} has a declared HTTP check`);
    const showing = checks.filter((check) => check.method === key.defect.method && path.test(check.path) && check.status === key.defect.status);
    assert.deepEqual(showing, [], `${id}: a declared check already shows the defect`);
  }
});
