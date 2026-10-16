#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SENTINEL = "picket-probe";
export const ASK_REASON = "picket ask probe: sentinel command";

export function logLine(input) {
  return {
    event: input?.hook_event_name ?? null,
    permission_mode: input?.permission_mode ?? null,
    has_tool_use_id: typeof input?.tool_use_id === "string",
    command: typeof input?.tool_input?.command === "string" ? input.tool_input.command.slice(0, 300) : null,
  };
}

export function answer(line) {
  if (line.event !== "PreToolUse" || !line.command?.includes(SENTINEL)) return null;
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: ASK_REASON } };
}

function main(logPath) {
  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let input = null;
    try {
      input = JSON.parse(raw);
    } catch {}
    const line = logLine(input);
    if (logPath) appendFileSync(logPath, JSON.stringify(line) + "\n");
    const out = answer(line);
    if (out) process.stdout.write(JSON.stringify(out));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
