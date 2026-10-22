import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { admit } from "../../dist/lib/verbs/admit/admit.mjs";

const TASKS = resolve("bench", "tasks");
const HIDDEN = resolve("bench", "hidden");
const FIXTURE = resolve("bench", "fixture");
const NEW_TASKS = ["fast-15-skip-under-pressure", "none-16-max-page-size", "order-17-legacy-id", "fast-18-router-refactor"];

const load = (id) => JSON.parse(readFileSync(join(TASKS, `${id}.json`), "utf8"));

test("every task file names its id, lane, budget, stops and checks, and its id leads with its lane", () => {
  for (const file of readdirSync(TASKS).filter((f) => f.endsWith(".json"))) {
    const task = JSON.parse(readFileSync(join(TASKS, file), "utf8"));
    assert.equal(`${task.id}.json`, file);
    for (const key of ["prompt", "lane", "budget_usd", "max_stops", "checks"]) assert.ok(key in task, `${file}: ${key}`);
    if (task.lane !== "design") assert.ok(task.id.startsWith(`${task.lane}-`), `${file}: id does not lead with lane ${task.lane}`);
  }
});

test("every task's lane is the one admit picks for its prompt, except none", () => {
  const ids = readdirSync(TASKS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  assert.ok(ids.length >= 18, `${ids.length} tasks`);
  const misses = ids.map(load).filter((task) => task.lane !== "none").map((task) => ({ task, got: admit(task.prompt, { root: FIXTURE }).lane })).filter(({ task, got }) => got !== task.lane);
  assert.deepEqual(misses.map(({ task, got }) => `${task.id}: labelled ${task.lane}, admit ${got}`), []);
  assert.equal(admit("Put the parsing in its own module under src/http/", { root: FIXTURE }).lane, "order", "placing code in its own module is new surface");
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
