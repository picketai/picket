import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const input = JSON.parse(readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;

const lastLine = (text) => String(text ?? "").trim().split(/\r?\n/).pop() ?? "";
const verdict = JSON.parse(
  execFileSync("node", [join(here, "..", "bin", "tether.mjs"), "find-verdict", "--text", lastLine(input.last_assistant_message)], {
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  }),
).verdict;

const dir = join(root, ".tether", "state");
mkdirSync(dir, { recursive: true });
appendFileSync(
  join(dir, "hook-log.jsonl"),
  JSON.stringify({ event: input.hook_event_name, agent_type: input.agent_type ?? null, effort: input.effort ?? null, verdict, transcript_path: input.transcript_path ?? null, agent_transcript_path: input.agent_transcript_path ?? null, keys: Object.keys(input) }) + "\n",
);
