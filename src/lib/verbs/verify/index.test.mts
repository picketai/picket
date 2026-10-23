import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { verb, verify } from "./index.mts";
import { stateDir, statePath, STATE_FILES } from "../../shared/paths.mts";
import { phaseOf, readSnapshot } from "../../shared/work/snapshot.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { openItem, withProject } from "#test/project.mts";

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

test("verify on a malformed package.json fails tests as undetected and carries the parse warning", (t) => {
  const { root, id } = setup(t, true);
  writeFileSync(join(root, "package.json"), '{ "scripts": { "test": "node t.js", }');
  const r = verify(root, id, 1, { runTests: true, env: process.env });
  assert.deepEqual(r.results.find((x) => x.name === "tests"), { name: "tests", ok: false, detail: "no test command detected" });
  assert.match(r.warnings?.[0] ?? "", /^package\.json is not valid JSON \(.+\); no npm scripts detected$/);
});

test("verify names the status, command and log of a failed test step", (t) => {
  const { root, id } = setup(t, true);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }));
  const r = verify(root, id, 1, { runTests: true, env: process.env });
  assert.deepEqual(r.results.find((x) => x.name === "tests"), { name: "tests", ok: false, detail: "failed · npm test · log .picket/state/verify-test.log" });
  assert.equal(existsSync(statePath(root, "verify-test.log")), true);
});
