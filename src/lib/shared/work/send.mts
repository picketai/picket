import { createHash } from "node:crypto";
import type { AgentType, NextView, SendView } from "../views.mts";
import { briefLines } from "./brief.mts";
import { workRel, type WorkFile } from "./files.mts";
import type { NextStep } from "./next-step.mts";
import { freshReplies } from "./replies.mts";
import { phaseOf, type WorkSnapshot } from "./snapshot.mts";
import { ARTIFACT_BY_LANE } from "./state.mts";
import type { VerdictRow } from "./verdict-log.mts";

export type HasFile = (name: WorkFile) => boolean;

type Instance = { to: string; type: AgentType; owns: (row: VerdictRow) => boolean };
type Role = { type: AgentType; owns: (row: VerdictRow) => boolean };

const FRESH_REVIEW = "You are reviewing a change you did not write. You have no context beyond what is below.";
const TAG_LENGTH = 4;
const FIRST_LETTER = "a".charCodeAt(0);

const isReviewer = (row: VerdictRow) => row.agent === "reviewer";

const ROLES = {
  analyst: { type: "picket:analyst", owns: (row) => row.agent === "analyst" },
  architect: { type: "picket:architect", owns: (row) => row.agent === "architect" },
  reviewer: { type: "picket:reviewer", owns: (row) => isReviewer(row) && row.scope !== "cumulative" },
  "cumulative-reviewer": { type: "picket:reviewer", owns: (row) => isReviewer(row) && row.scope === "cumulative" },
} satisfies Record<string, Role>;

export const NO_FILES: HasFile = () => false;

export function instanceTag(id: string): string {
  const digits = createHash("sha256").update(id).digest("hex").slice(0, TAG_LENGTH);
  return [...digits].map((digit) => String.fromCharCode(FIRST_LETTER + parseInt(digit, 16))).join("");
}

function instance(snap: WorkSnapshot, role: keyof typeof ROLES): Instance {
  return { to: `${instanceTag(snap.state.id)}-${role}`, ...ROLES[role] };
}

export function developerName(snap: WorkSnapshot): string {
  const fresh = freshReplies(snap.replies).length;
  const name = `${instanceTag(snap.state.id)}-developer`;
  return fresh === 0 ? name : `${name}-${1 + fresh}`;
}

function developer(snap: WorkSnapshot): Instance {
  const since = freshReplies(snap.replies).at(-1)?.ts;
  const isCurrent = (row: VerdictRow) => since === undefined || Date.parse(row.ts) > Date.parse(since);
  return { to: developerName(snap), type: "picket:developer", owns: (row) => row.agent === "developer" && isCurrent(row) };
}

function isLive(snap: WorkSnapshot, instance: Instance, session: string | null): boolean {
  return session !== null && snap.verdicts.some((row) => row.session === session && instance.owns(row));
}

function send(snap: WorkSnapshot, instance: Instance, session: string | null, lines: (tool: SendView["tool"]) => string[], extra: Partial<SendView> = {}): SendView {
  const tool = isLive(snap, instance, session) ? "SendMessage" : "Agent";
  return { tool, to: instance.to, type: instance.type, ...extra, message: lines(tool).join("\n") };
}

export function messageTo(snap: WorkSnapshot, role: "developer" | "architect", session: string | null, lines: string[]): SendView {
  const target = role === "developer" ? developer(snap) : instance(snap, "architect");
  return send(snap, target, session, () => lines);
}

function itemFile(snap: WorkSnapshot, name: string): string {
  return `${workRel(snap.state.id)}${name}`;
}

function workLine(snap: WorkSnapshot): string {
  return `work: ${snap.state.id}`;
}

function artifactLine(snap: WorkSnapshot): string {
  return `artifact: ${itemFile(snap, ARTIFACT_BY_LANE[snap.state.lane] ?? "")}`;
}

function requestLine(snap: WorkSnapshot): string {
  return `request: ${itemFile(snap, "request.md")}`;
}

const ARCHITECT_INPUTS: readonly (readonly [string, WorkFile])[] = [
  ["preflight", "preflight.txt"],
  ["sources", "sources.yaml"],
];

function architectSend(snap: WorkSnapshot, session: string | null, hasFile: HasFile): SendView {
  const optional = ARCHITECT_INPUTS.filter(([, name]) => hasFile(name)).map(([key, name]) => `${key}: ${itemFile(snap, name)}`);
  return send(snap, instance(snap, "architect"), session, () => [workLine(snap), `lane: ${snap.state.lane}`, requestLine(snap), ...briefLines(snap.brief), ...optional]);
}

