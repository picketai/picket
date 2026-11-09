import { Refused } from "../action.mts";
import { bareAgentName } from "../agent-name.mts";
import { securityPaths } from "../config.mjs";
import type { Context } from "../context.mts";
import { VERDICTS } from "../verdicts.mjs";
import { recordDigest } from "../work/amendment.mts";
import type { WorkId } from "../work/files.mts";
import { ownGate } from "../work/gate.mts";
import { hasMarker } from "../work/markers.mts";
import { readNext, type NextView } from "../work/next-view.mts";
import { reviewRel } from "../work/reviews.mts";
import { currentPhase, phaseOf, readSnapshot, type WorkSnapshot } from "../work/snapshot.mts";
import { isSessionId } from "../work/state.mts";
import type { VerdictEntry } from "../work/verdict-log.mts";
import { applyChanges } from "./apply.mts";
import { EFFECTS, type Change, type Effect, type GateOf, type MarksOnDisk, type PlannedVerdict, type RouteInput } from "./plan.mts";

export type { RouteInput };
export type RouteResult = { id: WorkId; verdict: string; phase: number | null; applied: string[]; next: NextView };

type VerdictSpec = { agent: string; effect: Effect };

const CLASSED_VERDICT = "CHANGES REQUIRED";
const AMENDED = "AMENDED";
const SPECS = VERDICTS as Readonly<Record<string, VerdictSpec>>;

function verdictSpec(verdict: string, agent: string | null): VerdictSpec {
  const spec = Object.hasOwn(SPECS, verdict) ? SPECS[verdict] : undefined;
  if (!spec) throw new Refused(`unknown verdict "${verdict}"; exact tokens: ${Object.keys(SPECS).join(", ")}`);
  if (spec.agent !== agent && !(spec.agent === "user" && agent === "lead")) throw new Refused(`"${verdict}" may only come from ${spec.agent}, not ${agent}`);
  return spec;
}

function publishedTo(changes: Change[]): { published?: string } {
  const change = changes.find((c) => c.kind === "publish");
  return change?.kind === "publish" ? { published: change.to } : {};
}

function verdictRow({ agent, verdict, phase, scope, through, classes, session, amend, planOnly, record }: PlannedVerdict, changes: Change[]): VerdictEntry {
  const classed = verdict === CLASSED_VERDICT && Array.isArray(classes) && classes.length ? { classes } : {};
  const sessioned = isSessionId(session) ? { session } : {};
  const amending = amend ? { amend } : {};
  const planned = planOnly === true ? { plan_only: true as const } : {};
  const recorded = record ? { record } : {};
  return { agent, verdict, phase, scope: scope ?? null, through: through ?? null, ...classed, ...sessioned, ...amending, ...planned, ...recorded, ...publishedTo(changes) };
}

function stampedRecord(amend: string | undefined, verdict: string, snap: WorkSnapshot): { record?: string } {
  if (!snap.artifact || !(amend || verdict === AMENDED)) return {};
  return { record: recordDigest(snap.artifact.body) };
}

function refuseMisplacedPublish({ publish, verdict }: RouteInput, { effect }: VerdictSpec, snap: WorkSnapshot): void {
  if (!publish) return;
  if (snap.state.lane !== "research") throw new Refused(`--publish is for a research item; ${snap.state.id} is in the ${snap.state.lane} lane`);
  if (effect !== "phase_approved") throw new Refused(`--publish goes with --verdict approved, not ${verdict}`);
}

function rowAmend({ id, amend, reason, scope }: RouteInput, { effect }: VerdictSpec): string | undefined {
  if (amend || effect !== "drift" || scope !== "crosscheck") return amend;
  return reason || `AMENDMENT NEEDED: see ${reviewRel(id, "crosscheck", null)}`;
}

function gateOf(root: string, snap: WorkSnapshot): GateOf {
  return (n) => ownGate(phaseOf(snap, n), securityPaths(root));
}

function marksOnDisk(root: string, id: WorkId, phase: number | null): MarksOnDisk {
  if (phase === null) return { done: false, approved: false };
  return { done: hasMarker(root, id, phase, "done"), approved: hasMarker(root, id, phase, "approved") };
}

export function route(input: RouteInput, ctx: Context): RouteResult {
  const agent = bareAgentName(input.agent);
  const spec = verdictSpec(input.verdict, agent);
  const snap = readSnapshot(ctx.root, input.id);
  refuseMisplacedPublish(input, spec, snap);
  const phase = input.phase ?? currentPhase(snap)?.n ?? null;
  const amend = rowAmend(input, spec);
  const planned: PlannedVerdict = { ...input, agent: agent ?? input.agent, amend, phase, marks: marksOnDisk(ctx.root, input.id, phase), ...stampedRecord(amend, input.verdict, snap) };
  const changes = EFFECTS[spec.effect](snap, planned, gateOf(ctx.root, snap));
  const applied = applyChanges(ctx.root, snap, changes, { now: ctx.now(), env: ctx.env, session: input.session, row: verdictRow(planned, changes) });
  return { id: input.id, verdict: input.verdict, phase: planned.phase, applied, next: readNext(ctx.root, input.id, isSessionId(input.session) ? input.session : null) };
}
