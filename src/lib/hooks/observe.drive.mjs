import { appendFileSync, mkdirSync } from "node:fs";
import { isDriveCommand } from "./drive-evidence.mjs";
import { listWork, deriveState } from "../shared/work/work.mjs";
import { stateDir, statePath, STATE_FILES } from "../shared/paths.mjs";
import { bareAgentName } from "../shared/agent-name.mjs";
import { kernelVerbStart } from "./kernel-call.mjs";
import { parse } from "../util/vendor/shell-quote-parse.mjs";
import { commandKey, escalationMarker, notRunBefore, recordEscalation, withoutMarker } from "../shared/escalation.mjs";
import { readLedger } from "../shared/ledger.mjs";
import { readPowerShell } from "./powershell-text.mjs";

const LOGGED_COMMAND_CHARS = 200;
const POWERSHELL_TOOL = "PowerShell";

export function openWorkItem(root) {
  for (const id of listWork(root).reverse()) {
    const s = deriveState(id, root);
    if (s.status === "open") return { work_id: id, phase: s.current_phase };
  }
  return { work_id: null, phase: null };
}

function tokenize(command) {
  try {
    return parse(command);
  } catch {
    return [];
  }
}

function bashSegments(command) {
  const segments = [[]];
  for (const token of tokenize(command)) {
    if (typeof token === "string") segments.at(-1).push(token);
    else if (token.op && token.op !== "glob") segments.push([]);
  }
  return segments.map((words) => (words[0] === "{" ? words.slice(1) : words));
}

function commandSegments(command, tool) {
  return tool === POWERSHELL_TOOL ? (readPowerShell(command)?.segments ?? []) : bashSegments(command);
}

function isKernelCall(segments) {
  return segments.some((words) => kernelVerbStart(words) !== null);
}

const QUOTED_ENV_FLAG = /--env(\s+)(["'])([A-Za-z_][A-Za-z0-9_]*)=[^"']*\2/g;
const ENV_FLAG = /--env(\s+)([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s"']*)/g;

export function maskEnvValues(command) {
  return command.replace(QUOTED_ENV_FLAG, "--env$1$3=***").replace(ENV_FLAG, "--env$1$2=***");
}

function commandKind(command, segments) {
  return !isKernelCall(segments) && isDriveCommand(command) ? "drive" : "inspect";
}

function escalationReason(segments) {
  if (segments.length !== 1) return null;
  const marker = escalationMarker(segments[0]);
  return marker && !marker.invalid ? marker.reason : null;
}

const FAILURE_EVENT = "PostToolUseFailure";

function recordRanEscalation(root, command, segments, { session, agent, work_id, failed }) {
  const reason = escalationReason(segments);
  if (reason === null) return;
  const escalated = maskEnvValues(withoutMarker(command));
  if (!notRunBefore(readLedger(root), session, commandKey(escalated))) return;
  recordEscalation(root, { session, outcome: "ran", why: failed ? "failed" : null, command: escalated, reason: maskEnvValues(reason), agent, work_id });
}

export function observeDrive(event, { root }) {
  const command = event.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return null;
  const { work_id, phase } = openWorkItem(root);
  const session = event.session_id ?? null;
  const agent = bareAgentName(event.agent_type);
  const failed = event.hook_event_name === FAILURE_EVENT;
  const segments = commandSegments(command, event.tool_name);
  mkdirSync(stateDir(root), { recursive: true });
  if (!failed) {
    const row = {
      ts: new Date().toISOString(),
      session,
      agent,
      kind: commandKind(command, segments),
      command: maskEnvValues(command).replace(/\s+/g, " ").slice(0, LOGGED_COMMAND_CHARS),
      work_id,
      phase,
    };
    appendFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify(row) + "\n");
  }
  recordRanEscalation(root, command, segments, { session, agent, work_id, failed });
  return null;
}
