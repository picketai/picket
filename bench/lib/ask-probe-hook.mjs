#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SENTINEL = "picket-probe";
export const ASK_REASON = "picket ask probe: sentinel command";
export const UPDATE_SENTINEL = "picket-probe-update";
export const REFUSE_SENTINEL = "picket-probe-refuse";
const NONCE_BYTES = 32;

function isPreToolUse(input) {
  return input?.hook_event_name === "PreToolUse";
}

export function rewriteNonce(input) {
  const command = input?.tool_input?.command;
  const rewrites = typeof command === "string" && [UPDATE_SENTINEL, REFUSE_SENTINEL].some((sentinel) => command.includes(sentinel));
  return isPreToolUse(input) && rewrites ? randomBytes(NONCE_BYTES).toString("hex") : null;
}

export function logLine(input, nonce = null) {
  return {
    event: input?.hook_event_name ?? null,
    tool: input?.tool_name ?? null,
    permission_mode: input?.permission_mode ?? null,
    has_tool_use_id: typeof input?.tool_use_id === "string",
    command: typeof input?.tool_input?.command === "string" ? input.tool_input.command.slice(0, 300) : null,
    transcript_path: typeof input?.transcript_path === "string" ? input.transcript_path : null,
    ...(isPreToolUse(input) && nonce !== null ? { nonce } : {}),
  };
}

function rewritten(line) {
  return line.nonce === undefined ? {} : { updatedInput: { command: `${line.command} ${line.nonce}` } };
}

export function answer(line) {
  if (line.event !== "PreToolUse" || !line.command?.includes(SENTINEL)) return null;
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: ASK_REASON, ...rewritten(line) } };
}

function main(logPath) {
  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let input = null;
    try {
      input = JSON.parse(raw);
    } catch {}
    const line = logLine(input, rewriteNonce(input));
    if (logPath) appendFileSync(logPath, JSON.stringify(line) + "\n");
    const out = answer(line);
    if (out) process.stdout.write(JSON.stringify(out));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
