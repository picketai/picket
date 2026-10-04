import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const input = readJson(0);
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
const agent = String(input.agent_type ?? "").replace(/^.*:/, "");
const stateDir = join(root, ".tether", "state");
mkdirSync(stateDir, { recursive: true });
appendFileSync(join(stateDir, "hook-log.jsonl"), JSON.stringify({ event: input.hook_event_name, agent_type: input.agent_type ?? null, keys: Object.keys(input) }) + "\n");
const configFile = join(root, ".tether", "config.json");
const texts = [];
if (existsSync(configFile)) {
  for (const name of readJson(configFile).extensions ?? []) {
    const dir = join(root, ".tether", "extensions", name);
    const manifest = readJson(join(dir, "extension.json"));
    const rel = manifest.provides?.agents?.[agent];
    if (rel) texts.push(readFileSync(join(dir, rel), "utf8"));
  }
}
if (texts.length) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext: texts.join("\n") } }));
}
