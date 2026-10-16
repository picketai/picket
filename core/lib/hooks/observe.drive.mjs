import { appendFileSync, mkdirSync } from "node:fs";
import { isDriveCommand } from "../drive-evidence.mjs";
import { listWork, deriveState } from "../work.mjs";
import { stateDir, statePath, STATE_FILES } from "../paths.mjs";
import { bareAgentName } from "../agent-name.mjs";
import { kernelVerbStart } from "../kernel-call.mjs";
import { parse } from "../vendor/shell-quote-parse.mjs";
import { escalationMarker, recordEscalation, withoutMarker } from "../escalation.mjs";

const LOGGED_COMMAND_CHARS = 200;

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

function commandSegments(command) {
  const segments = [[]];
  for (const token of tokenize(command)) {
    if (typeof token === "string") segments.at(-1).push(token);
    else if (token.op && token.op !== "glob") segments.push([]);
  }
  return segments.map((words) => (words[0] === "{" ? words.slice(1) : words));
}

function isKernelCall(command) {
  return commandSegments(command).some((words) => kernelVerbStart(words) !== null);
}

const QUOTED_ENV_FLAG = /--env(\s+)(["'])([A-Za-z_][A-Za-z0-9_]*)=[^"']*\2/g;
const ENV_FLAG = /--env(\s+)([A-Za-z_][A-Za-z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s"']*)/g;

export function maskEnvValues(command) {
  return command.replace(QUOTED_ENV_FLAG, "--env$1$3=***").replace(ENV_FLAG, "--env$1$2=***");
}

function commandKind(command) {
  return !isKernelCall(command) && isDriveCommand(command) ? "drive" : "inspect";
}

function escalationReason(command) {
  const segments = commandSegments(command);
  if (segments.length !== 1) return null;
  const marker = escalationMarker(segments[0]);
  return marker && !marker.invalid ? marker.reason : null;
}

export function observeDrive(event, { root }) {
  const command = event.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return null;
  const { work_id, phase } = openWorkItem(root);
  const session = event.session_id ?? null;
  const agent = bareAgentName(event.agent_type);
  const row = {
    ts: new Date().toISOString(),
    session,
    agent,
    kind: commandKind(command),
    command: maskEnvValues(command).replace(/\s+/g, " ").slice(0, LOGGED_COMMAND_CHARS),
    work_id,
    phase,
  };
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify(row) + "\n");
  const reason = escalationReason(command);
  if (reason !== null) recordEscalation(root, { session, outcome: "ran", command: maskEnvValues(withoutMarker(command)), reason: maskEnvValues(reason), agent, work_id });
  return null;
}