function analystSend(snap: WorkSnapshot, session: string | null): SendView {
  return send(snap, instance(snap, "analyst"), session, () => [workLine(snap), requestLine(snap), ...briefLines(snap.brief), "pass: outline"]);
}

function needsCrosscheck(snap: WorkSnapshot): boolean {
  return snap.state.lane === "design" && !phaseOf(snap, 1)?.done && !snap.verdicts.some((row) => isReviewer(row) && row.scope === "crosscheck");
}

function implementSends(snap: WorkSnapshot, phase: number, session: string | null): SendView[] {
  const through = snap.state.run_through;
  const implementer = send(snap, developer(snap), session, (tool) => [
    workLine(snap),
    `phase: ${phase}`,
    ...(tool === "Agent" ? [artifactLine(snap)] : []),
    ...(through !== undefined && through >= phase ? [`run through ${through}`] : []),
  ]);
  if (!needsCrosscheck(snap)) return [implementer];
  return [implementer, send(snap, instance(snap, "reviewer"), session, () => [workLine(snap), "scope: crosscheck", artifactLine(snap)])];
}

function recheckSend(snap: WorkSnapshot, delta: readonly string[], session: string | null): SendView {
  const deltaLines = delta.length ? [`delta: ${delta.join(", ")}`] : [];
  return send(snap, instance(snap, "reviewer"), session, () => [workLine(snap), "scope: crosscheck", artifactLine(snap), ...deltaLines]);
}

function summaryLines(snap: WorkSnapshot): string[] {
  return [`summary: ${itemFile(snap, "summary.json")}`];
}

function saveSummary(snap: WorkSnapshot): string {
  return `picket summary ${snap.state.id} --save`;
}

function checkpointSend(snap: WorkSnapshot, phase: number, session: string | null): SendView {
  return send(snap, instance(snap, "reviewer"), session, () => [workLine(snap), "scope: checkpoint", `phase: ${phase}`, ...summaryLines(snap)], { first: [saveSummary(snap)] });
}

function cumulativeSend(snap: WorkSnapshot, session: string | null): SendView {
  const reviewer = instance(snap, "cumulative-reviewer");
  const reviewed = snap.verdicts.some(reviewer.owns);
  const first = [...(reviewed ? [] : [`picket mutate ${snap.state.id}`]), saveSummary(snap)];
  return send(snap, reviewer, session, (tool) => [...(tool === "Agent" ? [FRESH_REVIEW] : []), workLine(snap), "scope: cumulative", ...summaryLines(snap)], { model: "opus", first });
}

function renderSend(s: SendView): string {
  const heading = `${s.tool} ${s.to} · ${s.type}${s.model ? ` · model ${s.model}` : ""}`;
  return [heading, ...(s.first ?? []).map((command) => `first: ${command}`), "```text", s.message, "```"].join("\n");
}

export function renderSends(sends: readonly SendView[]): string {
  return sends.map(renderSend).join("\n\n");
}

export function renderNextStep(v: Omit<NextView, "send">, sends: readonly SendView[]): string {
  const line = `${v.action} · ${v.actor ?? "-"}${v.phase ? ` · phase ${v.phase}` : ""} · ${v.detail}${v.options.length ? ` · ${v.options.join(" · ")}` : ""}`;
  return sends.length ? `${line}\n\n${renderSends(sends)}` : line;
}

export function sendsFor(snap: WorkSnapshot, step: NextStep, session: string | null, hasFile: HasFile = NO_FILES): SendView[] {
  switch (step.action) {
    case "write_artifact":
      return [step.actor === "analyst" ? analystSend(snap, session) : architectSend(snap, session, hasFile)];
    case "implement_phase":
      return implementSends(snap, step.phase, session);
    case "review_checkpoint":
      return [checkpointSend(snap, step.phase, session)];
    case "review_cumulative":
      return [cumulativeSend(snap, session)];
    case "fix_findings":
      return [send(snap, developer(snap), session, (tool) => [workLine(snap), `review: ${itemFile(snap, "reviews/cumulative.md")}`, ...(tool === "Agent" ? [artifactLine(snap)] : [])])];
    case "amend":
      return [send(snap, instance(snap, "architect"), session, () => [workLine(snap), `amend: ${step.detail}`])];
    case "review_crosscheck":
      return [recheckSend(snap, step.delta, session)];
    default:
      return [];
  }
}
