#!/usr/bin/env node
// Status line, two shapes.
//   default    `<lane> · <id> · phase a/b · next: <action> · ctx 41% · $1.20 · cache 93% · Opus 5`
//   --widget   `<lane> · <short id> · phase a/b · next: <action>` and nothing more, because
//              ccstatusline renders context, cost, cache and model better than we can, and an
//              empty segment is hidden rather than printed.
// Reads Claude Code's status-line JSON on stdin and the newest open work item from disk.
// Wired through ccstatusline's custom-command widget (see .claude/ccstatusline.json):
//   "statusLine": { "command": "npx -y ccstatusline@latest --config .claude/ccstatusline.json" }
// Standalone, with no ccstatusline in the picture, still works:
//   "statusLine": { "command": "node .claude/bin/statusline.mjs" }
import { readFileSync } from "node:fs";
import { projectRoot, listWork, deriveState } from "../lib/work.mjs";
import { next } from "../lib/next.mjs";

const widget = process.argv.includes("--widget");

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {}

// A work id carries a YYYYMMDD- prefix that costs 9 columns and says nothing at a glance:
// `20260914-ccstatusline-renders-the-harness-line` becomes `ccstatusline-renders-t…`.
function shortId(id) {
  const bare = id.replace(/^\d{8}-/, "");
  return bare.length > 24 ? `${bare.slice(0, 23)}…` : bare;
}

const parts = [];
try {
  const root = projectRoot(input.cwd ?? input.workspace?.current_dir);
  const open = listWork(root)
    .map((id) => deriveState(id, root))
    .filter((s) => s.status === "open" || s.status === "blocked")
    .sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
  if (open.length) {
    const s = open[0];
    const n = next(s.id, root);
    parts.push(s.lane, widget ? shortId(s.id) : s.id, s.phase_count ? `phase ${s.phases_approved}/${s.phase_count}` : null, `next: ${n.action}${n.actor ? ` (${n.actor})` : ""}`);
    if (open.length > 1) parts.push(`+${open.length - 1} open`);
  } else if (!widget) parts.push("no open work");
} catch {
  if (!widget) parts.push("harness: no work dir");
}

// The generic half is ours only when nothing better is rendering it.
if (!widget) {
  const ctx = input.context_window;
  if (ctx?.used_percentage != null) parts.push(`ctx ${Math.round(ctx.used_percentage)}%`);
  else if (ctx?.used_tokens && ctx?.context_window_size) parts.push(`ctx ${Math.round((ctx.used_tokens / ctx.context_window_size) * 100)}%`);
  if (input.cost?.total_cost_usd != null) parts.push(`$${input.cost.total_cost_usd.toFixed(2)}`);
  if (input.prompt_cache?.hit_ratio != null) parts.push(`cache ${Math.round(input.prompt_cache.hit_ratio * 100)}%`);
  if (input.model?.display_name) parts.push(input.model.display_name);
}

process.stdout.write(parts.filter(Boolean).join(" · "));
