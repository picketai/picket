import { spawn, execSync } from "node:child_process";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";
import { projectRoot, listWork, deriveState } from "../../shared/work/work.mjs";
import { stateDir, statePath, STATE_FILES } from "../../shared/paths.mjs";
import { detectTooling } from "../../shared/tooling.mjs";
import { assertNotDestructive } from "../../shared/destructive.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.setTimeout(300);
    s.once("connect", () => (s.destroy(), resolve(true)));
    s.once("timeout", () => (s.destroy(), resolve(false)));
    s.once("error", () => resolve(false));
  });
}

/** The newest open work item, so a drive row lands on the phase it verifies. */
export function currentWork(root) {
  for (const id of listWork(root).reverse()) {
    const s = deriveState(id, root);
    if (s.status === "open") return { work_id: id, phase: s.current_phase ?? null };
  }
  return { work_id: null, phase: null };
}

export function parseHit(spec) {
  const m = String(spec).trim().match(/^(?:([A-Z]+)\s+)?(\S+)(?:\s+([\s\S]+))?$/);
  if (!m) throw new Error(`bad --hit "${spec}"; use "GET /path" or "POST /path <json body>"`);
  return { method: m[1] ?? "GET", path: m[2], body: m[3] };
}

async function request(base, hit, timeoutMs) {
  const t = Date.now();
  const url = /^https?:/.test(hit.path) ? hit.path : base + hit.path;
  try {
    const res = await fetch(url, {
      method: hit.method,
      body: hit.body,
      headers: hit.body ? { "content-type": "application/json" } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    return { method: hit.method, path: hit.path, status: res.status, ms: Date.now() - t, body: text.slice(0, 2000) };
  } catch (err) {
    return { method: hit.method, path: hit.path, status: null, ms: Date.now() - t, error: err.cause?.code ?? err.name ?? String(err.message) };
  }
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-child.pid, "SIGKILL");
  } catch {}
}

