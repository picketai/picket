import { Refused } from "../action.mts";
import { bareAgentName } from "../agent-name.mts";
import { securityPaths } from "../config.mjs";
import type { Context } from "../context.mts";
import { TESTER_VERDICTS, VERDICTS } from "../verdicts.mjs";
import { deriveVerdict } from "../testing/derive.mts";
import { testFacts } from "../testing/facts.mts";
import { frameDigest, namedChecks, recordDigest } from "../work/amendment.mts";
import type { WorkId } from "../work/files.mts";
import { readDriveLog, type DriveRow } from "../drive-log.mts";
import { carriedResults, phaseCheckProblems, phaseCheckResults } from "../work/declared-checks.mts";
import { checkGate, ownGate, type RunChecks } from "../work/gate.mts";
import { hasMarker } from "../work/markers.mts";
import { readNext, type NextView } from "../work/next-view.mts";
import { reviewRel } from "../work/reviews.mts";
import { currentPhase, phaseOf, readSnapshot, type WorkSnapshot } from "../work/snapshot.mts";
import { isSessionId } from "../work/state.mts";
import type { VerdictEntry } from "../work/verdict-log.mts";
import { applyChanges } from "./apply.mts";
import { readCandidates } from "../scenarios/keep.mts";
import { EFFECTS, type Change, type CorrectionsOf, type Effect, type GateOf, type KeepsOf, type MarksOnDisk, type PlannedVerdict, type RouteInput, type TestedRound, type TestStamp } from "./plan.mts";

export type { RouteInput };
export type RouteResult = { id: WorkId; verdict: string; phase: number | null; applied: string[]; next: NextView };

type VerdictSpec = { agent: string; effect: Effect };

const CLASSED_VERDICT = "CHANGES REQUIRED";
const AMENDED = "AMENDED";
const PHASE_DONE = "PHASE DONE";
const SPECS = VERDICTS as Readonly<Record<string, VerdictSpec>>;
const TESTER = "tester";
const TEST_SCOPE = "test";
const TESTER_SPECS = TESTER_VERDICTS as Readonly<Record<string, Effect>>;

function testerSpec(verdict: string, spec: VerdictSpec): VerdictSpec {
  if (!Object.hasOwn(TESTER_SPECS, verdict)) throw new Refused(`"${verdict}" may only come from ${spec.agent}, not ${TESTER}`);
  return { agent: TESTER, effect: TESTER_SPECS[verdict] };
}

function verdictSpec(verdict: string, agent: string | null): VerdictSpec {
  const spec = Object.hasOwn(SPECS, verdict) ? SPECS[verdict] : undefined;
  if (!spec) throw new Refused(`unknown verdict "${verdict}"; exact tokens: ${Object.keys(SPECS).join(", ")}`);
  if (agent === TESTER) return testerSpec(verdict, spec);
  if (spec.agent !== agent && !(spec.agent === "user" && agent === "lead")) throw new Refused(`"${verdict}" may only come from ${spec.agent}, not ${agent}`);
  return spec;
}

function publishedTo(changes: Change[]): { published?: string } {
  const change = changes.find((c) => c.kind === "publish");
  return change?.kind === "publish" ? { published: change.to } : {};
}

function testFields(test: TestStamp | undefined): Partial<VerdictEntry> {
  if (test === undefined) return {};
  return { round: test.round, ...(test.route === null ? {} : { test_route: test.route }), ...(test.replayRun === null ? {} : { replay_run: test.replayRun }) };
}

function testedRound(root: string, snap: WorkSnapshot, verdict: string): TestedRound {
  const input = testFacts(root, snap);
  const derived = deriveVerdict(input);
  const [unclassified] = derived.unclassified;
  if (unclassified !== undefined) {
    throw new Refused(`unclassified: ${derived.unclassified.join(", ")}; run picket test classify ${snap.state.id} ${unclassified} <product|test|environment> --evidence "<why>"`);
  }
  if (derived.verdict !== verdict) {
    throw new Refused(`the recorded results derive ${derived.verdict} (${derived.reasons[0] ?? "every tested criterion has a passed case"}); end the block with ${derived.verdict}`);
  }
  return { input, derived };
}

