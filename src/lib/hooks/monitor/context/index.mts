import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { toolStats } from "../../../shared/transcript/entries.mts";
import type { HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

const STALL_AFTER = 6;
const LOOK = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);

function lookStreak(names: string[]): number {
  let streak = 0;
  for (let i = names.length - 1; i >= 0 && LOOK.has(names[i]); i--) streak++;
  return streak;
}

export function monitorContext(event: PayloadOf<"PostToolUse">): ContextOutput | null {
  if (!event.tool_name || !LOOK.has(event.tool_name) || !event.transcript_path) return null;
  const streak = lookStreak(toolStats(agentTranscript(event)).names);
  if (streak < STALL_AFTER || streak % STALL_AFTER !== 0) return null;
  return context(
    "PostToolUse",
    `monitor.context: ${streak} consecutive reads and searches with no edit, write or command. State in one sentence why you have not acted yet, then act, or ask the user the one question that is blocking you.`,
  );
}

export const hook: HookSpec<"PostToolUse"> = {
  handler: async (event) => monitorContext(event),
};