function gitEntries(command, root) {
  try {
    return execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

const isRenameOrCopy = (entry) => /^[RC]|^.[RC]/.test(entry);

function currentPaths(statusEntries) {
  const paths = [];
  for (let i = 0; i < statusEntries.length; i++) {
    paths.push(statusEntries[i].slice(3));
    if (isRenameOrCopy(statusEntries[i])) i++;
  }
  return paths;
}

/** Tracked files with uncommitted changes, as repo-relative paths; [] outside a repo. */
function modifiedTracked(root) {
  return currentPaths(gitEntries("git status --porcelain -z --untracked-files=no", root));
}

function untrackedUnignored(root) {
  return gitEntries("git ls-files -z --others --exclude-standard", root);
}

function treeSnapshot(root) {
  return { modified: modifiedTracked(root), untracked: untrackedUnignored(root) };
}

function checkout(root, paths) {
  if (!paths.length) return [];
  try {
    execSync(`git checkout -- ${paths.map((p) => `"${p}"`).join(" ")}`, { cwd: root, stdio: "ignore" });
    return paths;
  } catch {
    return [];
  }
}

function removeFiles(root, paths) {
  return paths.filter((p) => {
    try {
      rmSync(join(root, p), { force: true });
      return true;
    } catch {
      return false;
    }
  });
}

function restoreSideEffects(root, before, keep) {
  const after = treeSnapshot(root);
  const dirtied = after.modified.filter((p) => !before.modified.includes(p));
  const created = after.untracked.filter((p) => !before.untracked.includes(p));
  if (keep) return { dirtied, created, restored: [], removed: [] };
  return { dirtied, created, restored: checkout(root, dirtied), removed: removeFiles(root, created) };
}

function logRow(root, row) {
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify(row) + "\n");
}

/**
 * @param {object} o
 * @param {string} [o.run]       a command to run and capture (CLI drive); wins over start/hits
 * @param {string} [o.start]     server start command; default: the detected run command
 * @param {string[]} [o.hits]    "METHOD /path [json]" specs, in order
 * @param {number|string} [o.port]  default: $PORT, else a free port; exported to the server as PORT
 * @param {string} [o.wait]      path polled until the server answers; default: the first hit's path
 * @param {number} [o.timeoutMs] boot and per-request timeout, default 20000
 * @param {boolean} [o.keepChanges] leave files the drive changed in place instead of restoring them
 * @param {string} [o.id]        work item the evidence belongs to; default: the newest open one
 * @param {number} [o.phase]
 * @param {string} [o.root]
 */
export async function drive(o = {}) {
  const root = o.root ?? projectRoot();
  const work = o.id ? { work_id: o.id, phase: null } : currentWork(root);
  if (o.phase != null) work.phase = Number(o.phase);
  const timeoutMs = Number(o.timeoutMs ?? 20_000);
  const row = { ts: new Date().toISOString(), kind: "drive", source: "picket drive", work_id: work.work_id, phase: work.phase, env: Object.keys(o.env ?? {}) };

  const before = treeSnapshot(root);
  if (o.run) assertNotDestructive(o.run, "picket drive --run");
  if (o.start) assertNotDestructive(o.start, "picket drive --start");

  if (o.run) {
    const t = Date.now();
    let output = "";
    let code = 0;
    try {
      output = execSync(o.run, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, env: { ...process.env, ...(o.env ?? {}) } });
    } catch (err) {
      code = err.status ?? 1;
      output = `${err.stdout ?? ""}${err.stderr ?? ""}` || err.message;
    }
    const side = restoreSideEffects(root, before, o.keepChanges);
    const r = { ok: code === 0, mode: "run", command: o.run, exit_code: code, ms: Date.now() - t, output: String(output).slice(-4000), ...side };
    logRow(root, { ...row, command: `picket drive --run ${o.run}`.slice(0, 200), ok: r.ok, exit_code: code });
    return r;
  }

  const hits = (o.hits ?? []).map(parseHit);
  if (!hits.length) throw new Error('drive needs at least one --hit "GET /path", or --run "<command>" for a CLI');
  const start = o.start ?? detectTooling(root).run;
  if (!start) throw new Error('no start command detected: pass --start "<command>"');
  const port = Number(o.port ?? process.env.PORT ?? (await freePort()));
  const wait = o.wait ?? hits[0].path;
  const base = `http://127.0.0.1:${port}`;

  const child = spawn(start, {
    cwd: root,
    shell: true,
    detached: process.platform !== "win32",
    env: { ...process.env, PORT: String(port), ...(o.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let serverLog = "";
  const capture = (d) => (serverLog = (serverLog + d.toString()).slice(-4000));
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  let exited = null;
  child.on("exit", (c) => (exited = c ?? -1));

  const t0 = Date.now();
  let up = false;
  while (Date.now() - t0 < timeoutMs && exited === null) {
    const probe = await request(base, { method: "GET", path: wait }, 1000);
    if (probe.status !== null) {
      up = true;
      break;
    }
    await sleep(250);
  }
  const result = { ok: up, mode: "server", start, port, wait, wait_ms: Date.now() - t0, hits: [], server_exit: exited, stopped: false, server_log_tail: "" };
  if (up) for (const h of hits) result.hits.push(await request(base, h, timeoutMs));
  result.ok = up && result.hits.every((h) => h.status !== null);

  killTree(child);
  const tKill = Date.now();
  while (Date.now() - tKill < 3000 && (await portOpen(port))) await sleep(100);
  result.stopped = !(await portOpen(port));
  result.server_log_tail = serverLog.slice(-1500);
  Object.assign(result, restoreSideEffects(root, before, o.keepChanges));
  logRow(root, {
    ...row,
    command: `picket drive --start "${start}" ${hits.map((h) => `--hit "${h.method} ${h.path}"`).join(" ")}`.slice(0, 200),
    port,
    ok: result.ok,
    hits: result.hits.map((h) => ({ method: h.method, path: h.path, status: h.status, ms: h.ms })),
  });
  return result;
}

/** One-screen human rendering; the last line is DRIVE OK or DRIVE FAILED. */
export function renderDrive(v) {
  const one = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  const side = () => [
    ...(v.restored?.length ? [`restored ${v.restored.join(", ")} (changed by the drive, not by you)`] : v.dirtied?.length ? [`left dirty: ${v.dirtied.join(", ")}`] : []),
    ...(v.removed?.length ? [`removed ${v.removed.join(", ")} (created by the drive, not by you)`] : v.created?.length ? [`left in place: ${v.created.join(", ")}`] : []),
  ];
  if (v.mode === "run") {
    const tail = v.output.trim().split(/\r?\n/).slice(-15).join("\n");
    return [`${v.command} → exit ${v.exit_code} (${v.ms} ms)`, tail, ...side(), v.ok ? "DRIVE OK" : "DRIVE FAILED"].join("\n");
  }
  const lines = [];
  if (v.hits.length || v.ok) lines.push(`${v.start} on :${v.port} · up in ${v.wait_ms} ms`);
  else lines.push(`${v.start} on :${v.port} · no answer on ${v.wait} within ${v.wait_ms} ms${v.server_exit !== null ? ` (exited ${v.server_exit})` : ""}`);
  for (const h of v.hits) lines.push(`${h.method} ${h.path} → ${h.status ?? h.error} (${h.ms} ms) ${one(h.body)}`);
  if (!v.ok && v.server_log_tail) lines.push("--- server log", v.server_log_tail.trim());
  lines.push(v.stopped ? "server stopped" : `server still listening on :${v.port}`, ...side());
  lines.push(v.ok ? "DRIVE OK" : "DRIVE FAILED");
  return lines.join("\n");
}
