import { mkdirSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { picketRole } from "../../../shared/agent-name.mts";
import { blockCommitProblem } from "../../../shared/commit-message.mts";
import { citesOnlyRecord, parseFindings } from "../../../shared/findings.mts";
import { stateDir, statePath, stateRel } from "../../../shared/paths.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { latestHints, type Hints } from "../../../shared/transcript/entries.mts";
import { blockLines, stopText } from "../../../shared/transcript/turn.mts";
import { findVerdict } from "../../../shared/verdicts.mjs";
import { BLOCK_HEADINGS, latestSavedBlock, normalisedBlock, readHeading, saveBlock, type BlockField, type BlockKind, type ReviewScope } from "../../../shared/work/block.mts";
import { workId } from "../../../shared/work/files.mts";
import { setMarker } from "../../../shared/work/markers.mts";
import { saveReview } from "../../../shared/work/reviews.mts";
import { runHandOff } from "../../../shared/work/send.mts";
import { readSnapshot } from "../../../shared/work/snapshot.mts";
import { readVerdicts, type VerdictRow } from "../../../shared/work/verdict-log.mts";
import { route } from "../../../verbs/route/index.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type StopEvent = "Stop" | "SubagentStop";
type BlockInfo = { agent: string; id: string; phase: number | null; scope: ReviewScope | null; index: number };
type Outcome = { text: string; notice: string | null };
type Parties = { agent: string; scope: string | undefined };
type Routing = { event: PayloadOf<StopEvent>; info: BlockInfo | null; hints: Hints; id: string; verdict: string; phase: number | undefined; text: string; ctx: HookContext };

const AGENT_OF: Partial<Record<BlockKind, string>> = { phase: "developer", review: "reviewer", artifact: "architect", report: "analyst" };
const DEVELOPER_VERDICTS = ["PHASE DONE", "PHASE STALLED"];
const WRITTEN: Partial<Record<string, string>> = { "ARTIFACT WRITTEN": "written", AMENDED: "amended", "REPORT WRITTEN": "written" };
const ARTIFACT: BlockField<"artifact"> = "Artifact";
const REPORT: BlockField<"report"> = "Report";
const PATH_FIELD: Partial<Record<string, string>> = { architect: ARTIFACT, analyst: REPORT };
const CLASS_ID = /^[A-Z][A-Za-z]*\d+$/;
const CLASSES: BlockField<"review"> = "Classes";
const CLASSES_LINE = new RegExp(`^${CLASSES}:\\s*(.*)$`, "m");
const AMENDMENT_LINE = /^AMENDMENT NEEDED:.*$/m;
const DRIFT_DECISIONS_LINE = /^Decisions:\s*DRIFT\b.*$/m;

function blockInfo(text: string): BlockInfo | null {
  const heading = readHeading(text);
  const agent = heading ? AGENT_OF[heading.kind] : undefined;
  if (!heading || !agent || (heading.kind === "review" && heading.scope === null)) return null;
  return { agent, id: heading.id, phase: heading.phase, scope: heading.scope, index: heading.index };
}

function withSentScope(info: BlockInfo | null, hints: Hints): BlockInfo | null {
  const sentCheckpoint = info?.agent === "reviewer" && info.scope === "phase" && hints.scope === "checkpoint";
  return sentCheckpoint ? { ...info, scope: "checkpoint", phase: info.phase ?? hints.phase } : info;
}

function keepPullRequestReview(id: string, verdict: string, text: string, root: string): string {
  const name = `${id}.review.md`;
  mkdirSync(stateDir(root), { recursive: true });
  writeFileSync(statePath(root, name), text.trim() + "\n");
  return `picket: ${verdict} recorded for ${id}; block saved to ${stateRel(name)}. Print it verbatim, then offer [p] post to the PR · [d] done.`;
}

export function reviewClasses(text: string): string[] {
  const value = text.match(CLASSES_LINE)?.[1]?.trim() ?? "";
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

function saveReviewerBlock(info: BlockInfo | null, text: string, root: string): void {
  if (info?.agent !== "reviewer" || info.scope === "pr") return;
  try {
    saveReview(root, workId(info.id), info, text);
  } catch {}
}

function repeatsLastRow(root: string, id: string, verdict: string, phase: number | undefined): boolean {
  const last = readVerdicts(root, workId(id)).rows.at(-1);
  return last?.verdict === verdict && (phase === undefined || last.phase === phase);
}

function isRejection(row: VerdictRow): boolean {
  return (row.agent === "user" && row.verdict === "rejected") || (row.agent === "reviewer" && row.verdict === "CHANGES REQUIRED");
}

function repeatsSavedBlock(root: string, info: BlockInfo | null, id: string, phase: number | undefined, text: string): boolean {
  if (info?.agent !== "developer" || phase === undefined) return false;
  const rows = readVerdicts(root, workId(id)).rows;
  const lastDeveloperAt = rows.map((row) => row.agent).lastIndexOf("developer");
  const lastDeveloperRow = rows[lastDeveloperAt];
  if (lastDeveloperRow?.verdict !== "PHASE DONE" || lastDeveloperRow.phase !== phase) return false;
  if (rows.slice(lastDeveloperAt + 1).some(isRejection)) return false;
  return latestSavedBlock(root, workId(id), phase) === normalisedBlock(text);
}

function isBouncedForCommit(info: BlockInfo | null, verdict: string, text: string): boolean {
  return info?.agent === "developer" && verdict === "PHASE DONE" && blockCommitProblem(text.slice(info.index)) !== null;
}

function amendmentText(text: string, agent: string, verdict: string, scope: string | undefined): string | null {
  const needed = text.match(AMENDMENT_LINE)?.[0];
  if (needed) return needed;
  const crosscheckDrift = agent === "reviewer" && verdict === "DRIFT DETECTED" && scope === "crosscheck";
  return crosscheckDrift ? (text.match(DRIFT_DECISIONS_LINE)?.[0] ?? null) : null;
}

function isPlanOnly(info: BlockInfo | null, verdict: string, amend: string | undefined, text: string): boolean {
  if (info?.agent !== "reviewer" || info.scope !== "cumulative" || verdict !== "CHANGES REQUIRED") return false;
  return amend !== undefined && citesOnlyRecord(parseFindings(text), workId(info.id));
}

function partiesOf(event: PayloadOf<StopEvent>, info: BlockInfo | null, hints: Hints, verdict: string): Parties {
  const scope = info?.scope === "phase" ? undefined : (info?.scope ?? (hints.scope && !hints.scope.startsWith("phase") ? hints.scope : undefined));
  const agent = info?.agent ?? (["approved", "rejected"].includes(verdict) ? "user" : (event.agent_type ?? "lead"));
  return { agent, scope };
}

export function repeatsPhaseVerdict(rows: VerdictRow[], incoming: Parties & { verdict: string; phase: number | undefined }): boolean {
  if (incoming.phase === undefined || WRITTEN[incoming.verdict] !== undefined) return false;
  const last = rows.at(-1);
  return last?.agent === incoming.agent && last.verdict === incoming.verdict && last.phase === incoming.phase && (last.scope ?? undefined) === incoming.scope;
}

function alreadyRecorded(id: string, verdict: string, phase: number): string {
  return `picket: ${verdict} for ${id} phase ${phase} is already recorded; the newer block is saved. Run \`picket next ${id}\`.`;
}

function applyVerdict({ event, info, hints, id, verdict, phase, text, ctx }: Routing): string {
  const { agent, scope } = partiesOf(event, info, hints, verdict);
  const amend = amendmentText(text, agent, verdict, scope);
  const unsaved = unsavedBlockNote(info, verdict);
  saveDeveloperBlock(info, id, phase, text, ctx.root);
  saveReviewerBlock(info, text, ctx.root);
  const classes = info?.agent === "reviewer" ? reviewClasses(text) : [];
  const reviewerAmend = info?.agent === "reviewer" ? (amend ?? undefined) : undefined;
  const planOnly = isPlanOnly(info, verdict, reviewerAmend, text);
  const routed = route({ id: workId(id), verdict, agent, phase, scope, reason: amend ?? undefined, amend: reviewerAmend, planOnly, session: event.session_id, classes }, ctx);
  const next = routed.next;
  return `picket: ${verdict} applied to ${id}${phase ? ` phase ${phase}` : ""} (${routed.applied.join(", ") || "recorded"}). Next: ${next.action}${next.actor ? ` by ${next.actor}` : ""}${next.phase ? ` · phase ${next.phase}` : ""}. ${next.detail}${next.options?.length ? ` Options: ${next.options.join(" · ")}` : ""}${amend ? `\n${amend}` : ""}${unsaved}`;
}

function lastHeadingIndex(text: string): number {
  const starts = BLOCK_HEADINGS.flatMap(([, heading]) => [...text.matchAll(new RegExp(heading.source, `${heading.flags}g`))].map((m) => m.index));
  return starts.length ? Math.max(...starts) : 0;
}

function newestBlock(text: string): string {
  return text.slice(lastHeadingIndex(text));
}

function routeTurn(event: PayloadOf<StopEvent>, ctx: HookContext): Outcome | null {
  const text = newestBlock(stopText(event));
  const verdict = findVerdict(blockLines(text).last);
  if (!verdict) return null;
  const hints = latestHints(agentTranscript(event));
  const info = withSentScope(blockInfo(text), hints);
  const id = info?.id ?? hints.work_id;
  if (!id) return null;
  const continued = Boolean(event.stop_hook_active);
  if (info?.scope === "pr") return continued ? null : { text: keepPullRequestReview(id, verdict, text, ctx.root), notice: null };
  const phase = info?.phase ?? hints.phase ?? undefined;
  if (repeatsSavedBlock(ctx.root, info, id, phase, text)) return null;
  if (!continued && isBouncedForCommit(info, verdict, text)) return null;
  if (phase !== undefined && repeatsPhaseVerdict(readVerdicts(ctx.root, workId(id)).rows, { ...partiesOf(event, info, hints, verdict), verdict, phase })) {
    saveDeveloperBlock(info, id, phase, text, ctx.root);
    return continued ? null : { text: alreadyRecorded(id, verdict, phase), notice: null };
  }
  if (continued && repeatsLastRow(ctx.root, id, verdict, phase)) {
    saveDeveloperBlock(info, id, phase, text, ctx.root);
    return null;
  }
  const routed = applyVerdict({ event, info, hints, id, verdict, phase, text, ctx });
  const written = writtenFile(info, verdict, text);
  return { text: written ? `${routed}\n${printPathLine(written.path)}` : routed, notice: written && writtenNotice(written) };
}

type WrittenFile = { path: string; done: string };

function writtenFile(info: BlockInfo | null, verdict: string, text: string): WrittenFile | null {
  const done = WRITTEN[verdict];
  const label = info ? PATH_FIELD[info.agent] : undefined;
  if (!done || !label) return null;
  const path = text.match(new RegExp(`^${label}:\\s*(\\S+)`, "m"))?.[1];
  return path ? { path, done } : null;
}

function writtenNotice({ path, done }: WrittenFile): string {
  return `picket · ${basename(path, ".md")} ${done}: ${path}`;
}

function printPathLine(path: string): string {
  const name = basename(path, ".md");
  return `Print "${name.charAt(0).toUpperCase()}${name.slice(1)}: ${path}" on its own line in your reply so the user can open it.`;
}

function isContinuedDeveloperStop(event: PayloadOf<StopEvent>): boolean {
  return event.hook_event_name === "SubagentStop" && picketRole(event.agent_type) === "developer" && Boolean(event.stop_hook_active);
}

function markIdleHandOff(event: PayloadOf<StopEvent>, ctx: HookContext): void {
  if (!isContinuedDeveloperStop(event)) return;
  const workIdHint = latestHints(agentTranscript(event)).work_id;
  if (!workIdHint) return;
  const id = workId(workIdHint);
  const phase = runHandOff(readSnapshot(ctx.root, id), event.session_id ?? null);
  if (phase !== null) setMarker(ctx.root, id, phase, "idle", ctx.now());
}

function routeOrMarkIdle(event: PayloadOf<StopEvent>, ctx: HookContext): Outcome | null {
  const routed = routeTurn(event, ctx);
  if (routed === null) markIdleHandOff(event, ctx);
  return routed;
}

function outcome(event: PayloadOf<StopEvent>, ctx: HookContext): Outcome | null {
  try {
    return routeOrMarkIdle(event, ctx);
  } catch (err) {
    if (event.stop_hook_active) return null;
    return { text: `picket: verdict not applied (${(err as Error).message}). Run \`picket next <id>\` yourself.`, notice: null };
  }
}

export function routeVerdict(event: PayloadOf<StopEvent>, ctx: HookContext): ContextOutput | null {
  const out = outcome(event, ctx);
  return out ? context(event.hook_event_name, out.text, out.notice) : null;
}

export const hook: HookSpec<StopEvent> = {
  handler: async (event, ctx) => routeVerdict(event, ctx),
};
