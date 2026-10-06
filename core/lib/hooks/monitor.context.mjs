import { toolStats, agentTranscript } from "../transcript.mjs";

const STALL_AFTER = 6;
const LOOK = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);

function lookStreak(names) {
  let streak = 0;
  for (let i = names.length - 1; i >= 0 && LOOK.has(names[i]); i--) streak++;
  return streak;
}

export function monitorContext(event) {
  if (!LOOK.has(event.tool_name) || !event.transcript_path) return null;
  const streak = lookStreak(toolStats(agentTranscript(event)).names);
  if (streak < STALL_AFTER || streak % STALL_AFTER !== 0) return null;
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `monitor.context: ${streak} consecutive reads and searches with no edit, write or command. State in one sentence why you have not acted yet, then act, or ask the user the one question that is blocking you.`,
    },
  };
}
