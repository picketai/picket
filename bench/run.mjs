#!/usr/bin/env node
// Golden-suite runner. One fresh fixture repo per run, the harness installed into it, a scripted
// eager-approver user, HARD grading, and one JSON record per run appended to the results file.
//
//   node bench/run.mjs --harness trunk --tasks all --runs 5 --out bench/results/trunk.json
//
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { buildTemplate, materializeRun } from "./lib/fixture.mjs";
import { runClaude } from "./lib/claude.mjs";
import { grade, changedFiles, linesAdded } from "./lib/grade.mjs";
import { addUsage, cacheHitRatio, totalTokens, round } from "./lib/metrics.mjs";
import { defaultExec, nextPort, parseNetstatListeners, runOrphans, stopProcesses } from "./lib/ports.mjs";
import { trustWorkspace, untrustWorkspace } from "./lib/trust.mjs";

const BENCH = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(BENCH, "..");
const HARNESSES = ["plugin", "trunk"];
/** Errors that mean the account, not the harness, ran out: session, usage and rate limits. */
const QUOTA = /session limit|usage limit|rate limit|quota|overloaded/i;

function parseArgs(argv) {
  const o = { harness: "trunk", tasks: "all", runs: 1, out: null, keep: false, dry: false, harnessRoot: null, budget: null, label: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--harness") o.harness = next();
    else if (a === "--harness-root") o.harnessRoot = next();
    else if (a === "--tasks") o.tasks = next();
    else if (a === "--runs") o.runs = Number(next());
    else if (a === "--out") o.out = next();
    else if (a === "--budget-usd") o.budget = Number(next());
    else if (a === "--label") o.label = next();
    else if (a === "--keep") o.keep = true;
    else if (a === "--dry") o.dry = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

function loadTasks(filter) {
  const dir = join(BENCH, "tasks");
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (filter === "all") return all;
  const wanted = filter.split(",").map((s) => s.trim());
  return all.filter((t) => wanted.some((w) => (w.startsWith("lane:") ? t.lane === w.slice(5) : t.id === w)));
}

function listeningPorts(pids) {
  if (process.platform !== "win32" || !pids.length) return new Map();
  let out = "";
  try {
    out = defaultExec("netstat", ["-ano", "-p", "tcp"]);
  } catch {}
  const ports = new Map();
  for (const { pid, port } of parseNetstatListeners(out)) if (pids.includes(pid)) ports.set(pid, [...(ports.get(pid) ?? []), port]);
  return ports;
}

function defaultHarnessRoot(name) {
  if (name === "plugin") return ROOT;
  // trunk lives in the main checkout; this file runs from <main>/.worktrees/rework/bench
  const main = resolve(ROOT, "..", "..");
  if (existsSync(join(main, ".claude", "agents", "developer.md"))) return main;
  throw new Error("cannot locate the trunk harness; pass --harness-root");
}

/** Second commit: the harness files, so `git diff HEAD` after the run shows only what the agent changed. */
function commitHarnessInstall(repo) {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "bench",
    GIT_AUTHOR_EMAIL: "bench@example.invalid",
    GIT_COMMITTER_NAME: "bench",
    GIT_COMMITTER_EMAIL: "bench@example.invalid",
    GIT_AUTHOR_DATE: "2026-01-01T00:00:01Z",
    GIT_COMMITTER_DATE: "2026-01-01T00:00:01Z",
  };
  execSync("git add -A", { cwd: repo, env, stdio: "ignore" });
  execSync('git commit -q --allow-empty -m "bench: install harness"', { cwd: repo, env, stdio: "ignore" });
  return execSync("git rev-parse HEAD", { cwd: repo, encoding: "utf8" }).trim();
}

function manifest(adapter, harnessRoot, fixtureHash, args) {
  const sh = (cmd, cwd = ROOT) => {
    try {
      return execSync(cmd, { cwd, encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  };
  let effort = null;
  try {
    effort = JSON.parse(readFileSync(join(process.env.USERPROFILE ?? process.env.HOME, ".claude", "settings.json"), "utf8")).effortLevel ?? null;
  } catch {}
  return {
    harness: adapter.name,
    harness_root: harnessRoot,
    harness_commit: sh("git rev-parse --short HEAD", harnessRoot),
    harness_dirty: sh("git status --porcelain --untracked-files=no -- .claude .picket src CLAUDE.md", harnessRoot) ? true : false,
    fixture_hash: fixtureHash,
    claude_version: sh("claude --version"),
    node_version: process.version,
    effort_level: effort,
    permission_mode: "acceptEdits",
    allowed_tools: adapter.allowedTools,
    runs_per_task: args.runs,
    started: new Date().toISOString(),
  };
}

async function runOnce({ task, run, adapter, harnessRoot, template, args, log }) {
  const runId = `${task.id}-r${run}-${Date.now().toString(36)}`;
  const runDir = join(BENCH, ".runs", runId);
  const { repo, sha } = materializeRun({ template, runDir });
  adapter.install(repo, harnessRoot);
  const base = commitHarnessInstall(repo);
  const eventsPath = join(runDir, "events.jsonl");
  const promptLog = join(runDir, "prompts.jsonl");
  const mcpConfigPath = join(runDir, "mcp.json");
  const jobFile = join(runDir, "job.jsonl");
  writeFileSync(
    mcpConfigPath,
    JSON.stringify({ mcpServers: { bench: { command: "node", args: [join(BENCH, "lib", "approver-mcp.mjs")], env: { BENCH_PROMPT_LOG: promptLog } } } }),
  );
  const approver = { configPath: mcpConfigPath, log: promptLog };
  const t0 = Date.now();
  const record = {
    task: task.id,
    lane_expected: task.lane,
    harness: adapter.name,
    run,
    fixture_sha: sha,
    started: new Date(t0).toISOString(),
    session_ids: [],
    stops: 0,
    gates: [],
    denials: 0,
    turns: 0,
    cost_usd: 0,
    usage: {},
    api_ms: 0,
    wall_ms: 0,
    tool_calls: 0,
    tool_counts: {},
    reads: 0,
    unique_reads: 0,
    rereads: 0,
    subagents: 0,
    first_write_ms: null,
    first_tool_ms: null,
    first_reviewable_ms: null,
    model: null,
    terminal: null,
    texts: [],
    error: null,
  };

  let prompt = task.prompt;
  let resume = null;
  const maxStops = task.max_stops ?? 8;
  const port = nextPort();
  record.port = port;
  // Untrusted workspaces get their permissions.allow ignored; the harness under test must have its own rules apply.
  record.trusted = trustWorkspace(repo);
  const timeoutMs = task.timeout_ms ?? 25 * 60_000;
  for (let step = 0; step <= maxStops; step++) {
    const r = await runClaude({
      cwd: repo,
      prompt,
      resume,
      env: { PORT: String(port) },
      permissionMode: "acceptEdits",
      allowedTools: adapter.allowedTools,
      maxBudgetUsd: args.budget ?? task.budget_usd ?? 10,
      maxTurns: task.max_turns ?? 150,
      pluginDir: adapter.pluginDir?.(harnessRoot),
      model: adapter.model,
      timeoutMs,
      eventsPath,
      approver,
      t0,
      jobFile,
    });
    const res = r.result;
    record.rate_limits = (record.rate_limits ?? 0) + (r.summary.rateLimits ?? 0);
    if (!res) {
      record.error = `no result event (exit ${r.exitCode}, signal ${r.signal ?? "none"}, ${r.summary.events} events): ${r.stderr.slice(-500)}`;
      // A run that took several times its own timeout to be killed was frozen with the host
      // (laptop asleep): the clock jumped, the timer fired on wake. Not a measurement of anything.
      record.terminal = r.wallMs > 2 * timeoutMs ? "suspended" : "error";
      break;
    }
    record.session_ids.push(res.session_id);
    record.turns += res.num_turns ?? 0;
    record.cost_usd += res.total_cost_usd ?? 0;
    record.usage = addUsage(record.usage, res.usage);
    record.api_ms += res.duration_api_ms ?? 0;
    record.denials += res.permission_denials?.length ?? 0;
    record.tool_calls += r.summary.toolCalls;
    for (const [k, v] of Object.entries(r.summary.toolCounts)) record.tool_counts[k] = (record.tool_counts[k] ?? 0) + v;
    record.reads += r.summary.reads;
    record.unique_reads += r.summary.uniqueReads;
    record.rereads += r.summary.rereads;
    record.subagents += r.summary.subagents;
    record.model ??= r.summary.model;
    if (record.first_tool_ms === null && r.summary.firstToolUseMs !== null) record.first_tool_ms = r.summary.firstToolUseMs;
    if (record.first_write_ms === null && r.summary.firstWriteMs !== null) record.first_write_ms = r.summary.firstWriteMs;
    const text = typeof res.result === "string" ? res.result : JSON.stringify(res.result ?? "");
    record.texts.push(text);
    const endMs = Date.now() - t0;
    if (record.first_reviewable_ms === null) record.first_reviewable_ms = Math.min(record.first_write_ms ?? endMs, endMs);

    if (res.is_error) {
      record.error = text.slice(0, 500);
      record.terminal = res.terminal_reason === "budget_exceeded" ? "budget" : "error";
      break;
    }
    const g = adapter.gate(text, task);
    if (!g.isGate) {
      record.terminal = g.kind ?? "completed";
      break;
    }
    record.gates.push(g.kind);
    record.stops++;
    if (step === maxStops) {
      record.terminal = "gate_limit";
      break;
    }
    prompt = g.reply;
    resume = res.session_id;
    log(`    gate ${record.stops} (${g.kind}) → "${g.reply}"`);
  }
  record.wall_ms = Date.now() - t0;
  untrustWorkspace(repo);
  const { pids, tracked } = runOrphans({ repo, startedAt: t0, jobFile, port });
  const ports = listeningPorts(pids);
  const stopped = stopProcesses(pids);
  if (stopped.length) log(`    stopped ${stopped.length} process(es) the run left behind: ${stopped.map((pid) => (ports.has(pid) ? `${pid} on :${ports.get(pid).join(",:")}` : `${pid}`)).join("; ")}`);
  record.orphans = stopped.length;
  record.tracked = tracked;
  // Keep what prompted, not only how often: the prompt count is a UX metric and its causes are the fix list.
  record.prompt_log = existsSync(promptLog)
    ? readFileSync(promptLog, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          try {
            const p = JSON.parse(l);
            return { tool: p.tool, command: String(p.command ?? "").replace(/^cd "[^"]*" && /, "").slice(0, 200), decision: p.decision };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];
  record.prompts = record.prompt_log.length;
  record.cache_hit_ratio = round(cacheHitRatio(record.usage), 4);
  record.tokens_total = totalTokens(record.usage);
  record.base_sha = base;
  record.changed_files = changedFiles(repo, base).filter((f) => !/^(test\/hidden\/|\.claude\/|\.picket\/|artifacts\/|work\/|\.bench-vitest\.json)/.test(f));
  record.lines_added = linesAdded(repo, base);
  record.signals = adapter.signals(record.texts, record);
  record.grade = grade({ repo, task, hiddenDir: join(BENCH, "hidden", task.id), adapter, base });
  record.pass = record.grade.pass && record.terminal === "completed";
  record.finished = new Date().toISOString();
  record.texts = record.texts.map((t) => t.slice(0, 4000));
  record.run_dir = args.keep ? runDir : null;
  if (!args.keep) {
    // The repo is bulk; the event stream is small and is what every diagnosis so far needed.
    try {
      mkdirSync(join(BENCH, ".runs", "events"), { recursive: true });
      cpSync(eventsPath, join(BENCH, ".runs", "events", `${runId}.jsonl`));
      record.events = `bench/.runs/events/${runId}.jsonl`;
    } catch {}
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
  return record;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!HARNESSES.includes(args.harness)) throw new Error(`unknown harness ${args.harness}; use ${HARNESSES.join(" or ")}`);
  const adapter = await import(`./adapters/${args.harness}.mjs`);
  const harnessRoot = resolve(args.harnessRoot ?? defaultHarnessRoot(args.harness));
  const tasks = loadTasks(args.tasks);
  if (!tasks.length) throw new Error(`no tasks match ${args.tasks}`);
  const out = resolve(args.out ?? join(BENCH, "results", `${args.label ?? args.harness}-${new Date().toISOString().slice(0, 10)}.json`));
  const log = (m) => console.log(m);

  const { template, hash } = buildTemplate({ fixtureDir: join(BENCH, "fixture"), cacheDir: join(BENCH, ".cache"), log });
  const man = manifest(adapter, harnessRoot, hash, args);
  log(`harness ${man.harness}@${man.harness_commit}${man.harness_dirty ? "+dirty" : ""} · fixture ${hash} · claude ${man.claude_version} · ${tasks.length} task(s) × ${args.runs}`);
  if (args.dry) {
    for (const t of tasks) log(`  ${t.id} [${t.lane}] budget $${t.budget_usd ?? 10}`);
    return;
  }
  adapter.build?.(harnessRoot);

  mkdirSync(dirname(out), { recursive: true });
  const existing = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { manifest: man, records: [] };
  existing.manifest = existing.manifest ?? man;
  const save = () => writeFileSync(out, JSON.stringify(existing, null, 2));
  save();

  let spent = 0;
  for (const task of tasks) {
    for (let run = 1; run <= args.runs; run++) {
      const already = existing.records.find((r) => r.task === task.id && r.run === run);
      if (already) {
        log(`  ${task.id} run ${run}: already recorded, skipping`);
        continue;
      }
      log(`  ${task.id} run ${run}/${args.runs} [${task.lane}] …`);
      const rec = await runOnce({ task, run, adapter, harnessRoot, template, args, log });
      if (QUOTA.test(rec.error ?? "")) {
        // Not a measurement of the harness: record nothing, stop burning the task list, say when to resume.
        log(`  ${task.id} run ${run}: quota exhausted (${rec.error.slice(0, 120)}); stopping. Re-run the same command later, it resumes.`);
        process.exitCode = 3;
        return;
      }
      if (rec.terminal === "suspended") {
        // The host slept through the run. Record nothing; the next invocation re-runs it.
        log(`  ${task.id} run ${run}: host suspended mid-run (${Math.round(rec.wall_ms / 1000)} s wall for a ${Math.round((task.timeout_ms ?? 25 * 60_000) / 1000)} s timeout); not recorded.`);
        continue;
      }
      existing.records.push(rec);
      save();
      spent += rec.cost_usd;
      log(
        `    ${rec.pass ? "PASS" : "FAIL"} · ${rec.terminal} · $${rec.cost_usd.toFixed(2)} · ${(rec.wall_ms / 1000).toFixed(0)}s · stops ${rec.stops} · turns ${rec.turns} · tools ${rec.tool_calls} · TTFR ${rec.first_reviewable_ms !== null ? (rec.first_reviewable_ms / 1000).toFixed(0) + "s" : "-"} · route ${rec.signals.route}${rec.error ? " · " + rec.error.slice(0, 120) : ""}`,
      );
      appendFileSync(join(BENCH, "results", "spend.log"), `${new Date().toISOString()} ${adapter.name} ${task.id} r${run} $${rec.cost_usd.toFixed(3)}\n`);
    }
  }
  log(`done · ${existing.records.length} record(s) in ${out} · this invocation spent $${spent.toFixed(2)}`);
}

main().catch((err) => {
  console.error(err.stack ?? String(err));
  process.exit(1);
});
