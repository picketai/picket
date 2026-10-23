import { bareAgentName } from "../../../shared/agent-name.mts";
import { appendDriveRow, driveTarget, maskEnvValues } from "../../../shared/drive-log.mts";
import { commandKey, escalationMarker, notRunBefore, recordEscalation, withoutMarker } from "../../../shared/escalation.mts";
import { readLedger } from "../../../shared/ledger.mts";
import { kernelVerbStart } from "../../../shared/shell/kernel-call.mts";
import { readPowerShell } from "../../../shared/shell/powershell.mts";
import type { WorkId } from "../../../shared/work/files.mts";
import { parse } from "../../../util/vendor/shell-quote-parse.mjs";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { isDriveCommand } from "./evidence.mts";

type ToolEvent = "PostToolUse" | "PostToolUseFailure";
type Segment = string[];
type Escalated = { session: string | null; agent: string | null; work_id: WorkId | null; failed: boolean };

const LOGGED_COMMAND_CHARS = 200;
const POWERSHELL_TOOL = "PowerShell";
const FAILURE_EVENT = "PostToolUseFailure";

function tokenize(command: string): ReturnType<typeof parse> {
  try {
    return parse(command);
  } catch {
    return [];
  }
}

function bashSegments(command: string): Segment[] {
  const segments: Segment[] = [[]];
  for (const token of tokenize(command)) {
    if (typeof token === "string") segments[segments.length - 1].push(token);
    else if ("op" in token && token.op !== "glob") segments.push([]);
  }
  return segments.map((words) => (words[0] === "{" ? words.slice(1) : words));
}

function commandSegments(command: string, tool: string | undefined): Segment[] {
  return tool === POWERSHELL_TOOL ? (readPowerShell(command)?.segments ?? []) : bashSegments(command);
}

function isKernelCall(segments: Segment[]): boolean {
  return segments.some((words) => kernelVerbStart(words) !== null);
}

function commandKind(command: string, segments: Segment[]): "drive" | "inspect" {
  return !isKernelCall(segments) && isDriveCommand(command) ? "drive" : "inspect";
}

function escalationReason(segments: Segment[]): string | null {
  if (segments.length !== 1) return null;
  const marker = escalationMarker(segments[0]);
  return marker && "reason" in marker ? marker.reason : null;
}

function recordRanEscalation(ctx: HookContext, command: string, segments: Segment[], { session, agent, work_id, failed }: Escalated): void {
  const reason = escalationReason(segments);
  if (reason === null) return;
  const escalated = maskEnvValues(withoutMarker(command));
  if (!notRunBefore(readLedger(ctx.root).rows, session, commandKey(escalated))) return;
  recordEscalation(ctx.root, { session, outcome: "ran", why: failed ? "failed" : null, command: escalated, reason: maskEnvValues(reason), agent, work_id }, ctx.now());
}

export function observeDrive(event: PayloadOf<ToolEvent>, ctx: HookContext): null {
  const command = event.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return null;
  const session = event.session_id ?? null;
  const { work_id, phase } = driveTarget(ctx.root, { session });
  const agent = bareAgentName(event.agent_type);
  const failed = event.hook_event_name === FAILURE_EVENT;
  const segments = commandSegments(command, event.tool_name);
  if (!failed) {
    appendDriveRow(ctx.root, {
      ts: ctx.now().toISOString(),
      session,
      agent,
      kind: commandKind(command, segments),
      command: maskEnvValues(command).replace(/\s+/g, " ").slice(0, LOGGED_COMMAND_CHARS),
      work_id,
      phase,
    });
  }
  recordRanEscalation(ctx, command, segments, { session, agent, work_id, failed });
  return null;
}

export const hook: HookSpec<ToolEvent> = {
  handler: async (event, ctx) => observeDrive(event, ctx),
};
