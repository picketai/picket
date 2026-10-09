import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { defaultExec, parseJobFile, parseLsofCwd, parseLsofListeners, parseNetstatListeners, parsePsStart, parseProcessTable, runOrphans, stopProcesses } from "../lib/ports.mjs";
import { JOB_WRAPPER, launchCommand } from "../lib/claude.mjs";

const STARTED_AT = Date.parse("2026-10-09T10:00:00.000Z");
const A = "2026-10-09T10:01:00.1234567Z";
const B = "2026-10-09T10:01:05.0000000Z";
const BEFORE = "2026-10-09T09:00:00.0000000Z";
const AFTER = "2026-10-09T10:02:00.0000000Z";

const NETSTAT = [
  "Active Connections",
  "",
  "  Proto  Local Address          Foreign Address        State           PID",
  "  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       5000",
  "  TCP    [::]:53860             [::]:0                 LISTENING       39184",
  "  TCP    127.0.0.1:53861        127.0.0.1:53860        ESTABLISHED     777",
].join("\r\n");

function jobFile(members) {
  const dir = mkdtempSync(join(tmpdir(), "bench-job-"));
  const file = join(dir, "job.jsonl");
  writeFileSync(file, members.map((m) => JSON.stringify(m)).join("\n") + "\n");
  return { dir, file };
}

function windowsExec(table) {
  const calls = [];
  const exec = (command, args) => {
    calls.push([command, ...args]);
    if (command === "pwsh") return JSON.stringify(table);
    if (command === "netstat") return NETSTAT;
    throw new Error(`unexpected ${command}`);
  };
  return { exec, calls };
}

function windowsCase(table) {
  const job = jobFile([{ pid: 39184, created: A }, { pid: 31924, created: B }]);
  try {
    return runOrphans({ platform: "win32", repo: "C:/runs/r1/repo", startedAt: STARTED_AT, jobFile: job.file, port: 8123, exec: windowsExec(table).exec });
  } finally {
    rmSync(job.dir, { recursive: true, force: true });
  }
}

const TABLE = [
  { pid: 39184, ppid: 31924, created: A },
  { pid: 31924, ppid: 1, created: B },
  { pid: 5000, ppid: 1, created: BEFORE },
];

test("parsers read netstat listeners, the pwsh process table, lsof and ps output", () => {
  assert.deepEqual(parseNetstatListeners(NETSTAT), [{ port: 3000, pid: 5000 }, { port: 53860, pid: 39184 }]);
  assert.deepEqual(parseProcessTable(JSON.stringify({ pid: 7, ppid: 1, created: A })), [{ pid: 7, ppid: 1, created: A }]);
  assert.deepEqual(parseLsofListeners("p100\nf12\nn*:8123\np200\nf3\nn127.0.0.1:3000\n"), [{ pid: 100, port: 8123 }, { pid: 200, port: 3000 }]);
  assert.deepEqual([...parseLsofCwd("p100\nfcwd\nn/runs/r1/repo\np200\nfcwd\nn/home/u\n")], [[100, "/runs/r1/repo"], [200, "/home/u"]]);
  assert.equal(parsePsStart("  100     1 Thu Oct  9 10:05:00 2026\n")[0].pid, 100);
});

test("win32: every live job member is returned, listening or not; a user's own listener is not", () => {
  const r = windowsCase(TABLE);
  assert.deepEqual(r.pids, [31924, 39184]);
  assert.equal(r.tracked, 2);
});

test("win32: a member whose pid now has another creation time was reused and is left alone", () => {
  const r = windowsCase([{ pid: 39184, ppid: 1, created: AFTER }, { pid: 31924, ppid: 1, created: B }, { pid: 5000, ppid: 1, created: BEFORE }]);
  assert.deepEqual(r.pids, [31924]);
});

test("win32: a live member's child created after the run started is returned, listening or not; an older child is not", () => {
  const r = windowsCase([...TABLE, { pid: 600, ppid: 31924, created: AFTER }, { pid: 601, ppid: 600, created: AFTER }, { pid: 700, ppid: 39184, created: BEFORE }]);
  assert.deepEqual(r.pids, [600, 601, 31924, 39184]);
});

test("win32: whatever listens on the run's port is added to the members", () => {
  const job = jobFile([]);
  try {
    const r = runOrphans({ platform: "win32", startedAt: STARTED_AT, jobFile: job.file, port: 3000, exec: windowsExec(TABLE).exec });
    assert.deepEqual(r.pids, [5000]);
    assert.equal(r.tracked, 0);
  } finally {
    rmSync(job.dir, { recursive: true, force: true });
  }
});

test("posix: a listener in the repo started after the run is returned; a prefix-only folder and an older one are not", () => {
  const exec = (command, args) => {
    if (command === "lsof" && args.includes("-iTCP")) return "p100\nn*:4000\np200\nn*:4001\np300\nn*:4002\n";
    if (command === "lsof") return "p100\nfcwd\nn/runs/r1/repo/sub\np200\nfcwd\nn/runs/r1/repo-other\np300\nfcwd\nn/runs/r1/repo\n";
    if (command === "ps") return ["  100 1 Thu Oct  9 10:05:00 2026", "  200 1 Thu Oct  9 10:05:00 2026", "  300 1 Thu Oct  9 09:00:00 2026"].join("\n");
    throw new Error(`unexpected ${command}`);
  };
  const startedAt = Date.parse("Thu Oct  9 10:00:00 2026");
  const r = runOrphans({ platform: "linux", repo: "/runs/r1/repo/", startedAt, port: 9999, exec });
  assert.deepEqual(r.pids, [100]);
  assert.equal(r.tracked, 1);
});

test("stopProcesses stops each pid on its own, without /T on win32, and returns only the ones it stopped", () => {
  const calls = [];
  const exec = (command, args) => {
    calls.push([command, ...args].join(" "));
    if (args.includes("2")) throw new Error("not found");
    return "";
  };
  assert.deepEqual(stopProcesses([1, 2], { platform: "win32", exec }), [1]);
  assert.deepEqual(calls, ["taskkill /PID 1 /F", "taskkill /PID 2 /F"]);
  const posix = [];
  stopProcesses([3], { platform: "linux", exec: (c, a) => posix.push([c, ...a].join(" ")) });
  assert.deepEqual(posix, ["kill -9 3"]);
});

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

test("launchCommand runs claude through the job wrapper on win32 only, and never on a dry path without a job file", () => {
  assert.deepEqual(launchCommand(["-p"], { platform: "win32", jobFile: "j.jsonl", claude: "claude.exe" }), { command: "pwsh", args: ["-NoProfile", "-File", JOB_WRAPPER, "-JobFile", "j.jsonl", "--", "claude.exe", "-p"], shell: false });
  assert.deepEqual(launchCommand(["-p"], { platform: "linux", jobFile: "j.jsonl", claude: "claude" }), { command: "claude", args: ["-p"], shell: false });
  assert.equal(launchCommand(["-p"], { platform: "win32", claude: "claude.exe" }).command, "claude.exe");
});

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
