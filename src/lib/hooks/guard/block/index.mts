import { blockLines, readTurn } from "../../../shared/transcript/turn.mts";
import { findVerdict, VERDICTS } from "../../../shared/verdicts.mjs";
import { readHeading, type BlockField } from "../../../shared/work/block.mts";
import type { HookSpec, PayloadOf } from "../../hook-spec.mts";
import { bounce, type BounceOutput } from "../../output.mts";

type StopEvent = "Stop" | "SubagentStop";

const BUDGET = 40;
const FINDING_LINE = /^- \[(Critical|Major|Minor|Nit)\]/;
const RED_FORMS = /^(.+?\bfailed: \S.*|pinned: \S.*|n\/a: \S.*)$/;
const CAUSE_FORM = /\S because \S/;
const FOLDED_FILES = /\+\d+ more/;
const BLOCKED_KINDS = ["data", "configuration", "environment"] as const;
const BLOCKED_FORM = new RegExp(`^blocked: (?:${BLOCKED_KINDS.join("|")}): \\S`);
const PICKET_AGENT = "picket:";
const MISSING_BLOCK = "guard.block: the turn ended without your block. Finish the task and end with your block, or reply in one line why you cannot.";

function turnText(event: PayloadOf<StopEvent>): string {
  try {
    return readTurn(event, { includeToolPayloads: true }).text ?? "";
  } catch {
    return "";
  }
}

function fieldValue(lines: string[], label: BlockField<"phase">): string | null {
  const line = lines.find((l) => l.startsWith(`${label}:`));
  return line === undefined ? null : line.slice(label.length + 1).trim();
}

function filesProblems(lines: string[]): string[] {
  const files = fieldValue(lines, "Files");
  if (files === null || !FOLDED_FILES.test(files)) return [];
  return [`"Files: ${files.slice(0, 60)}" folds paths into "+<n> more"; list every staged path on Files:, since the packet shortens it for display`];
}

function proofProblems(lines: string[]): string[] {
  const problems: string[] = [];
  const red = fieldValue(lines, "Red");
  if (red === null) problems.push('the block has no "Red:" line (Red: <test> failed: <first failure line> | pinned: <test> | n/a: <reason>)');
  else if (!RED_FORMS.test(red)) problems.push(`"Red: ${red.slice(0, 60)}" is none of <test> failed: <first failure line>, pinned: <test>, n/a: <reason>`);
  const cause = fieldValue(lines, "Root cause");
  if (cause === null) problems.push('the block has no "Root cause:" line (Root cause: <X> because <Y> | none)');
  else if (cause !== "none" && !CAUSE_FORM.test(cause)) problems.push(`"Root cause: ${cause.slice(0, 60)}" is neither none nor <X> because <Y>`);
  return [...problems, ...blockedProblems(lines)];
}

function blockedProblems(lines: string[]): string[] {
  const verified = fieldValue(lines, "Verified");
  if (verified === null || !verified.startsWith("blocked") || BLOCKED_FORM.test(verified)) return [];
  return [`"Verified: ${verified.slice(0, 60)}" names no blocked kind; write blocked: <${BLOCKED_KINDS.join(" | ")}>: <what>. A request that needs another shape or route is not a block: send the one that reaches the changed code`];
}

function blockProblems(block: string, isDeveloperBlock: boolean): string[] {
  const { nonEmpty, last } = blockLines(block);
  const problems: string[] = [];
  const token = Object.keys(VERDICTS).find((k) => last.replace(/\s+/g, " ") === k);
  if (!token) problems.push(`the last line must be exactly one verdict token (${Object.keys(VERDICTS).join(", ")}); it is "${last.slice(0, 60)}"`);
  const counted = nonEmpty.filter((l) => !FINDING_LINE.test(l.trim())).length;
  if (counted > BUDGET) problems.push(`the block is ${counted} non-empty lines; the budget is ${BUDGET}. Move detail into the artifact and keep the block to its fields`);
  if (token === "PHASE DONE" && isDeveloperBlock) {
    const lines = nonEmpty.map((l) => l.trim());
    problems.push(...filesProblems(lines), ...proofProblems(lines));
  }
  return problems;
}

function isPicketAgentTurn(event: PayloadOf<StopEvent>): boolean {
  return event.hook_event_name === "SubagentStop" && typeof event.agent_type === "string" && event.agent_type.startsWith(PICKET_AGENT);
}

function missingBlock(event: PayloadOf<StopEvent>, text: string): BounceOutput | null {
  if (!isPicketAgentTurn(event) || findVerdict(blockLines(text).last) !== null) return null;
  return bounce(MISSING_BLOCK);
}

export function guardBlock(event: PayloadOf<StopEvent>): BounceOutput | null {
  if (event.stop_hook_active) return null;
  const text = turnText(event);
  const heading = readHeading(text);
  if (heading === null) return missingBlock(event, text);
  if (heading.kind === "expedited") return null;
  const problems = blockProblems(text.slice(heading.index), heading.kind === "phase");
  return problems.length ? bounce(`guard.block: ${problems.join(". ")}. Re-emit the block only.`) : null;
}

export const hook: HookSpec<StopEvent> = {
  handler: async (event) => guardBlock(event),
};
