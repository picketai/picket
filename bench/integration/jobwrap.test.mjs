import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { defaultExec, parseJobFile, parseNetstatListeners, runOrphans, stopProcesses } from "../lib/ports.mjs";
import { launchCommand } from "../lib/claude.mjs";

const SERVER = 'require("http").createServer((q, s) => s.end("ok")).listen(0, "127.0.0.1", function () { require("fs").writeFileSync(process.argv[2], String(this.address().port)); });\n';

function waitFor(predicate, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (predicate()) return true;
    spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 100)"]);
  }
  return predicate();
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listenersOn(port) {
  return parseNetstatListeners(defaultExec("netstat", ["-ano", "-p", "tcp"])).filter((l) => l.port === port).map((l) => l.pid);
}

function wrapped(dir, jobFile, command, input) {
  const launch = launchCommand(command.slice(1), { platform: "win32", jobFile, claude: command[0] });
  return spawnSync(launch.command, launch.args, { cwd: dir, input, encoding: "utf8" });
}

test("the job wrapper passes stdin and the exit code through, records a backgrounded server, and the sweep stops only the run's processes", { skip: process.platform !== "win32" && "the job wrapper runs on Windows only" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "bench-jobwrap-"));
  const jobFile = join(dir, "job.jsonl");
  let outsidePid = null;
  try {
    writeFileSync(join(dir, "server.js"), SERVER);
    const outside = spawn(process.execPath, ["server.js", "outside.txt"], { cwd: dir, detached: true, stdio: "ignore" });
    outside.unref();
    outsidePid = outside.pid;
    const startedAt = Date.now();
    const prompt = "hello prompt\nline two\n";
    const run = wrapped(dir, jobFile, ["bash", "-lc", "(node server.js inside.txt > /dev/null 2>&1 &); cat > stdin.txt"], prompt);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(readFileSync(join(dir, "stdin.txt"), "utf8"), prompt);
    assert.ok(waitFor(() => existsSync(join(dir, "inside.txt")) && existsSync(join(dir, "outside.txt"))), "both servers wrote their port");
    const insidePort = Number(readFileSync(join(dir, "inside.txt"), "utf8"));
    const outsidePort = Number(readFileSync(join(dir, "outside.txt"), "utf8"));
    const insidePids = listenersOn(insidePort);
    assert.ok(insidePids.length, "the run's server listens");
    const members = parseJobFile(readFileSync(jobFile, "utf8")).map((m) => m.pid);
    for (const pid of insidePids) assert.ok(members.includes(pid), `job file lists the listener ${pid}`);

    const { pids, tracked } = runOrphans({ platform: "win32", repo: dir, startedAt, jobFile, port: 1 });
    const stopped = stopProcesses(pids, { platform: "win32" });
    assert.ok(tracked >= 1);
    assert.ok(stopped.length >= 1);
    assert.ok(stopped.every((pid) => pids.includes(pid)), "orphans counts only processes this sweep stopped");
    assert.ok(waitFor(() => pids.every((pid) => !alive(pid))), "every process the sweep picked is gone, stopped by it or exited with its child");
    assert.ok(waitFor(() => listenersOn(insidePort).length === 0), "the run's server is gone");
    assert.ok(listenersOn(outsidePort).length > 0, "the server started outside the wrapper still listens");
    assert.equal(pids.includes(outsidePid), false);

    assert.equal(wrapped(dir, join(dir, "job2.jsonl"), ["bash", "-lc", "exit 3"], "").status, 3);
  } finally {
    if (outsidePid) {
      stopProcesses([outsidePid], { platform: "win32" });
      waitFor(() => !alive(outsidePid));
    }
    rmSync(dir, { recursive: true, force: true, maxRetries: 50, retryDelay: 100 });
  }
});
