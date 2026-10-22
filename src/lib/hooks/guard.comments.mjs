import { repoRelative } from "../paths.mjs";
import { LANGS, addedComments, extOf, normalise } from "../comments.mjs";
import { editTexts } from "../edit-texts.mjs";

const QUOTED_LIMIT = 3;
const QUOTE_WIDTH = 80;

async function unapproved(added, rel, root) {
  const { approvedCommentsFor } = await import("../work.mjs");
  const approved = new Set(approvedCommentsFor(rel, root).flatMap((entry) => String(entry.text).split(/\r?\n/).map(normalise)));
  return added.filter((body) => !approved.has(body));
}

function denyReason(rel, bodies) {
  const quoted = bodies.slice(0, QUOTED_LIMIT).map((b) => `"${b.slice(0, QUOTE_WIDTH)}"`).join("; ");
  const more = bodies.length > QUOTED_LIMIT ? ` (+${bodies.length - QUOTED_LIMIT} more)` : "";
  return `guard.comments: ${rel} adds ${bodies.length} comment line(s): ${quoted}${more}. Code carries the meaning: remove the comment. A why for a specific value or condition goes on the block's Comments: line for the user to decide.`;
}

export async function guardComments(event) {
  const filePath = event.tool_input?.file_path;
  if (!filePath || !["Write", "Edit"].includes(event.tool_name)) return null;
  const { root, abs, rel, outside } = repoRelative(event, filePath);
  const ext = extOf(rel);
  if (outside || !LANGS[ext]) return null;
  const added = addedComments({ ext, ...editTexts(event, abs) });
  if (!added.length) return null;
  const denied = await unapproved(added, rel, root);
  if (!denied.length) return null;
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: denyReason(rel, denied) } };
}