function testPlan(tested: TestedRound | undefined): Pick<PlannedVerdict, "scope" | "phase" | "test"> | null {
  if (tested === undefined) return null;
  const { input, derived } = tested;
  return { scope: TEST_SCOPE, phase: null, test: { round: input.round, route: derived.route, replayRun: input.replay.run } };
}

function verdictRow({ agent, verdict, phase, scope, through, classes, session, amend, blocking, planOnly, record, frame, test }: PlannedVerdict, changes: Change[]): VerdictEntry {
  const classed = verdict === CLASSED_VERDICT && Array.isArray(classes) && classes.length ? { classes } : {};
  const sessioned = isSessionId(session) ? { session } : {};
  const amending = amend ? { amend } : {};
  const blocked = blocking ? { blocking } : {};
  const planned = planOnly === true ? { plan_only: true as const } : {};
  const stamped = record ? { record, ...(frame ? { frame } : {}) } : {};
  return { agent, verdict, phase, scope: scope ?? null, through: through ?? null, ...classed, ...sessioned, ...amending, ...blocked, ...planned, ...stamped, ...publishedTo(changes), ...testFields(test) };
}

function askedAmend(amend: string | undefined, snap: WorkSnapshot): string {
  return amend ?? snap.verdicts.filter((row) => Boolean(row.amend)).at(-1)?.amend ?? "";
}

function amendmentStamps(amend: string | undefined, verdict: string, snap: WorkSnapshot): { record?: string; frame?: string } {
  if (!snap.artifact || !(amend || verdict === AMENDED)) return {};
  const named = namedChecks(snap.phases, askedAmend(amend, snap));
  return { record: recordDigest(snap.artifact.body), frame: frameDigest(snap.phases, named) };
}

function grantStamp({ verdict, phase }: PlannedVerdict, changes: Change[], snap: WorkSnapshot): { through?: number } {
  if (verdict !== PHASE_DONE) return {};
  const approved = changes.some((change) => change.kind === "marker" && change.mark === "approved" && change.phase === phase);
  return { through: approved ? snap.state.run_through : undefined };
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

function gateOf(root: string, snap: WorkSnapshot, rows: DriveRow[]): GateOf {
  const runChecks = (n: number): RunChecks => ({
    own: phaseCheckResults(snap, rows, n) ?? [],
    carried: carriedResults(snap, rows, n),
    endsRun: n === snap.state.run_through,
    problems: phaseCheckProblems(snap, n),
  });
  return (n) => ownGate(phaseOf(snap, n), securityPaths(root)) ?? checkGate(runChecks(n));
}

function correctionsOf(snap: WorkSnapshot, rows: DriveRow[]): CorrectionsOf {
  const ownPrefixes = (n: number) => (phaseCheckResults(snap, rows, n) ?? []).filter((result) => result.outcome === "prefix");
  return (n) => [...carriedResults(snap, rows, n), ...ownPrefixes(n)];
}

function keepsOf(root: string, id: WorkId): KeepsOf {
  return (n) => (readCandidates(root, id)[String(n)] ?? []).filter((candidate) => candidate.outcome === "passed");
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
  const tested = spec.effect === "tested" ? testedRound(ctx.root, snap, input.verdict) : undefined;
  const planned: PlannedVerdict = { ...input, agent: agent ?? input.agent, amend, phase, marks: marksOnDisk(ctx.root, input.id, phase), ...amendmentStamps(amend, input.verdict, snap), ...testPlan(tested) };
  const { rows } = readDriveLog(ctx.root);
  const changes = EFFECTS[spec.effect](snap, planned, gateOf(ctx.root, snap, rows), { correctionsOf: correctionsOf(snap, rows), keepsOf: keepsOf(ctx.root, input.id), tested });
  const applied = applyChanges(ctx.root, snap, changes, { now: ctx.now(), env: ctx.env, session: input.session, row: verdictRow({ ...planned, ...grantStamp(planned, changes, snap) }, changes) });
  return { id: input.id, verdict: input.verdict, phase: planned.phase, applied, next: readNext(ctx.root, input.id, isSessionId(input.session) ? input.session : null) };
}
