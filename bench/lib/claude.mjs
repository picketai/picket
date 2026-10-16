// Runs one `claude -p` invocation in stream-json mode, stamps every event with a wall-clock time,
// and returns the result record plus the summary the metrics need.
import { spawn, execSync, execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let claudeBin;
export function resolveClaude() {
  if (claudeBin) return claudeBin;
  if (process.platform !== "win32") return (claudeBin = "claude");
  const lines = execSync("where claude", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  claudeBin = lines.find((l) => /\.cmd$/i.test(l)) ?? lines.find((l) => /\.exe$/i.test(l)) ?? lines[0];
  return claudeBin;
}

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

export const JOB_WRAPPER = fileURLToPath(new URL("./jobwrap.ps1", import.meta.url));

function quietExec(command, args) {
  execFileSync(command, args, { stdio: "ignore", windowsHide: true });
}

export function stopTree(child, { platform = process.platform, exec = quietExec } = {}) {
  if (platform !== "win32") return child.kill();
  try {
    exec("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
  } catch {
    child.kill();
  }
}

export function launchCommand(args, { platform = process.platform, jobFile, claude = resolveClaude() } = {}) {
  if (platform === "win32" && jobFile) return { command: "pwsh", args: ["-NoProfile", "-File", JOB_WRAPPER, "-JobFile", jobFile, "--", claude, ...args], shell: false };
  return { command: claude, args, shell: platform === "win32" && /\.cmd$/i.test(claude) };
}

/**
 * @param {object} o
 * @param {string} o.cwd            repository the session runs in
 * @param {string} o.prompt         user prompt (sent on stdin)
 * @param {string} [o.resume]       session id to continue
 * @param {string[]} [o.allowedTools]
 * @param {string} [o.permissionMode]
 * @param {number} [o.maxBudgetUsd]
 * @param {number} [o.maxTurns]
 * @param {number} [o.timeoutMs]
 * @param {string} [o.eventsPath]   JSONL file that receives every stamped event
 * @param {number} [o.t0]           wall-clock origin for relative timestamps
 */
export function claudeArgs(o) {
  const args = ["-p", "--output-format", "stream-json", "--verbose"];
  if (o.resume) args.push("--resume", o.resume);
  if (o.permissionMode) args.push("--permission-mode", o.permissionMode);
  if (o.allowedTools?.length) args.push("--allowedTools", o.allowedTools.join(","));
  if (o.maxBudgetUsd) args.push("--max-budget-usd", String(o.maxBudgetUsd));
  if (o.maxTurns) args.push("--max-turns", String(o.maxTurns));
  if (o.pluginDir) args.push("--plugin-dir", o.pluginDir);
  if (o.model) args.push("--model", o.model);
  if (o.settingSources) args.push("--setting-sources", o.settingSources);
  if (o.approver) {
    // The scripted user's approve button: every prompt goes to the bench MCP server, which allows
    // and logs it. `--strict-mcp-config` keeps the fixture's own MCP servers out of the session.
    args.push("--mcp-config", o.approver.configPath, "--strict-mcp-config", "--permission-prompt-tool", "mcp__bench__approve");
  }
  return args;
}

export function runClaude(o) {
  const args = claudeArgs(o);

  const t0 = o.t0 ?? Date.now();
  const started = Date.now();
  const summary = {
    toolCounts: {},
    toolCalls: 0,
    reads: 0,
    rereads: 0,
    readPaths: new Set(),
    subagents: 0,
    firstToolUseMs: null,
    firstWriteMs: null,
    model: null,
    events: 0,
  };

  return new Promise((resolve) => {
    const launch = launchCommand(args, { jobFile: o.jobFile });
    const child = spawn(launch.command, launch.args, {
      cwd: o.cwd,
      env: { ...process.env, CLAUDE_PROJECT_DIR: o.cwd, ...(o.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
      shell: launch.shell,
      windowsHide: true,
    });
    let buf = "";
    let result = null;
    let stderr = "";
    const timer = o.timeoutMs
      ? setTimeout(() => {
          stderr += `\n[bench] timeout after ${o.timeoutMs} ms, killing`;
          stopTree(child);
        }, o.timeoutMs)
      : null;

    const onEvent = (ev) => {
      const now = Date.now();
      summary.events++;
      if (o.eventsPath) appendFileSync(o.eventsPath, JSON.stringify({ t: now - t0, ...ev }) + "\n");
      if (ev.type === "system" && ev.subtype === "init") summary.model = ev.model ?? null;
      if (ev.type === "rate_limit_event") summary.rateLimits = (summary.rateLimits ?? 0) + 1; // API throttling is not harness latency
      if (ev.type === "assistant" && Array.isArray(ev.message?.content)) {
        for (const block of ev.message.content) {
          if (block.type !== "tool_use") continue;
          summary.toolCalls++;
          summary.toolCounts[block.name] = (summary.toolCounts[block.name] ?? 0) + 1;
          if (summary.firstToolUseMs === null) summary.firstToolUseMs = now - t0;
          if (block.name === "Read") {
            summary.reads++;
            const p = block.input?.file_path;
            if (p) {
              if (summary.readPaths.has(p)) summary.rereads++;
              summary.readPaths.add(p);
            }
          }
          if (WRITE_TOOLS.has(block.name) && summary.firstWriteMs === null) summary.firstWriteMs = now - t0;
          if (block.name === "Agent" || block.name === "Task") summary.subagents++;
        }
      }
      if (ev.type === "result") result = ev;
    };

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          onEvent(JSON.parse(line));
        } catch {
          stderr += `\n[bench] unparsable line: ${line.slice(0, 200)}`;
        }
      }
    });
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (buf.trim()) {
        try {
          onEvent(JSON.parse(buf.trim()));
        } catch {}
      }
      resolve({
        result,
        exitCode: code,
        signal: signal ?? null,
        stderr: stderr.slice(-4000),
        wallMs: Date.now() - started,
        summary: { ...summary, readPaths: undefined, uniqueReads: summary.readPaths.size },
      });
    });
    child.stdin.write(o.prompt);
    child.stdin.end();
  });
}
