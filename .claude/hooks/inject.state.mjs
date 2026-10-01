#!/usr/bin/env node
// SessionStart: the smallest useful context. Open work items with their next action (so a new
// session resumes from disk, not from memory), and the project glossary when one exists.
// Fails silently: a missing line here costs a `harness list`, not a contract.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, listWork, deriveState } from "../lib/work.mjs";
import { next } from "../lib/next.mjs";
import { loadConfig } from "../lib/config.mjs";

let data = {};
try {
  data = JSON.parse(readFileSync(0, "utf8"));
} catch {}

const parts = [];
try {
  const root = projectRoot(data.cwd);
  const open = listWork(root)
    .map((id) => deriveState(id, root))
    .filter((s) => s.status === "open" || s.status === "blocked");
  if (open.length) {
    const lines = open.slice(0, 8).map((s) => {
      const n = next(s.id, root);
      return `- ${s.id} · ${s.lane} · ${s.status}${s.phase_count ? ` · phases ${s.phases_approved}/${s.phase_count}` : ""} · next: ${n.action}${n.actor ? ` by ${n.actor}` : ""}${n.phase ? ` (phase ${n.phase})` : ""}`;
    });
    parts.push(`# Open work items\n${lines.join("\n")}${open.length > 8 ? `\n- and ${open.length - 8} more (harness list)` : ""}\nResume with /resuming <id>; never re-derive state from the conversation.`);
  }
  // Existence only, no git process: this hook runs at every session start, inside the cold budget.
  const { sources } = loadConfig(root);
  if (sources.length) {
    const lines = sources.map((s) => `- ${s.name}: ${s.root ?? `unreachable (${s.reason})`} · read-only; use harness source find|grep and the snapshots`);
    parts.push(`# Sources\n${lines.join("\n")}`);
  }
  const memory = join(root, ".claude", "MEMORY.md");
  if (existsSync(memory)) {
    const text = readFileSync(memory, "utf8").trim();
    if (text) parts.push(`# Project glossary and decisions (.claude/MEMORY.md)\n${text.slice(0, 6000)}`);
  }
} catch {}

if (parts.length) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: parts.join("\n\n") } }));
process.exit(0);
