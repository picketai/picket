import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { edgeContext } from "../../shared/context.mts";
import { readDriveLog } from "../../shared/drive-log.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitRepo, writeIn } from "#test/git.mts";
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
