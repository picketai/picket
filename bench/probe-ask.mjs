#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { runClaude } from "./lib/claude.mjs";
import { trustWorkspace, untrustWorkspace } from "./lib/trust.mjs";

const BENCH = dirname(fileURLToPath(import.meta.url));
const HOOK = join(BENCH, "lib", "ask-probe-hook.mjs");
const APPROVER = join(BENCH, "lib", "approver-mcp.mjs");
export const RECORD = join(BENCH, "results", "ask-probe.json");
const SCRATCH_ROOT = realpathSync.native(tmpdir());
const SCRATCH_PREFIX = "picket-ask-probe-";
export const INTERACTIVE_DIR = join(SCRATCH_ROOT, `${SCRATCH_PREFIX}interactive`);

const OK_SENTINEL = "picket-probe-ok";
const BANG_SENTINEL = "picket-probe-bang";
const OK_COMMAND = `echo ${OK_SENTINEL}`;
const PROBED_TOOLS = "Bash|PowerShell";
const FAILING_COMMAND = "ls picket-probe-missing";
const SETTING_SOURCES = "project,local";
const MODEL = "haiku";
const MAX_TURNS = 2;
const MAX_BUDGET_USD = 0.05;
const TIMEOUT_MS = 3 * 60_000;

export const CELLS = [
  ...["manual", "acceptEdits", "auto", "bypassPermissions", "dontAsk"].map((mode) => ({ mode, scenario: "ask" })),
  ...["manual", "auto"].map((mode) => ({ mode, scenario: "ask+rule" })),
  { mode: "manual", scenario: "ask+fail" },
];

const AUTO_ANSWERS = { shown: "shown", silent: "silent" };
const UNRECORDED_INTERACTIVE = { auto_dialog: null, bang_hooked: null, tool: null };

export function sentinelFor(scenario) {
  return scenario === "ask+fail" ? FAILING_COMMAND : OK_COMMAND;
}

function forwardSlashes(path) {
  return path.replaceAll("\\", "/");
}

export function probeSettings(logPath) {
  const hook = { matcher: PROBED_TOOLS, hooks: [{ type: "command", command: `node "${forwardSlashes(HOOK)}" "${forwardSlashes(logPath)}"` }] };
  return { hooks: { PreToolUse: [hook], PostToolUse: [hook], PostToolUseFailure: [hook] } };
}

