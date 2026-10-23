import { hasThresholds, normaliseLine, scansPath, silencedMoves } from "../../../shared/silenced.mjs";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { deny, type PermissionOutput } from "../../output.mts";
import { editTarget, editTexts, quotedList } from "../edit-target.mts";

type SilencedMove = { kind: string; text: string };

const EDIT_TOOLS = ["Write", "Edit"];

async function qualityBar(rel: string, root: string): Promise<Record<string, unknown>> {
  if (!hasThresholds(rel)) return {};
  const { loadConfig } = await import("../../../shared/config.mjs");
  return loadConfig(root).quality;
}

async function unwaived(moves: SilencedMove[], rel: string, root: string): Promise<SilencedMove[]> {
  const { waiversFor } = await import("../../../shared/work/approvals.mts");
  const waived = new Set(waiversFor(root, rel).filter((entry) => !entry.deleted).map((entry) => normaliseLine(entry.text)));
  return moves.filter((move) => !waived.has(move.text));
}

function denyReason(rel: string, moves: SilencedMove[]): string {
  const quoted = quotedList(moves.map(({ kind, text }) => ({ text, label: kind })));
  return `guard.silenced: ${rel} adds ${moves.length} silenced check(s): ${quoted}. Fix the cause. If the user must accept it, propose it on the block's Waivers: line with why.`;
}

export async function guardSilenced(event: PayloadOf<"PreToolUse">, ctx: HookContext): Promise<PermissionOutput | null> {
  const target = editTarget(event, ctx);
  if (!target || !EDIT_TOOLS.includes(event.tool_name ?? "")) return null;
  if (target.outside || !scansPath(target.rel)) return null;
  const moves: SilencedMove[] = silencedMoves({ rel: target.rel, ...editTexts(event, target.abs), bar: await qualityBar(target.rel, ctx.root) });
  if (!moves.length) return null;
  const denied = await unwaived(moves, target.rel, ctx.root);
  return denied.length ? deny(denyReason(target.rel, denied)) : null;
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: guardSilenced,
};
