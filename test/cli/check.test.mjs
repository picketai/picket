import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { statePath } from "../../dist/lib/shared/paths.mjs";
import { runCli } from "#test/cli.mts";
import { withProject } from "#test/project.mts";

function run(root, args) {
  const r = runCli(root, [...args, "--root", root]);
  return { code: r.status, out: r.stdout, stderr: r.stderr };
}

function fixture(t, scripts) {
  const root = withProject(t, { host: true, picket: false });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", scripts }));
  return root;
}

test("check runs test then lint, logs each, and says CHECK OK", (t) => {
  const root = fixture(t, { test: "node -e \"console.log('12 passed')\"", lint: "node -e 0" });
  const r = run(root, ["check"]);
  assert.equal(r.code, 0, r.stderr);
  const v = JSON.parse(r.out);
  assert.equal(v.ok, true);
  assert.deepEqual(v.steps.map((s) => [s.name, s.status]), [["test", "passed"], ["lint", "passed"]]);
  assert.match(readFileSync(statePath(root, "check-test.log"), "utf8"), /12 passed/);
  const h = run(root, ["check", "--human"]);
  assert.match(h.out, /^test: passed · npm test/m);
  assert.equal(h.out.trim().split(/\r?\n/).at(-1), "CHECK OK");
});

test("check stops at the first red step and prints only its tail", (t) => {
  const root = fixture(t, { test: "node -e \"console.error('expected 3 to be 4'); process.exit(1)\"", lint: "node -e 0" });
  const r = run(root, ["check", "--human"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /^test: failed/m);
  assert.match(r.out, /expected 3 to be 4/);
  assert.match(r.out, /not run: lint/);
  assert.equal(r.out.trim().split(/\r?\n/).at(-1), "CHECK FAILED");
  assert.equal(existsSync(statePath(root, "check-lint.log")), false);
});

test("check on a malformed package.json detects no test and warns why; a sound one carries no warnings key", (t) => {
  const root = withProject(t, { picket: false });
  writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
  const r = run(root, ["check"]);
  assert.equal(r.code, 0, r.stderr);
  const v = JSON.parse(r.out);
  assert.equal(v.steps[0].status, "none detected");
  assert.match(v.warnings[0], /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
  const human = run(root, ["check", "--human"]).out.trim().split(/\r?\n/);
  assert.match(human.at(-2), /^warning: package\.json is not valid JSON/);
  assert.equal(human.at(-1), "CHECK OK");
  assert.equal(Object.hasOwn(JSON.parse(run(fixture(t, { test: "node -e 0" }), ["check"]).out), "warnings"), false);
});

test("check refuses a destructive --only command before running anything", (t) => {
  const root = fixture(t, { test: "node -e 0" });
  const r = run(root, ["check", "--only", "rm -rf x"]);
  assert.equal(r.code, 2);
  assert.equal(r.out.trim(), JSON.stringify({ ok: false, error: "check refuses to run a destructive command (rm); run it yourself so the permission prompt sees it", command: "rm -rf x" }));
  assert.equal(existsSync(statePath(root, "check-command.log")), false);
});

test("check reports a missing script instead of inventing one, and --only runs a given command", (t) => {
  const root = fixture(t, { test: "node -e 0" });
  const v = JSON.parse(run(root, ["check"]).out);
  assert.equal(v.ok, true);
  assert.equal(v.steps.find((s) => s.name === "lint").status, "none detected");
  const only = JSON.parse(run(root, ["check", "--only", "node -e \"console.log('hi')\""]).out);
  assert.equal(only.steps[0].name, "command");
  assert.equal(only.steps[0].status, "passed");
});
