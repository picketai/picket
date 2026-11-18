#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TESTER = "picket:tester";
export const STOP_REASON = "the benchmark ends after the tester's verdict; end your turn";
export const SEND_TOOLS = "Agent|Task";

const SENDS = new Set(SEND_TOOLS.split("|"));

export function stopAnswer(input) {
  if (input?.hook_event_name !== "PreToolUse" || !SENDS.has(input?.tool_name)) return null;
  if (input?.tool_input?.subagent_type === TESTER) return null;
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: STOP_REASON } };
}

export function stopSettings(hookPath) {
  return { hooks: { PreToolUse: [{ matcher: SEND_TOOLS, hooks: [{ type: "command", command: `node "${hookPath}"` }] }] } };
}

function main() {
  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let input = null;
    try {
      input = JSON.parse(raw);
    } catch {}
    const out = stopAnswer(input);
    if (out) process.stdout.write(JSON.stringify(out));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
