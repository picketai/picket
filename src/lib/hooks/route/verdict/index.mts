import { mkdirSync, writeFileSync } from "node:fs";
import { stateDir, statePath, stateRel } from "../../../shared/paths.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { latestHints, type Hints } from "../../../shared/transcript/entries.mts";
import { blockLines, readTurn } from "../../../shared/transcript/turn.mts";
import { findVerdict } from "../../../shared/verdicts.mjs";
import { readHeading, saveBlock, type BlockKind, type ReviewScope } from "../../../shared/work/block.mts";
import { workId } from "../../../shared/work/files.mts";
import { route } from "../../../verbs/route/index.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type StopEvent = "Stop" | "SubagentStop";
type BlockInfo = { agent: string; id: string; phase: number | null; scope: ReviewScope | null };
type Routing = { event: PayloadOf<StopEvent>; info: BlockInfo | null; hints: Hints; id: string; verdict: string; text: string; ctx: HookContext };

const AGENT_OF: Partial<Record<BlockKind, string>> = { phase: "developer", review: "reviewer", artifact: "architect", report: "analyst" };
const DEVELOPER_VERDICTS = ["PHASE DONE", "PHASE STALLED"];
const CLASS_ID = /^[A-Z][A-Za-z]*\d+$/;

function blockInfo(text: string): BlockInfo | null {
  const heading = readHeading(text);
  const agent = heading ? AGENT_OF[heading.kind] : undefined;
  if (!heading || !agent || (heading.kind === "review" && heading.scope === null)) return null;
  return { agent, id: heading.id, phase: heading.phase, scope: heading.scope };
}

function keepPullRequestReview(id: string, verdict: string, text: string, root: string): string {
  const name = `${id}.review.md`;
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, name), text.trim() + "\n");
  return `picket: ${verdict} recorded for ${id}; block saved to ${stateRel(name)}. Print it verbatim, then offer [p] post to the PR · [d] done.`;
}

export function reviewClasses(text: string): string[] {
  const value = text.match(/^Classes:\s*(.*)$/m)?.[1]?.trim() ?? "";
  if (/^none$/i.test(value)) return [];
  return [...new Set(value.split(/[\s,]+/).filter((id) => CLASS_ID.test(id)))];
}

function unsavedBlockNote(info: BlockInfo | null, verdict: string): string {
  if (info || !DEVELOPER_VERDICTS.includes(verdict)) return "";
  return "\nBlock not saved: it has no `## Phase <n> of <id>: <title>` heading, so the gate packet shows \"not reported\". Re-emit the block in the developer contract shape.";
}

function saveDeveloperBlock(info: BlockInfo | null, id: string, phase: number | undefined, text: string, root: string): void {
  if (info?.agent !== "developer" || phase == null) return;
  try {
    saveBlock(root, workId(id), phase, text);
  } catch {}
}

function applyVerdict({ event, info, hints, id, verdict, text, ctx }: Routing): string {
  const scope = info?.scope === "phase" ? undefined : (info?.scope ?? (hints.scope && !hints.scope.startsWith("phase") ? hints.scope : undefined));
  const phase = info?.phase ?? hints.phase ?? undefined;
  const agent = info?.agent ?? (["approved", "rejected"].includes(verdict) ? "user" : (event.agent_type ?? "lead"));
  const amend = text.match(/^AMENDMENT NEEDED:.*$/m)?.[0] ?? null;
  const unsaved = unsavedBlockNote(info, verdict);
  saveDeveloperBlock(info, id, phase, text, ctx.root);
  const classes = info?.agent === "reviewer" ? reviewClasses(text) : [];
  const routed = route({ id: workId(id), verdict, agent, phase, scope, reason: amend ?? undefined, session: event.session_id, classes }, ctx);
  const next = routed.next;
  return `picket: ${verdict} applied to ${id}${phase ? ` phase ${phase}` : ""} (${routed.applied.join(", ") || "recorded"}). Next: ${next.action}${next.actor ? ` by ${next.actor}` : ""}${next.phase ? ` · phase ${next.phase}` : ""}. ${next.detail}${next.options?.length ? ` Options: ${next.options.join(" · ")}` : ""}${amend ? `\n${amend}` : ""}${unsaved}`;
}

function routeTurn(event: PayloadOf<StopEvent>, ctx: HookContext): string | null {
  const { text } = readTurn(event, { includeToolPayloads: true });
  const verdict = findVerdict(blockLines(text).last);
  if (!verdict) return null;
  const info = blockInfo(text);
  const hints = latestHints(agentTranscript(event));
  const id = info?.id ?? hints.work_id;
  if (!id) return null;
  if (info?.scope === "pr") return keepPullRequestReview(id, verdict, text, ctx.root);
  return applyVerdict({ event, info, hints, id, verdict, text, ctx });
}

function outcome(event: PayloadOf<StopEvent>, ctx: HookContext): string | null {
  try {
    return routeTurn(event, ctx);
  } catch (err) {
    return `picket: verdict not applied (${(err as Error).message}). Run \`picket next <id>\` yourself.`;
  }
}

export function routeVerdict(event: PayloadOf<StopEvent>, ctx: HookContext): ContextOutput | null {
  if (event.stop_hook_active) return null;
  const out = outcome(event, ctx);
  return out ? context(event.hook_event_name, out) : null;
}

export const hook: HookSpec<StopEvent> = {
  handler: async (event, ctx) => routeVerdict(event, ctx),
};
