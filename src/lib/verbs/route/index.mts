import { action, done, Refused } from "../../shared/action.mts";
import { bareAgentName } from "../../shared/agent-name.mts";
import { securityPaths } from "../../shared/config.mjs";
import type { Context } from "../../shared/context.mts";
import { VERDICTS } from "../../shared/verdicts.mjs";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { ownGate } from "../../shared/work/gate.mts";
import { hasMarker } from "../../shared/work/markers.mts";
import { readNext, type NextView } from "../../shared/work/next-view.mts";
import { currentPhase, phaseOf, readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import type { VerdictEntry } from "../../shared/work/verdict-log.mts";
import { int, need, str, UsageError, type Args } from "../../util/args.mts";
import { applyChanges } from "./apply.mts";
import { EFFECTS, type Effect, type GateOf, type MarksOnDisk, type PlannedVerdict, type RouteInput } from "./plan.mts";

export type { RouteInput };
export type RouteResult = { id: WorkId; verdict: string; phase: number | null; applied: string[]; next: NextView };

type VerdictSpec = { agent: string; effect: Effect };

const CLASSED_VERDICT = "CHANGES REQUIRED";
const SPECS = VERDICTS as Readonly<Record<string, VerdictSpec>>;

function verdictSpec(verdict: string, agent: string | null): VerdictSpec {
  const spec = Object.hasOwn(SPECS, verdict) ? SPECS[verdict] : undefined;
  if (!spec) throw new Refused(`unknown verdict "${verdict}"; exact tokens: ${Object.keys(SPECS).join(", ")}`);
  if (spec.agent !== agent && !(spec.agent === "user" && agent === "lead")) throw new Refused(`"${verdict}" may only come from ${spec.agent}, not ${agent}`);
  return spec;
}

function verdictRow({ agent, verdict, phase, scope, through, classes }: PlannedVerdict): VerdictEntry {
  const classed = verdict === CLASSED_VERDICT && Array.isArray(classes) && classes.length ? { classes } : {};
  return { agent, verdict, phase, scope: scope ?? null, through: through ?? null, ...classed };
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
  const phase = input.phase ?? currentPhase(snap)?.n ?? null;
  const planned: PlannedVerdict = { ...input, agent: agent ?? input.agent, phase, marks: marksOnDisk(ctx.root, input.id, phase) };
  const changes = EFFECTS[spec.effect](snap, planned, gateOf(ctx.root, snap));
  const applied = applyChanges(ctx.root, snap, changes, { now: ctx.now(), env: ctx.env, session: input.session, row: verdictRow(planned) });
  return { id: input.id, verdict: input.verdict, phase: planned.phase, applied, next: readNext(ctx.root, input.id) };
}

export const routeVerdict = action<RouteInput, RouteResult>(async (input, ctx) => done(route({ ...input, session: input.session ?? ctx.session }, ctx)));

function parseRoute(args: Args): RouteInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("route needs <id> --verdict <TOKEN> --agent <name>");
  return {
    id: workId(id),
    verdict: need(args, "verdict"),
    agent: need(args, "agent"),
    phase: int(args, "phase"),
    scope: str(args, "scope"),
    through: int(args, "through"),
    reason: str(args, "reason"),
    session: str(args, "session"),
  };
}

function renderRoute(v: RouteResult): string {
  return `${v.verdict} applied (${v.applied.join(", ") || "recorded"}) · next: ${v.next.action} by ${v.next.actor ?? "-"}${v.next.phase ? ` · phase ${v.next.phase}` : ""}`;
}

export const verb: VerbSpec<RouteInput, RouteResult> = {
  usage: "route <id> --verdict <TOKEN> --agent <name> [--phase <n>] [--scope <s>] [--through <n>] [--reason <r>] [--session <id>]",
  output: "json",
  parse: parseRoute,
  run: routeVerdict,
  render: renderRoute,
};
