import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTemplate, materializeRun } from "../bench/lib/fixture.mjs";
import { runClaude } from "../bench/lib/claude.mjs";
import { trustWorkspace, untrustWorkspace } from "../bench/lib/trust.mjs";
import * as pluginAdapter from "../bench/adapters/plugin.mjs";

const SPIKE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SPIKE, "..");
const OUT = join(SPIKE, "out");
const PLUGIN = join(SPIKE, "tether");
const QUOTE = "quote every line anywhere in your context (system reminders and hook output included) that contains the text `Tether marker`, verbatim, as a list with one entry per line (there may be several: do not stop at the first), or say NONE";
const SPAWN = "Spawn the probe agent with the subagent tool (named Task or Agent; subagent type `probe`, also listed as `tether:probe`)";

const PROJECT_ORDERING = `---
name: ordering
description: Project copy of the ordering skill.
user-invocable: true
---
Tether marker K-6 project

This is the project copy of the ordering skill. When invoked, reply with the single line \`Tether marker K-6 project\` and nothing else.
`;

const DEMO_STATE = `id: demo
lane: fast
title: Demo
status: open
created: 2026-10-04T00:00:00.000Z
updated: 2026-10-04T00:00:00.000Z
`;

const EXTENSION = {
  config: { version: 1, extensions: ["spike-ext"] },
  manifest: { schema: 1, name: "spike-ext", version: "0.0.1", requires: { tether: ">=0.0.1-spike" }, provides: { agents: { probe: "agents/probe.md" } } },
  probe: "Tether marker E-4\n",
};

