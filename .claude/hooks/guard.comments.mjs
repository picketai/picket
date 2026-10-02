#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { repoRelative } from "./lib/project-root.mjs";
import { LANGS, addedComments, extOf, normalise } from "../lib/comments.mjs";

const QUOTED_LIMIT = 3;
const QUOTE_WIDTH = 80;

function editedFile(current, { old_string: from = "", new_string: to = "", replace_all: all }) {
  if (!from || !current.includes(from)) return { before: from, after: to };
  return { before: current, after: all ? current.split(from).join(to) : current.replace(from, () => to) };
}

function editTexts(data, abs) {
  const input = data.tool_input;
  const current = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  if (data.tool_name === "Edit") return editedFile(current, input);
  return { before: current, after: input.content ?? "" };
}

async function unapproved(added, rel, root) {
  const { approvedCommentsFor } = await import("../lib/work.mjs");
  const approved = new Set(approvedCommentsFor(rel, root).flatMap((entry) => String(entry.text).split(/\r?\n/).map(normalise)));
  return added.filter((body) => !approved.has(body));
}

function denyReason(rel, bodies) {
  const quoted = bodies.slice(0, QUOTED_LIMIT).map((b) => `"${b.slice(0, QUOTE_WIDTH)}"`).join("; ");
  const more = bodies.length > QUOTED_LIMIT ? ` (+${bodies.length - QUOTED_LIMIT} more)` : "";
  return `guard.comments: ${rel} adds ${bodies.length} comment line(s): ${quoted}${more}. Code carries the meaning: remove the comment. A why for a specific value or condition goes on the block's Comments: line for the user to decide.`;
}

async function main() {
  const data = JSON.parse(readFileSync(0, "utf8"));
  const filePath = data.tool_input?.file_path;
  if (!filePath || !["Write", "Edit"].includes(data.tool_name)) return;
  const { root, abs, rel, outside } = repoRelative(data, filePath);
  const ext = extOf(rel);
  if (outside || !LANGS[ext]) return;
  const added = addedComments({ ext, ...editTexts(data, abs) });
  if (!added.length) return;
  const denied = await unapproved(added, rel, root);
  if (!denied.length) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: denyReason(rel, denied) } }));
}

main().catch(() => {});
