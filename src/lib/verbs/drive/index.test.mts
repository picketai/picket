import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { edgeContext } from "../../shared/context.mts";
import { readDriveLog, type DriveRow } from "../../shared/drive-log.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitRepo, writeIn } from "#test/git.mts";
import { openItem, writeArtifact } from "#test/project.mts";
import { driveApp, verb, type DriveReport } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("drive reads its flags with today's value types and refuses a bad timeout, env or bare --run (T-6.4)", () => {
  const input = parse(["--run", "node -e 0", "--env", "A=1", "--hit", "GET /a", "--hit", "GET /b", "--timeout", "30", "--keep-changes", "--work", ID, "--phase", "2"]);
  assert.deepEqual(input, { env: { A: "1" }, run: "node -e 0", start: undefined, hits: [{ method: "GET", path: "/a", body: undefined }, { method: "GET", path: "/b", body: undefined }], port: undefined, wait: undefined, timeoutMs: 30000, keepChanges: true, work: ID, phase: "2" });
  assert.throws(() => parse(["--run", "x", "--timeout", "abc"]), UsageError);
  assert.throws(() => parse(["--run", "x", "--env", "1A=2"]), (err) => err instanceof UsageError && err.message.includes("--env"));
  assert.throws(() => parse(["--run"]), UsageError);
  assert.throws(() => parse(["--hit", " "]), (err) => err instanceof UsageError && err.message.includes("bad --hit"));
});

const HELLO = `node -e "console.log('hello')"`;

function runCheckRecord(drive: string): string {
  return `---\nlane: design\nphases:\n  - n: 1\n    files: [a.txt]\n${drive}    security: false\n---\n# D\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n`;
}

const HELLO_CHECK = `    drive:\n      - covers: T-1.1\n        command: ${HELLO}\n        exit_code: 0\n        contains: [hello]\n`;

async function driveInItem(t: TestContext, drive: string, run: string): Promise<DriveRow> {
  const root = gitRepo(t, { host: true, picket: true });
  const { id } = openItem(root, { lane: "design", title: "Checks" });
  writeArtifact(root, id, "design.md", runCheckRecord(drive));
  const outcome = await driveApp({ ...parse(["--run", run]), work: id, phase: "1" }, { ...edgeContext(root), cwd: root });
  assert.equal(outcome.status, "done", JSON.stringify(outcome));
  const [row] = readDriveLog(root).rows;
  return row;
}

test("a run row in a phase declaring a run check logs the exact command and the contains map (T-2.2)", async (t) => {
  const row = await driveInItem(t, HELLO_CHECK, HELLO);
  assert.equal(row.run, HELLO);
  assert.deepEqual(row.contains, { hello: true });
});

test("a run row logs the whole command in run while command keeps its 200-character cut (T-2.3)", async (t) => {
  const prefix = `node -e "console.log('hello', '`;
  const suffix = `'.length)"`;
  const long = `${prefix}${"x".repeat(250 - prefix.length - suffix.length)}${suffix}`;
  const row = await driveInItem(t, HELLO_CHECK, long);
  assert.equal(long.length, 250);
  assert.equal(row.run, long);
  assert.equal(row.command.length, 200);
  assert.deepEqual(row.contains, { hello: true });
});

test("a run row under drive: true carries today's keys plus run and no contains (T-2.4)", async (t) => {
  const row = await driveInItem(t, "    drive: true\n", HELLO);
  assert.deepEqual(Object.keys(row).sort(), ["command", "env", "exit_code", "kind", "ok", "phase", "run", "source", "ts", "work_id"]);
});

test("drive --run from a nested checkout runs there, logs at the root and reports its files root-relative", async (t) => {
  const root = gitRepo(t, { host: true, files: { "README.md": "shop\n" } });
  const app = join(root, "app");
  mkdirSync(app);
  gitIn(app, "init", "-q", "-b", "main");
  writeIn(app, "make.mjs", "import { writeFileSync } from 'node:fs';\nwriteFileSync('made.txt', process.cwd());\n");
  gitIn(app, "add", "-A");
  gitIn(app, "commit", "-q", "-m", "app");
  const input = { ...parse(["--run", "node make.mjs"]), work: ID, phase: "7" };
  const outcome = await driveApp(input, { ...edgeContext(root), cwd: app });
  const report = (outcome as { value: DriveReport }).value;
  assert.equal(outcome.status, "done", JSON.stringify(outcome));
  assert.deepEqual(report.removed, ["app/made.txt"]);
  assert.equal(existsSync(join(app, "made.txt")), false);
  assert.deepEqual(readDriveLog(root).rows.map((row) => [row.command, row.work_id, row.phase]), [["picket drive --run node make.mjs", ID, 7]]);
});
