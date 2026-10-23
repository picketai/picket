import { test } from "node:test";
import assert from "node:assert/strict";
import { killTree, runShell, startShell } from "../../dist/lib/util/process.mjs";

const NODE = JSON.stringify(process.execPath);
const OPTIONS = { cwd: process.cwd(), env: process.env, timeoutMs: 10_000 };

test("runShell reports the exit code and the printed text (T-1.5)", () => {
  const r = runShell(`${NODE} -e "console.log('hi'); process.exit(3)"`, OPTIONS);
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /^hi\r?\n$/);
  assert.equal(r.timedOut, false);
  assert.ok(r.ms >= 0);
});

test("runShell joins stderr after stdout and passes the environment", () => {
  const env = { ...process.env, PICKET_PROCESS_TEST: "seen" };
  const r = runShell(`${NODE} -e "console.log(process.env.PICKET_PROCESS_TEST); console.error('err')"`, { ...OPTIONS, env });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /^seen\r?\nerr\r?\n$/);
});

test("startShell starts a long-running command and killTree ends it within 3 s", async () => {
  const child = startShell(`${NODE} -e "setInterval(() => {}, 1000)"`, { cwd: process.cwd(), env: process.env, platform: process.platform });
  const exited = new Promise((resolve) => child.once("exit", () => resolve(true)));
  assert.equal(child.exitCode, null);
  const started = Date.now();
  killTree(child.pid, process.platform);
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 3000).unref());
  assert.equal(await Promise.race([exited, timeout]), true);
  assert.ok(Date.now() - started < 3000);
});

test("runShell marks a command that outlives its timeout as timed out (T-1.5)", () => {
  const r = runShell(`${NODE} -e "setTimeout(() => {}, 10000)"`, { ...OPTIONS, timeoutMs: 200 });
  assert.equal(r.timedOut, true);
  assert.ok(r.ms < 10_000);
});
