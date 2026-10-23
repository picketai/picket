import { LANGS, addedComments, extOf, normalise } from "../../../shared/comments.mjs";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { deny, type PermissionOutput } from "../../output.mts";
import { editTarget, editTexts, quotedList } from "../edit-target.mts";

const EDIT_TOOLS = ["Write", "Edit"];

async function unapproved(added: string[], rel: string, root: string): Promise<string[]> {
  const { approvedCommentsFor } = await import("../../../shared/work/approvals.mts");
  const approved = new Set(approvedCommentsFor(root, rel).flatMap((entry) => String(entry.text).split(/\r?\n/).map(normalise)));
  return added.filter((body) => !approved.has(body));
}

function denyReason(rel: string, bodies: string[]): string {
  const quoted = quotedList(bodies.map((text) => ({ text })));
  return `guard.comments: ${rel} adds ${bodies.length} comment line(s): ${quoted}. Code carries the meaning: remove the comment. A why for a specific value or condition goes on the block's Comments: line for the user to decide.`;
}

export async function guardComments(event: PayloadOf<"PreToolUse">, ctx: HookContext): Promise<PermissionOutput | null> {
  const target = editTarget(event, ctx);
  if (!target || !EDIT_TOOLS.includes(event.tool_name ?? "")) return null;
  const ext: string = extOf(target.rel);
  if (target.outside || !Object.hasOwn(LANGS, ext)) return null;
  const added: string[] = addedComments({ ext, ...editTexts(event, target.abs) });
  if (!added.length) return null;
  const denied = await unapproved(added, target.rel, ctx.root);
  return denied.length ? deny(denyReason(target.rel, denied)) : null;
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: guardComments,
};
