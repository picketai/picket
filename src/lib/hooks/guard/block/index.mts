import { picketRole, type AgentRole } from "../../../shared/agent-name.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { latestHints } from "../../../shared/transcript/entries.mts";
import { blockLines, stopText } from "../../../shared/transcript/turn.mts";
import { findVerdict, VERDICTS } from "../../../shared/verdicts.mjs";
import { blockCommitProblem } from "../../../shared/commit-message.mts";
import { blockField, parseBlock, readHeading, type Block, type BlockField, type BlockHeading } from "../../../shared/work/block.mts";
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
const CROSSCHECK_TOKENS = ["ALIGNED", "DRIFT DETECTED"];
const ALL_TOKENS = Object.keys(VERDICTS);

function turnText(event: PayloadOf<StopEvent>): string {
  try {
    return stopText(event) ?? "";
  } catch {
    return "";
  }
}

function sentScope(event: PayloadOf<StopEvent>): string | null {
  try {
    return latestHints(agentTranscript(event)).scope;
  } catch {
    return null;
  }
}

function isCrosscheck(event: PayloadOf<StopEvent>, heading: BlockHeading | null): boolean {
  const scope = heading?.kind === "review" && heading.scope !== null ? heading.scope : sentScope(event);
  return scope === "crosscheck";
}

function agentRole(event: PayloadOf<StopEvent>): AgentRole | null {
  return event.hook_event_name === "SubagentStop" ? picketRole(event.agent_type) : null;
}

function expectedTokens(event: PayloadOf<StopEvent>, heading: BlockHeading | null): string[] {
  const role = agentRole(event);
  if (role === null) return ALL_TOKENS;
  const tokens = ALL_TOKENS.filter((token) => VERDICTS[token as keyof typeof VERDICTS].agent === role);
  if (role !== "reviewer") return tokens;
  const crosscheck = isCrosscheck(event, heading);
  return tokens.filter((token) => CROSSCHECK_TOKENS.includes(token) === crosscheck);
}

function tokenList(tokens: string[]): string {
  return tokens.length === 2 ? tokens.join(" or ") : tokens.join(", ");
}

function fieldValue(block: Block, label: BlockField<"phase">): string | null {
  return blockField(block, label) ?? null;
}

function filesProblems(block: Block): string[] {
  const files = fieldValue(block, "Files");
  if (files === null || !FOLDED_FILES.test(files)) return [];
  return [`"Files: ${files.slice(0, 60)}" folds paths into "+<n> more"; list every staged path on Files:, since the packet shortens it for display`];
}

function proofProblems(block: Block): string[] {
  const problems: string[] = [];
  const red = fieldValue(block, "Red");
  if (red === null) problems.push('the block has no "Red:" line (Red: <test> failed: <first failure line> | pinned: <test> | n/a: <reason>)');
  else if (!RED_FORMS.test(red)) problems.push(`"Red: ${red.slice(0, 60)}" is none of <test> failed: <first failure line>, pinned: <test>, n/a: <reason>`);
  const cause = fieldValue(block, "Root cause");
  if (cause === null) problems.push('the block has no "Root cause:" line (Root cause: <X> because <Y> | none)');
  else if (cause !== "none" && !CAUSE_FORM.test(cause)) problems.push(`"Root cause: ${cause.slice(0, 60)}" is neither none nor <X> because <Y>`);
  return [...problems, ...blockedProblems(block)];
}

function blockedProblems(block: Block): string[] {
  const verified = fieldValue(block, "Verified");
  if (verified === null || !verified.startsWith("blocked") || BLOCKED_FORM.test(verified)) return [];
  return [`"Verified: ${verified.slice(0, 60)}" names no blocked kind; write blocked: <${BLOCKED_KINDS.join(" | ")}>: <what>. A request that needs another shape or route is not a block: send the one that reaches the changed code`];
}

function blockProblems(block: string, isDeveloperBlock: boolean, expected: () => string[]): string[] {
  const { nonEmpty, last } = blockLines(block);
  const problems: string[] = [];
  const token = ALL_TOKENS.find((k) => last.replace(/\s+/g, " ") === k);
  if (!token) problems.push(`the last line must be exactly one verdict token (${tokenList(expected())}); it is "${last.slice(0, 60)}"`);
  const counted = nonEmpty.filter((l) => !FINDING_LINE.test(l.trim())).length;
  if (counted > BUDGET) problems.push(`the block is ${counted} non-empty lines; the budget is ${BUDGET}. Move detail into the artifact and keep the block to its fields`);
  if (token === "PHASE DONE" && isDeveloperBlock) {
    const parsed = parseBlock(block);
    const commit = blockCommitProblem(block);
    problems.push(...filesProblems(parsed), ...proofProblems(parsed), ...(commit === null ? [] : [commit]));
  }
  return problems;
}

function missingBlock(event: PayloadOf<StopEvent>, text: string): BounceOutput | null {
  if (agentRole(event) === null || findVerdict(blockLines(text).last) !== null) return null;
  const tokens = tokenList(expectedTokens(event, null));
  return bounce(`guard.block: the turn ended without your block. Finish the task and end with your block, its last line ${tokens}, or reply in one line why you cannot.`);
}

export function guardBlock(event: PayloadOf<StopEvent>): BounceOutput | null {
  if (event.stop_hook_active) return null;
  const text = turnText(event);
  const heading = readHeading(text);
  if (heading === null) return missingBlock(event, text);
  if (heading.kind === "expedited") return null;
  const problems = blockProblems(text.slice(heading.index), heading.kind === "phase", () => expectedTokens(event, heading));
  return problems.length ? bounce(`guard.block: ${problems.join(". ")}. Re-emit the block only.`) : null;
}

export const hook: HookSpec<StopEvent> = {
  handler: async (event) => guardBlock(event),
};