export function allowRuleSettings() {
  return { permissions: { allow: [`Bash(${OK_COMMAND})`] } };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function removeScratch(dir) {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (error) {
    process.stderr.write(`[probe] left ${dir}: ${error.code ?? error.message}\n`);
  }
}

function readJsonLines(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function projectPaths(dir) {
  return { hookLog: join(dir, "hook-log.jsonl"), promptLog: join(dir, "prompt-log.jsonl"), mcpConfig: join(dir, "mcp.json") };
}

function buildProject(dir, scenario) {
  const paths = projectPaths(dir);
  writeJson(join(dir, ".claude", "settings.json"), probeSettings(paths.hookLog));
  if (scenario === "ask+rule") writeJson(join(dir, ".claude", "settings.local.json"), allowRuleSettings());
  writeJson(paths.mcpConfig, { mcpServers: { bench: { command: "node", args: [APPROVER], env: { BENCH_PROMPT_LOG: paths.promptLog } } } });
  return paths;
}

export function summarizeCell(cell, { hookLines, promptLines, run }) {
  const sentinel = sentinelFor(cell.scenario);
  const sentinelLines = hookLines.filter((line) => line.command?.includes(sentinel));
  const pre = sentinelLines.find((line) => line.event === "PreToolUse");
  const postEvents = sentinelLines.filter((line) => line.event !== "PreToolUse").map((line) => line.event);
  return {
    mode: cell.mode,
    scenario: cell.scenario,
    hook_permission_mode: pre?.permission_mode ?? null,
    prompt_tool_called: promptLines.some((line) => line.command?.includes(sentinel)),
    command_ran: postEvents.length > 0,
    post_events: postEvents,
    has_tool_use_id: hookLines.length ? hookLines.every((line) => line.has_tool_use_id) : null,
    error: cellError(run, pre),
  };
}

function cellError(run, pre) {
  if (!run) return "claude did not start";
  if (!run.result) return `no result event (exit ${run.exitCode}): ${run.stderr.slice(-300).trim()}`;
  if (!pre) return `the sentinel never reached PreToolUse (result: ${run.result.subtype ?? "unknown"})`;
  return null;
}

async function runCell(cell) {
  const dir = mkdtempSync(join(SCRATCH_ROOT, SCRATCH_PREFIX));
  const paths = buildProject(dir, cell.scenario);
  trustWorkspace(dir);
  let run = null;
  try {
    run = await runClaude({
      cwd: dir,
      prompt: `Run exactly this Bash command once, then stop: ${sentinelFor(cell.scenario)}`,
      permissionMode: cell.mode,
      settingSources: SETTING_SOURCES,
      model: MODEL,
      maxTurns: MAX_TURNS,
      maxBudgetUsd: MAX_BUDGET_USD,
      timeoutMs: TIMEOUT_MS,
      approver: { configPath: paths.mcpConfig },
    });
  } catch (error) {
    run = null;
    process.stderr.write(`[probe] ${cell.mode}/${cell.scenario}: ${error.message}\n`);
  } finally {
    untrustWorkspace(dir);
  }
  const summary = summarizeCell(cell, { hookLines: readJsonLines(paths.hookLog), promptLines: readJsonLines(paths.promptLog), run });
  removeScratch(dir);
  return summary;
}

function claudeVersion() {
  try {
    return execSync("claude --version", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function probeDirs(trustedProjects) {
  return Object.keys(trustedProjects ?? {}).filter((path) => path.includes(SCRATCH_PREFIX) && path !== forwardSlashes(INTERACTIVE_DIR));
}

function sweepEarlierRuns() {
  const config = join(homedir(), ".claude.json");
  if (!existsSync(config)) return;
  for (const dir of probeDirs(JSON.parse(readFileSync(config, "utf8")).projects)) {
    untrustWorkspace(dir);
    removeScratch(dir);
  }
}

async function probe() {
  sweepEarlierRuns();
  const cells = [];
  for (const cell of CELLS) {
    const summary = await runCell(cell);
    process.stdout.write(`${cell.mode}/${cell.scenario}: prompt_tool_called=${summary.prompt_tool_called} command_ran=${summary.command_ran}${summary.error ? ` error=${summary.error}` : ""}\n`);
    cells.push(summary);
  }
  const previous = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, "utf8")) : null;
  writeJson(RECORD, { claude_version: claudeVersion(), ran_at: new Date().toISOString(), cells, interactive: previous?.interactive ?? UNRECORDED_INTERACTIVE });
  process.stdout.write(`wrote ${RECORD}\n`);
}

function interactive() {
  removeScratch(INTERACTIVE_DIR);
  const { hookLog } = buildProject(INTERACTIVE_DIR, "ask");
  process.stdout.write(
    [
      `Scratch project: ${INTERACTIVE_DIR}`,
      `1. In that directory run \`claude --permission-mode auto\`, accept the trust dialog, and ask it to run \`${OK_COMMAND}\`. Note whether a permission dialog appears (shown) or not (silent).`,
      `2. In the same session type \`! echo ${BANG_SENTINEL}\`. ${hookLog} records whether the hook saw it.`,
      `3. Exit, then run: node bench/probe-ask.mjs --confirm auto=shown|silent`,
      "",
    ].join("\n"),
  );
}

export function parseConfirm(args) {
  const answers = Object.fromEntries(args.map((arg) => arg.split("=")));
  const unknownKeys = Object.keys(answers).filter((key) => key !== "auto");
  if (unknownKeys.length) throw new Error(`--confirm takes only auto=; got ${unknownKeys.join(", ")}`);
  if (!Object.hasOwn(AUTO_ANSWERS, answers.auto ?? "")) throw new Error("--confirm needs auto=shown or auto=silent");
  return { auto_dialog: AUTO_ANSWERS[answers.auto] };
}

function preToolUseFor(hookLines, sentinel) {
  return hookLines.find((line) => line.event === "PreToolUse" && line.command?.includes(sentinel));
}

export function interactiveAnswers(hookLines, args) {
  const { auto_dialog } = parseConfirm(args);
  const okLine = preToolUseFor(hookLines, OK_SENTINEL);
  if (!okLine) throw new Error(`the hook log has no PreToolUse line for ${OK_SENTINEL}; the probe hook did not run, so nothing was recorded`);
  return { auto_dialog, bang_hooked: Boolean(preToolUseFor(hookLines, BANG_SENTINEL)), tool: okLine.tool ?? null };
}

export function withInteractive(record, interactive) {
  return { ...record, interactive };
}

function confirm(args) {
  if (!existsSync(RECORD)) throw new Error(`no record at ${RECORD}; run the probe first`);
  const record = JSON.parse(readFileSync(RECORD, "utf8"));
  const answers = interactiveAnswers(readJsonLines(projectPaths(INTERACTIVE_DIR).hookLog), args);
  writeJson(RECORD, withInteractive(record, answers));
  untrustWorkspace(INTERACTIVE_DIR);
  removeScratch(INTERACTIVE_DIR);
  process.stdout.write(`wrote interactive answers to ${RECORD}\n`);
}

async function main(argv) {
  if (argv[0] === "--interactive") return interactive();
  if (argv[0] === "--confirm") return confirm(argv.slice(1));
  if (argv.length) throw new Error(`unknown arguments: ${argv.join(" ")}`);
  return probe();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
