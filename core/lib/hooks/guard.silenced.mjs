import { repoRelative } from "../paths.mjs";
import { editTexts } from "../edit-texts.mjs";
import { hasThresholds, normaliseLine, scansPath, silencedMoves } from "../silenced.mjs";

const QUOTED_LIMIT = 3;
const QUOTE_WIDTH = 80;

async function qualityBar(rel, root) {
  if (!hasThresholds(rel)) return {};
  const { loadConfig } = await import("../config.mjs");
  return loadConfig(root).quality;
}

async function unwaived(moves, rel, root) {
  const { waiversFor } = await import("../work.mjs");
  const waived = new Set(waiversFor(rel, root).filter((entry) => !entry.deleted).map((entry) => normaliseLine(entry.text)));
  return moves.filter((move) => !waived.has(move.text));
}

function denyReason(rel, moves) {
  const quoted = moves.slice(0, QUOTED_LIMIT).map((m) => `${m.kind} "${m.text.slice(0, QUOTE_WIDTH)}"`).join("; ");
  const more = moves.length > QUOTED_LIMIT ? ` (+${moves.length - QUOTED_LIMIT} more)` : "";
  return `guard.silenced: ${rel} adds ${moves.length} silenced check(s): ${quoted}${more}. Fix the cause. If the user must accept it, propose it on the block's Waivers: line with why.`;
}

export async function guardSilenced(event) {
  const filePath = event.tool_input?.file_path;
  if (!filePath || !["Write", "Edit"].includes(event.tool_name)) return null;
  const { root, abs, rel, outside } = repoRelative(event, filePath);
  if (outside || !scansPath(rel)) return null;
  const moves = silencedMoves({ rel, ...editTexts(event, abs), bar: await qualityBar(rel, root) });
  if (!moves.length) return null;
  const denied = await unwaived(moves, rel, root);
  if (!denied.length) return null;
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: denyReason(rel, denied) } };
}
