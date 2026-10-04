#!/usr/bin/env node
// PostToolUse on Bash: record what actually ran, classified drive (boots or exercises the app) or
// inspect, tagged with the open work item and its current phase, so `harness verify` can check a
// developer's "Verified:" claim against evidence the developer cannot write. Never blocks.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isDriveCommand } from "./lib/drive-evidence.mjs";
import { projectRoot, listWork, deriveState } from "../lib/work.mjs";

let data;
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const cmd = data.tool_input?.command;
if (typeof cmd !== "string" || !cmd.trim()) process.exit(0);
try {
  const root = projectRoot(data.cwd);
  let work_id = null;
  let phase = null;
  for (const id of listWork(root).reverse()) {
    const s = deriveState(id, root);
    if (s.status === "open") {
      work_id = id;
      phase = s.current_phase;
      break;
    }
  }
  const dir = join(root, ".claude", "ledger");
  mkdirSync(dir, { recursive: true });
  appendFileSync(
    join(dir, "drive-log.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      session: data.session_id ?? null,
      agent: data.agent_type ?? null,
      // Kernel calls are bookkeeping, never evidence; `harness drive` writes its own evidence row.
      kind: /\bharness\.mjs\b/.test(cmd) ? "inspect" : isDriveCommand(cmd) ? "drive" : "inspect",
      command: cmd.replace(/\s+/g, " ").slice(0, 200),
      work_id,
      phase,
    }) + "\n",
  );
} catch {}
process.exit(0);