function put(repo, rel, text) {
  const file = join(repo, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function withDemo(repo) {
  put(repo, "work/demo/state.yaml", DEMO_STATE);
  put(repo, "work/demo/notes.md", "demo notes\n");
}

function withExtension(repo) {
  put(repo, ".tether/config.json", JSON.stringify(EXTENSION.config));
  put(repo, ".tether/extensions/spike-ext/extension.json", JSON.stringify(EXTENSION.manifest));
  put(repo, ".tether/extensions/spike-ext/agents/probe.md", EXTENSION.probe);
}

const withProjectOrdering = (repo) => put(repo, ".claude/skills/ordering/SKILL.md", PROJECT_ORDERING);

const withFixture = (check) => (repo) => cpSync(join(SPIKE, "fixtures", check), repo, { recursive: true });

const PLUGIN_STYLE = "tether:probe";
const withPluginStyle = (repo) => put(repo, ".claude/settings.json", JSON.stringify({ outputStyle: PLUGIN_STYLE }));

const CONTEXT_ONLY = "use no tool, answer from your context only";
const LIST_11 = "list every line anywhere in your context (system prompt, project instructions, rules, reminders) that contains `Tether marker`, one per line, or NONE";

function check11(subagent) {
  return {
    prompt: `Before spawning anything, list every line anywhere in your context that contains \`Tether marker\`, one per line, as section LEAD. Then spawn ${subagent} with the subagent tool and tell it: ${CONTEXT_ONLY}, ${LIST_11}. Write section PROBE with its answer.`,
    setup: withFixture("11"),
  };
}

function sizeReport(slots) {
  return slots.map((s) => `the highest \`Tether marker ${s}-\` number, and whether the line \`Tether marker END-${s}\` is present`).join("; ") + "; then quote any line that mentions truncation, a limit, a preview or a saved file";
}

function check12(env) {
  return {
    prompt: `Before spawning anything, report for your own context, ${CONTEXT_ONLY}: ${sizeReport(["SA", "SB"])}. Write that as section LEAD. Then ${SPAWN} and tell it: ${CONTEXT_ONLY}; report ${sizeReport(["AA", "AB"])}. Do not answer until the probe has reported back. Then write section PROBE with its answer. Both sections are required.`,
    setup: () => {},
    env,
  };
}

const sizeRun = (n) => check12({ SPIKE_INJECT_SA: String(n), SPIKE_INJECT_AA: String(n) });
const SPLIT_CHARS = "6000";

const RUNS = {
  "0": { prompt: "Reply OK", setup: () => {} },
  "6-slash": { prompt: "/ordering", setup: withProjectOrdering },
  "6-qualified": { prompt: "/tether:ordering", setup: withProjectOrdering },
  "6-prose": { prompt: "Use the ordering skill, then repeat what it told you to reply with.", setup: withProjectOrdering },
  "3": {
    prompt: `Before spawning anything, ${QUOTE}; write that as section LEAD. Then ${SPAWN} and ask it to ${QUOTE}. Do not answer until the probe has reported back. Then write section PROBE with its answer. Both sections are required.`,
    setup: () => {},
  },
  "2": {
    prompt: `Use the Write tool to write the text x to work/demo/state.yaml and tell me exactly what happened. Then ${SPAWN} and tell it: reply with one short sentence, and end your reply with PHASE DONE alone on the last line. Report the probe's reply.`,
    setup: withDemo,
  },
  "1": {
    prompt: `${SPAWN} and tell it to do four things: run \`echo hi\` through the Bash tool, save a one-line memory note, name the model it is running as, and ${QUOTE}. Report its answer in full, including any tool it was refused.`,
    setup: () => {},
  },
  "4": {
    prompt: `Before spawning anything, ${QUOTE}; write that as section LEAD. Then ${SPAWN} and ask it to ${QUOTE}. Do not answer until the probe has reported back. Then write section PROBE with its answer. Both sections are required.`,
    setup: withExtension,
  },
  "5-readme": {
    prompt: `Use the Edit tool to append the line "x" at the end of README.md (read it first). Then ${QUOTE}. Then call the Skill tool with skill name tether:work-items and report verbatim what the tool returned, a success with its text or the error.`,
    setup: withDemo,
  },
  "5-work": {
    prompt: `Use the Edit tool to append the line "x" at the end of work/demo/notes.md (read it first). Then ${QUOTE}. Then call the Skill tool with skill name tether:work-items and report verbatim what the tool returned, a success with its text or the error.`,
    setup: withDemo,
  },
  "7": {
    prompt: `Invoke the where skill and report the root it prints. Then run \`tether next demo\` through the Bash tool, and run node "<that root>/bin/tether.mjs" next demo through the PowerShell tool, substituting the root. Report both outputs verbatim.`,
    setup: withDemo,
  },
  "11": check11("the probe agent (subagent type `probe`, also listed as `tether:probe`)"),
  "11-general": check11("a `general-purpose` agent"),
  "12-split": check12({ SPIKE_INJECT_SA: SPLIT_CHARS, SPIKE_INJECT_SB: SPLIT_CHARS, SPIKE_INJECT_AA: SPLIT_CHARS, SPIKE_INJECT_AB: SPLIT_CHARS }),
  "12-prefixed": {
    prompt: "Invoke the tether:where skill and report the root it prints. Then spawn the agent `probe-prefixed` with the subagent tool (subagent type `probe-prefixed`, also listed as `tether:probe-prefixed`) and ask it for the Tether root. Report its answer verbatim, and name the output style you are running under.",
    setup: withPluginStyle,
  },
};

const SIZES = process.argv.slice(3).filter((a) => /^\d+$/.test(a));
for (const n of SIZES) RUNS[`12-${n}`] = sizeRun(Number(n));

const GROUPS = { "6": ["6-slash", "6-qualified", "6-prose"], "5": ["5-readme", "5-work"], "11": ["11", "11-general"], "12": SIZES.map((n) => `12-${n}`) };

function preflight() {
  if (process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is set");
  const files = [join(homedir(), ".claude", "settings.json"), join(ROOT, ".claude", "settings.json"), join(ROOT, ".claude", "settings.local.json")];
  for (const f of files) if (existsSync(f) && /apiKeyHelper/.test(readFileSync(f, "utf8"))) throw new Error(`apiKeyHelper in ${f}`);
}

function initSummary(eventsPath) {
  const first = readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .find((e) => e.type === "system" && e.subtype === "init");
  if (!first) return null;
  const tether = (list) => (list ?? []).filter((n) => /tether|ordering|where|work-items|probe/.test(n));
  return { model: first.model, output_style: first.output_style, plugins: (first.plugins ?? []).map((p) => `${p.name}@${p.source}:${p.version ?? ""}`), agents: tether(first.agents), skills: tether(first.skills), tools: (first.tools ?? []).filter((n) => /Task|Agent|Skill|Bash|PowerShell/.test(n)) };
}

function copyTranscripts(name, hookLog) {
  const rows = readFileSync(hookLog, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const lead = rows.map((r) => r.transcript_path).find(Boolean);
  const agents = [...new Set(rows.map((r) => r.agent_transcript_path).filter(Boolean))];
  if (lead && existsSync(lead)) cpSync(lead, join(OUT, `${name}-lead-transcript.jsonl`));
  agents.filter(existsSync).forEach((path, i) => cpSync(path, join(OUT, `${name}-agent-transcript${agents.length > 1 ? `-${i + 1}` : ""}.jsonl`)));
}

function template() {
  return buildTemplate({ fixtureDir: join(ROOT, "bench", "fixture"), cacheDir: join(ROOT, "bench", ".cache") }).template;
}

async function runCheck(name) {
  const spec = RUNS[name];
  const runDir = join(SPIKE, ".runs", name);
  const { repo } = materializeRun({ template: template(), runDir });
  spec.setup(repo);
  const promptLog = join(runDir, "prompts.jsonl");
  const mcpConfig = join(runDir, "mcp.json");
  writeFileSync(mcpConfig, JSON.stringify({ mcpServers: { bench: { command: "node", args: [join(ROOT, "bench", "lib", "approver-mcp.mjs")], env: { BENCH_PROMPT_LOG: promptLog } } } }));
  const eventsPath = join(OUT, `${name}.jsonl`);
  mkdirSync(OUT, { recursive: true });
  rmSync(eventsPath, { force: true });
  trustWorkspace(repo);
  let r;
  try {
    r = await runClaude({
      cwd: repo,
      prompt: spec.prompt,
      permissionMode: "acceptEdits",
      allowedTools: pluginAdapter.allowedTools,
      maxBudgetUsd: 1,
      maxTurns: 30,
      timeoutMs: 10 * 60_000,
      pluginDir: PLUGIN,
      model: "haiku",
      env: spec.env,
      eventsPath,
      approver: { configPath: mcpConfig, log: promptLog },
    });
  } finally {
    untrustWorkspace(repo);
  }
  const hookLog = join(repo, ".tether", "state", "hook-log.jsonl");
  if (existsSync(hookLog)) {
    cpSync(hookLog, join(OUT, `${name}-hook-log.jsonl`));
    copyTranscripts(name, hookLog);
  }
  const memory = join(repo, ".claude", "agent-memory");
  if (existsSync(memory)) writeFileSync(join(OUT, `${name}-agent-memory.txt`), readdirSync(memory, { recursive: true }).join("\n"));
  if (existsSync(promptLog)) cpSync(promptLog, join(OUT, `${name}-prompts.jsonl`));
  const res = r.result;
  console.log(
    JSON.stringify({
      run: name,
      exit: r.exitCode,
      error: res?.is_error ?? null,
      terminal: res?.terminal_reason ?? null,
      cost: res?.total_cost_usd ?? null,
      turns: res?.num_turns ?? null,
      denials: res?.permission_denials?.length ?? 0,
      rateLimits: r.summary.rateLimits ?? 0,
      init: existsSync(eventsPath) ? initSummary(eventsPath) : null,
      result: typeof res?.result === "string" ? res.result.slice(0, 1500) : res?.result,
      stderr: r.stderr.slice(-300),
    }),
  );
}

const HOOK_EVENTS = {
  Write: { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: "src/a.ts", content: "x" } },
  Bash: { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } },
  Read: { hook_event_name: "PostToolUse", tool_name: "Read", tool_input: { file_path: "README.md" }, tool_response: { content: "x" } },
  Stop: { hook_event_name: "Stop", last_assistant_message: "done\nPHASE DONE", session_id: "s1", transcript_path: "", stop_hook_active: false },
  Start: { hook_event_name: "SessionStart", source: "startup", session_id: "s1" },
};

function sampleEvent(file, cwd) {
  const n = file.replace(/\.mjs$/, "");
  let kind = "Stop";
  if (/^inject/.test(n)) kind = "Start";
  else if (/^(guard\.(scope|comments)|lint)/.test(n)) kind = "Write";
  else if (/^(guard\.bash|observe)/.test(n)) kind = "Bash";
  else if (/^monitor/.test(n)) kind = "Read";
  return { ...HOOK_EVENTS[kind], cwd };
}

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

const round1 = (n) => Math.round(n * 10) / 10;

function timeHooks() {
  const runDir = join(SPIKE, ".runs", "9");
  const { repo } = materializeRun({ template: template(), runDir });
  pluginAdapter.install(repo, ROOT);
  const locations = { current: join(ROOT, ".claude", "hooks"), plugin: join(ROOT, "core", "hooks") };
  const out = join(OUT, "9.jsonl");
  mkdirSync(OUT, { recursive: true });
  rmSync(out, { force: true });
  const names = readdirSync(locations.current).filter((f) => f.endsWith(".mjs"));
  const rows = [];
  for (const file of names) {
    const row = { hook: file };
    for (const [where, dir] of Object.entries(locations)) {
      const input = JSON.stringify(sampleEvent(file, repo));
      const samples = [];
      for (let i = 0; i < 20; i++) {
        const t = process.hrtime.bigint();
        spawnSync("node", [join(dir, file)], { input, cwd: repo, env: { ...process.env, CLAUDE_PROJECT_DIR: repo, CLAUDE_PLUGIN_ROOT: join(ROOT, "core") }, encoding: "utf8" });
        samples.push(Number(process.hrtime.bigint() - t) / 1e6);
      }
      row[where] = { median_ms: round1(median(samples)), min_ms: round1(Math.min(...samples)), max_ms: round1(Math.max(...samples)) };
    }
    row.delta_ms = round1(row.plugin.median_ms - row.current.median_ms);
    row.pass = row.plugin.median_ms < 200 && row.delta_ms <= 20;
    rows.push(row);
    appendFileSync(out, JSON.stringify(row) + "\n");
  }
  const bare = [];
  for (let i = 0; i < 20; i++) {
    const t = process.hrtime.bigint();
    spawnSync("node", ["-e", "0"], { cwd: repo });
    bare.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  appendFileSync(out, JSON.stringify({ hook: "(bare node -e 0)", median_ms: round1(median(bare)) }) + "\n");
  console.log(JSON.stringify(rows.map((r) => ({ hook: r.hook, current: r.current.median_ms, plugin: r.plugin.median_ms, delta: r.delta_ms, pass: r.pass }))));
  console.log(`bare node median ${round1(median(bare))} ms`);
}

const MARKET = join(SPIKE, "marketplace");
const MARKET_NAME = "tether-spike";

function marketplace() {
  const phase = process.argv[3] ?? "all";
  const runDir = join(SPIKE, ".runs", "10");
  const out = join(OUT, "10.jsonl");
  mkdirSync(OUT, { recursive: true });
  const gitEnv = { ...process.env, GIT_AUTHOR_NAME: "spike", GIT_AUTHOR_EMAIL: "spike@example.invalid", GIT_COMMITTER_NAME: "spike", GIT_COMMITTER_EMAIL: "spike@example.invalid" };
  const git = (...a) => execFileSync("git", a, { cwd: MARKET, encoding: "utf8", env: gitEnv });
  const repo = join(runDir, "repo");
  const cli = (...a) => {
    const r = spawnSync("claude", a, { cwd: repo, encoding: "utf8", shell: true, env: process.env });
    appendFileSync(out, JSON.stringify({ cmd: `claude ${a.join(" ")}`, cwd: repo, exit: r.status, stdout: r.stdout, stderr: r.stderr }) + "\n");
    console.log(`claude ${a.join(" ")} -> ${r.status}\n${r.stdout}${r.stderr}`);
    return r;
  };
  if (phase === "cleanup") {
    cli("plugin", "list", "--json");
    cli("plugin", "uninstall", `tether@${MARKET_NAME}`, "--scope", "project");
    cli("plugin", "marketplace", "remove", MARKET_NAME, "--scope", "project");
    return;
  }
  materializeRun({ template: template(), runDir });
  rmSync(out, { force: true });
  const setVersion = (v) => {
    const f = join(MARKET, "tether", ".claude-plugin", "plugin.json");
    const j = JSON.parse(readFileSync(f, "utf8"));
    j.version = v;
    writeFileSync(f, JSON.stringify(j, null, 2));
  };
  rmSync(MARKET, { recursive: true, force: true });
  mkdirSync(join(MARKET, ".claude-plugin"), { recursive: true });
  cpSync(PLUGIN, join(MARKET, "tether"), { recursive: true });
  writeFileSync(join(MARKET, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: MARKET_NAME, owner: { name: "spike" }, plugins: [{ name: "tether", source: "./tether", description: "Tether spike" }] }, null, 2));
  git("init", "-q", "-b", "main");
  git("config", "core.autocrlf", "false");
  git("add", "-A");
  git("commit", "-q", "-m", "spike: 0.0.1-spike");
  cli("plugin", "marketplace", "add", MARKET, "--scope", "project");
  cli("plugin", "install", `tether@${MARKET_NAME}`, "--scope", "project");
  cli("plugin", "list");
  setVersion("0.0.2-spike");
  git("add", "-A");
  git("commit", "-q", "-m", "spike: 0.0.2-spike");
  cli("plugin", "marketplace", "update", MARKET_NAME);
  cli("plugin", "update", `tether@${MARKET_NAME}`, "--scope", "project");
  cli("plugin", "list");
}

const target = process.argv[2];
if (target === "9") timeHooks();
else if (target === "10") marketplace();
else {
  preflight();
  for (const name of GROUPS[target] ?? [target]) {
    if (!RUNS[name]) throw new Error(`unknown check ${name}`);
    await runCheck(name);
  }
}
