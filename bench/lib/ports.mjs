// Port hygiene for bench runs. Every run gets its own PORT so two runs (or a run and a leftover
// server from an earlier one) never fight over 8080, and whatever is still listening on that port
// when the run ends is killed, so no orphan survives into the next run's measurements.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const FIRST = 8100;
const SPAN = 800;
let seq = 0;

/** A port unique to this run within the process, derived from a counter so records stay readable. */
export function nextPort() {
  return FIRST + (seq++ % SPAN);
}

export function listenerPids(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -ano -p tcp", { encoding: "utf8", windowsHide: true });
      return [...new Set(parseNetstatListeners(out).filter((l) => l.port === port).map((l) => l.pid))];
    }
    const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

/** Kill every process still listening on the port; returns the pids it went after. */
export function killListeners(port) {
  const pids = listenerPids(port);
  for (const pid of pids) {
    try {
      if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore", windowsHide: true });
      else process.kill(pid, "SIGKILL");
    } catch {}
  }
  return pids;
}

export const PROCESS_TABLE_SCRIPT =
  "Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{ pid = [int]$_.ProcessId; ppid = [int]$_.ParentProcessId; created = if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null } } } | ConvertTo-Json -AsArray -Compress";

export function defaultExec(command, args) {
  return execFileSync(command, args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
}

function tryExec(exec, command, args) {
  try {
    return exec(command, args) ?? "";
  } catch {
    return "";
  }
}

export function parseNetstatListeners(out) {
  const listeners = [];
  for (const line of String(out).split(/\r?\n/)) {
    const m = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
    if (m && Number(m[2]) > 0) listeners.push({ port: Number(m[1]), pid: Number(m[2]) });
  }
  return listeners;
}

export function parseProcessTable(json) {
  if (!String(json).trim()) return [];
  const parsed = JSON.parse(json);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((p) => ({ pid: Number(p.pid), ppid: Number(p.ppid), created: p.created ?? null }));
}

export function parseJobFile(text) {
  return String(text)
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
    .map((m) => ({ pid: Number(m.pid), created: m.created ?? null }));
}

export function parseLsofListeners(out) {
  const listeners = [];
  let pid = null;
  for (const line of String(out).split(/\r?\n/)) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid) {
      const port = Number(line.slice(line.lastIndexOf(":") + 1));
      if (Number.isInteger(port) && port > 0) listeners.push({ pid, port });
    }
  }
  return listeners;
}

export function parseLsofCwd(out) {
  const cwd = new Map();
  let pid = null;
  for (const line of String(out).split(/\r?\n/)) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid) cwd.set(pid, line.slice(1));
  }
  return cwd;
}

export function parsePsStart(out) {
  const rows = [];
  for (const line of String(out).split(/\r?\n/)) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (m) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), started: Date.parse(m[3]) });
  }
  return rows;
}

function sameInstant(a, b) {
  return a !== null && b !== null && Date.parse(a) === Date.parse(b);
}

function insideFolder(path, folder) {
  const base = folder.replace(/\/+$/, "");
  return path === base || path.startsWith(`${base}/`);
}

function readJobFile(jobFile) {
  return jobFile && existsSync(jobFile) ? parseJobFile(readFileSync(jobFile, "utf8")) : [];
}

function liveDescendants(table, roots, startedAt) {
  const found = new Set(roots);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of table) {
      if (!found.has(p.pid) && found.has(p.ppid) && p.created && Date.parse(p.created) > startedAt) {
        found.add(p.pid);
        grew = true;
      }
    }
  }
  return found;
}

function windowsOrphans({ startedAt, jobFile, port, exec }) {
  const members = readJobFile(jobFile);
  const table = parseProcessTable(tryExec(exec, "pwsh", ["-NoProfile", "-Command", PROCESS_TABLE_SCRIPT]));
  const alive = members.filter((m) => table.some((p) => p.pid === m.pid && sameInstant(p.created, m.created))).map((m) => m.pid);
  const found = liveDescendants(table, alive, startedAt);
  for (const l of parseNetstatListeners(tryExec(exec, "netstat", ["-ano", "-p", "tcp"]))) if (l.port === port) found.add(l.pid);
  return { pids: [...found].sort((a, b) => a - b), tracked: members.length };
}

function startedSinceRun(started, startedAt) {
  return Number.isFinite(started) && Math.floor(started / 1000) >= Math.floor(startedAt / 1000);
}

function posixOrphans({ repo, startedAt, port, exec }) {
  const listeners = parseLsofListeners(tryExec(exec, "lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"]));
  const pids = [...new Set(listeners.map((l) => l.pid))];
  const found = new Set(listeners.filter((l) => l.port === port).map((l) => l.pid));
  let tracked = 0;
  if (pids.length) {
    const cwd = parseLsofCwd(tryExec(exec, "lsof", ["-a", "-p", pids.join(","), "-d", "cwd", "-Fn"]));
    const starts = new Map(parsePsStart(tryExec(exec, "ps", ["-o", "pid=,ppid=,lstart=", "-p", pids.join(",")])).map((r) => [r.pid, r.started]));
    for (const pid of pids) {
      if (cwd.has(pid) && insideFolder(cwd.get(pid), repo) && startedSinceRun(starts.get(pid), startedAt)) {
        found.add(pid);
        tracked++;
      }
    }
  }
  return { pids: [...found].sort((a, b) => a - b), tracked };
}

export function runOrphans({ platform = process.platform, repo, startedAt, jobFile, port, exec = defaultExec }) {
  return platform === "win32" ? windowsOrphans({ startedAt, jobFile, port, exec }) : posixOrphans({ repo, startedAt, port, exec });
}

export function stopProcesses(pids, { platform = process.platform, exec = defaultExec } = {}) {
  const stopped = [];
  for (const pid of pids) {
    try {
      if (platform === "win32") exec("taskkill", ["/PID", String(pid), "/F"]);
      else exec("kill", ["-9", String(pid)]);
      stopped.push(pid);
    } catch {}
  }
  return stopped;
}
