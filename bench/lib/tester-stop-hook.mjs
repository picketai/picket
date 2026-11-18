#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TESTER = "picket:tester";
export const STOP_REASON = "the benchmark ends after the tester's verdict; end your turn";
export const SEND_TOOLS = "Agent|Task";

const SENDS = new Set(SEND_TOOLS.split("|"));

function denial() {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: STOP_REASON } };
}

export function stopAnswer(input) {
  if (input?.hook_event_name !== "PreToolUse" || !SENDS.has(input?.tool_name)) return null;
  if (input?.tool_input?.subagent_type === TESTER) return null;
  return denial();
}

function parsed(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hookAnswer(raw) {
  const input = parsed(raw);
  return typeof input?.hook_event_name === "string" ? stopAnswer(input) : denial();
}

export function stopSettings(hookPath) {
  return { hooks: { PreToolUse: [{ matcher: SEND_TOOLS, hooks: [{ type: "command", command: `node "${hookPath}"` }] }] } };
}

function main() {
  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    const out = hookAnswer(raw);
    if (out) process.stdout.write(JSON.stringify(out));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
