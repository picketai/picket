#!/usr/bin/env node
// PostToolUse on every tool: the stall detector. Six consecutive look-around calls (Read, Grep, Glob)
// with no Edit, Write or Bash between them is analysis paralysis; the hook says so once, then again
// every six more. Constants, not adjectives. Never blocks.
import { readFileSync } from "node:fs";
import { toolStats, agentTranscript } from "./lib/transcript.mjs";

const STALL_AFTER = 6;
const LOOK = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (!LOOK.has(data.tool_name) || !data.transcript_path) process.exit(0);

try {
  const names = toolStats(agentTranscript(data)).names; // the streak is this agent's, not the session's
  let streak = 0;
  for (let i = names.length - 1; i >= 0 && LOOK.has(names[i]); i--) streak++;
  if (streak >= STALL_AFTER && streak % STALL_AFTER === 0) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `monitor.context: ${streak} consecutive reads and searches with no edit, write or command. State in one sentence why you have not acted yet, then act, or ask the user the one question that is blocking you.`,
        },
      }),
    );
  }
} catch {}
process.exit(0);
