import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LINE_CHARS = 50;
const slot = process.argv[2];
const size = Number(process.env[`SPIKE_INJECT_${slot}`] ?? 0);
const input = JSON.parse(readFileSync(0, "utf8"));

function markerText(chars) {
  const end = `Tether marker END-${slot}`;
  const lines = [];
  let used = 0;
  for (let n = 1; used + LINE_CHARS + end.length <= chars; n++) {
    const line = `Tether marker ${slot}-${String(n).padStart(4, "0")} `.padEnd(LINE_CHARS - 1, ".") + "\n";
    lines.push(line);
    used += line.length;
  }
  return lines.join("") + ".".repeat(chars - used - end.length) + end;
}

if (size > 0) {
  const text = markerText(size);
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  const dir = join(root, ".tether", "state");
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, "hook-log.jsonl"), JSON.stringify({ event: input.hook_event_name, slot, chars: text.length, agent_type: input.agent_type ?? null }) + "\n");
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text } }));
}
