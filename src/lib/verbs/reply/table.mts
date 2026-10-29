import type { NextStep } from "../../shared/work/next-step.mts";
import type { Lane } from "../../shared/work/state.mts";

export type Proposals = { comments: string[]; waivers: string[] };

export type Matched =
  | { kind: "approve"; through?: number }
  | { kind: "reject"; why: string }
  | { kind: "keep"; n: number }
  | { kind: "waive"; n: number }
  | { kind: "continue" }
  | { kind: "redesign" }
  | { kind: "abandon" }
  | { kind: "publish" };

type Form = { pattern: RegExp; letter: string | null; match: (m: RegExpMatchArray, step: NextStep, proposals: Proposals) => Matched | null };

export const GATE_ACTIONS: readonly NextStep["action"][] = ["approve_phase", "resolve_block", "resolve_rejections"];

const OPTION_LETTER = /^\[(\w)\]/;
const RUN_LIMIT = /^\[r\] run through (\d+)/;

function offered(step: NextStep, letter: string): boolean {
  return "options" in step && step.options.some((option) => option.match(OPTION_LETTER)?.[1] === letter);
}

function runLimit(step: NextStep): number | null {
  if (!("options" in step)) return null;
  const limit = step.options.map((option) => option.match(RUN_LIMIT)?.[1]).find((m) => m !== undefined);
  return limit === undefined ? null : Number(limit);
}

function runThrough(m: RegExpMatchArray, step: NextStep): Matched | null {
  const through = Number(m[1]);
  const limit = runLimit(step);
  const phase = "phase" in step ? step.phase : 0;
  return limit !== null && through > phase && through <= limit ? { kind: "approve", through } : null;
}

function numbered(kind: "keep" | "waive", count: number, m: RegExpMatchArray): Matched | null {
  const n = Number(m[1]);
  return n >= 1 && n <= count ? { kind, n } : null;
}

const APPROVE_FORMS: readonly Form[] = [
  { pattern: /^(?:a|approved|ok|yes)$/i, letter: "a", match: () => ({ kind: "approve" }) },
  { pattern: /^(?:i|confirm)$/i, letter: "i", match: () => ({ kind: "approve" }) },
  { pattern: /^(?:r|approved through|run to)\s+(\d+)$/i, letter: "r", match: (m, step) => runThrough(m, step) },
  { pattern: /^(?:x|reject:)\s+(\S.*)$/i, letter: "x", match: (m) => ({ kind: "reject", why: m[1].trim() }) },
  { pattern: /^(?:k|keep)\s+(\d+)$/i, letter: null, match: (m, _step, { comments }) => numbered("keep", comments.length, m) },
  { pattern: /^(?:w|waive)\s+(\d+)$/i, letter: null, match: (m, _step, { waivers }) => numbered("waive", waivers.length, m) },
];

const BLOCK_FORMS: readonly Form[] = [
  { pattern: /^(?:c|continue)$/i, letter: "c", match: () => ({ kind: "continue" }) },
  { pattern: /^(?:d|redesign)$/i, letter: "d", match: () => ({ kind: "redesign" }) },
  { pattern: /^(?:x|abandon)$/i, letter: "x", match: () => ({ kind: "abandon" }) },
];

export const PUBLISH_REPLY = /^(?:p|publish)$/i;

const RESEARCH_FORMS: readonly Form[] = [{ pattern: PUBLISH_REPLY, letter: "p", match: () => ({ kind: "publish" }) }];

function formsFor(step: NextStep, lane: Lane): readonly Form[] {
  if (lane === "research") return step.action === "approve_phase" ? RESEARCH_FORMS : [];
  if (step.action === "approve_phase") return APPROVE_FORMS;
  return step.action === "resolve_block" || step.action === "resolve_rejections" ? BLOCK_FORMS : [];
}

export function matchReply(reply: string, step: NextStep, proposals: Proposals, lane: Lane): Matched | null {
  const text = reply.trim();
  for (const form of formsFor(step, lane)) {
    const m = text.match(form.pattern);
    if (!m || (form.letter !== null && !offered(step, form.letter))) continue;
    const matched = form.match(m, step, proposals);
    if (matched) return matched;
  }
  return null;
}
