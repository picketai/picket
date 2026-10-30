import type { DecisionCounts } from "../../shared/work/artifact.mts";
import { workRel } from "../../shared/work/files.mts";
import type { LeftEntry } from "../../shared/work/left.mts";
import type { ReportFindings } from "../../shared/work/report.mts";
import { ARTIFACT_BY_LANE, type Lane } from "../../shared/work/state.mts";
import type { CloseResult, Closing, Repeat } from "./close.mts";

const HEADING: Readonly<Record<Lane, string>> = { fast: "Expedited", order: "Order", design: "Design", research: "Research" };
const SEPARATOR = " · ";

function commitLine({ commit, message }: CloseResult): string {
  return `Commit: ${commit ? `${commit} ${message}` : "nothing to commit"}`;
}

function decisionsPart({ count, amended }: DecisionCounts): string {
  return `decisions: ${count}${amended ? ` (${amended} amended)` : ""}`;
}

function strategicPart(ids: readonly string[]): string | null {
  return ids.length ? `strategic review: ${ids.join(", ")}` : null;
}

function phasesLine({ phases, decisions, commits, review, strategic }: Closing): string {
  const parts = [`Phases: ${phases}`, decisions && decisionsPart(decisions), commits && `commits ${commits.first}..${commits.last}`, review && `review: ${review}`, strategicPart(strategic)];
  return parts.filter(Boolean).join(SEPARATOR);
}

function reportLine(v: CloseResult, report: ReportFindings | null): string | null {
  if (!report) return null;
  const flagged = report.architect_review.length ? report.architect_review.join(", ") : "no";
  const parts = [`Report: ${workRel(v.id)}${ARTIFACT_BY_LANE.research}`, `findings: ${report.findings}`, `architect review: ${flagged}`, strategicPart(v.closing.strategic)];
  return parts.filter(Boolean).join(SEPARATOR);
}

function laneLine(v: CloseResult): string | null {
  if (v.lane === "fast") return commitLine(v);
  if (v.lane === "research") return reportLine(v, v.closing.report);
  return phasesLine(v.closing);
}

function leftForYou({ command, why }: LeftEntry): string {
  return `Left for you: ${command}${why ? ` (${why})` : ""}`;
}

function worktreesLeft({ branch, worktrees }: CloseResult): string | null {
  if (!worktrees.length) return null;
  return `Left for you: /picket:branching --remove ${branch ?? "<branch>"} (worktrees: ${worktrees.join(", ")})`;
}

function warningLines(v: CloseResult): string[] {
  const dirty = v.dirty.length ? [`uncommitted changes: ${v.dirty.join(", ")} (commit them or \`git checkout -- <path>\`)`] : [];
  return [...v.warnings, ...dirty].map((warning) => `WARNING: ${warning}`);
}

function followUp({ class: cls, items }: Repeat): string {
  return `Follow-up: Fix the ${cls} mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in ${items.join(", ")} rejected.`;
}

export function closingBlock(v: CloseResult): string {
  const lines = [
    `## ${HEADING[v.lane]} closed: ${v.id}`,
    laneLine(v),
    v.closing.questions && `Questions: ${v.closing.questions}`,
    ...v.repeats.map((r) => `Repeats: ${r.class} (${r.items.join(", ")})`),
    ...v.left.map(leftForYou),
    worktreesLeft(v),
    v.left_staged.length ? `Left staged: ${v.left_staged.join(", ")}` : null,
    ...warningLines(v),
    ...v.repeats.map(followUp),
  ];
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}
