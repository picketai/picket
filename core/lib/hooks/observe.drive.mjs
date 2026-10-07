import { appendFileSync, mkdirSync } from "node:fs";
import { isDriveCommand } from "../drive-evidence.mjs";
import { listWork, deriveState } from "../work.mjs";
import { stateDir, statePath, STATE_FILES } from "../paths.mjs";
import { bareAgentName } from "../agent-name.mjs";
import { kernelVerbStart } from "../kernel-call.mjs";
import { parse } from "../vendor/shell-quote-parse.mjs";

const LOGGED_COMMAND_CHARS = 200;

function openWorkItem(root) {
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

function commandKind(command) {
  return !isKernelCall(command) && isDriveCommand(command) ? "drive" : "inspect";
}

export function observeDrive(event, { root }) {
  const command = event.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return null;
  const { work_id, phase } = openWorkItem(root);
  const row = {
    ts: new Date().toISOString(),
    session: event.session_id ?? null,
    agent: bareAgentName(event.agent_type),
    kind: commandKind(command),
    command: command.replace(/\s+/g, " ").slice(0, LOGGED_COMMAND_CHARS),
    work_id,
    phase,
  };
  mkdirSync(stateDir(root), { recursive: true });
  appendFileSync(statePath(root, STATE_FILES.driveLog), JSON.stringify(row) + "\n");
  return null;
}
