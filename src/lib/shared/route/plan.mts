import { Refused } from "../action.mts";
import { documentRel, documentSlug } from "../document-path.mts";
import { workRel, type WorkId } from "../work/files.mts";
import type { Candidate } from "../scenarios/keep.mts";
import type { CheckResult } from "../work/declared-checks.mts";
import type { Gate } from "../work/gate.mts";
import type { PhaseMark } from "../work/markers.mts";
import type { WorkSnapshot } from "../work/snapshot.mts";
import { amendmentsAnsweringBlocks, newestBlockRow, STALL_REPEATS } from "../work/stall.mts";
import { ARTIFACT_BY_LANE, type WorkState } from "../work/state.mts";
import { isUnchangedAmendment } from "../work/amendment.mts";
import type { Derived, DeriveInput, TestRoute } from "../testing/derive.mts";
import { renderReport } from "../testing/report.mts";

export type Effect = "phase_done" | "phase_approved" | "phase_reviewed" | "rejection" | "drift" | "stall" | "crosscheck_ok" | "artifact" | "amended" | "tested";

export type RouteInput = {
  id: WorkId;
  verdict: string;
  agent: string;
  phase?: number;
  scope?: string;
  through?: number;
  reason?: string;
  amend?: string;
  blocking?: string[];
  planOnly?: boolean;
  session?: string | null;
  classes?: string[];
  publish?: boolean;
};

export type MarksOnDisk = { done: boolean; approved: boolean };
export type TestStamp = { round: number; route: TestRoute | null; replayRun: string | null };
export type PlannedVerdict = Omit<RouteInput, "phase"> & { phase: number | null; marks: MarksOnDisk; record?: string; frame?: string; test?: TestStamp };
export type TestedRound = { input: DeriveInput; derived: Derived };

export type Change =
  | { kind: "marker"; phase: number; mark: PhaseMark; line: string | null }
  | { kind: "state"; set?: Partial<WorkState>; unset?: (keyof WorkState)[]; line: string | null }
  | { kind: "note"; line: string }
  | { kind: "commit"; phase: number }
  | { kind: "publish"; from: string; to: string; line: string }
  | { kind: "correct"; phase: number; index: number; covers: string; from: string; to: string; line: string }
  | { kind: "keep"; phase: number; candidates: Candidate[]; line: string | null }
  | { kind: "test_report"; text: string; line: string }
  | { kind: "commit_fixes"; line: null };

export type GateOf = (n: number) => Gate | null;
export type CorrectionsOf = (n: number) => CheckResult[];
export type KeepsOf = (n: number) => Candidate[];
export type Lookups = { correctionsOf?: CorrectionsOf; keepsOf?: KeepsOf; tested?: TestedRound };

const NO_CORRECTIONS: CorrectionsOf = () => [];
const TEST_SCOPE = "test";
const NO_KEEPS: KeepsOf = () => [];

type Plan = (snap: WorkSnapshot, planned: PlannedVerdict, gateOf: GateOf, lookups?: Lookups) => Change[];

function keepChanges(n: number, keepsOf: KeepsOf): Change[] {
  const candidates = keepsOf(n);
  return candidates.length ? [{ kind: "keep", phase: n, candidates, line: null }] : [];
}

function needPhase({ phase, verdict }: PlannedVerdict): number {
  if (phase === null) throw new Refused(`${verdict} needs a phase`);
  return phase;
}

function marker(phase: number, mark: PhaseMark, line: string | null = `phases/${phase}.${mark}`): Change {
  return { kind: "marker", phase, mark, line };
}

function runGrantChanges(snap: WorkSnapshot, n: number, marks: MarksOnDisk, gateOf: GateOf, keepsOf: KeepsOf): Change[] {
  const through = snap.state.run_through;
  if (!through || n > through || marks.approved) return [];
  const gate = gateOf(n);
  if (gate) return [{ kind: "state", unset: ["run_through"], line: `run grant stops here: phase ${n} ${gate.reason}; it takes its own approval` }];
  return [marker(n, "approved", `phases/${n}.approved (run grant through ${through})`), ...keepChanges(n, keepsOf), { kind: "commit", phase: n }];
}

function stallAnsweredChanges(snap: WorkSnapshot, n: number): Change[] {
  const block = newestBlockRow(snap.verdicts);
  if (snap.state.status !== "blocked" || block?.verdict !== "PHASE STALLED" || block.phase !== n) return [];
  return [{ kind: "state", set: { status: "open" }, unset: ["blocked_reason"], line: `status=open (phase ${n} done after its stall)` }];
}

const phaseDone: Plan = (snap, planned, gateOf, { keepsOf = NO_KEEPS } = {}) => {
  const n = needPhase(planned);
  return [marker(n, "done"), ...stallAnsweredChanges(snap, n), ...runGrantChanges(snap, n, planned.marks, gateOf, keepsOf)];
};

function publishChange({ state, artifact }: WorkSnapshot): Change {
  if (!artifact) throw new Refused(`${state.id} has no research.md to publish`);
  if (documentSlug("report", state.title) === null) throw new Refused(`the title "${state.title}" leaves no word for a report name; rename the item with picket set ${state.id} --title`);
  const from = `${workRel(state.id)}research.md`;
  const to = documentRel("report", { subject: state.title });
  return { kind: "publish", from, to, line: `published ${from} to ${to}` };
}

function correctChange(result: CheckResult, approvedPhase: number): Change[] {
  const { check, ran } = result;
  if (!("path" in check) || !ran || !("path" in ran)) return [];
  const line = `${check.covers} check path ${check.path} corrected to ${ran.path}; approved with phase ${approvedPhase}`;
  return [{ kind: "correct", phase: result.phase, index: result.index, covers: check.covers, from: check.path, to: ran.path, line }];
}

const phaseApproved: Plan = (snap, planned, _gateOf, { correctionsOf = NO_CORRECTIONS, keepsOf = NO_KEEPS } = {}) => {
  if (snap.state.lane === "research") return planned.publish ? [publishChange(snap)] : [];
  if (planned.scope === TEST_SCOPE) return [{ kind: "commit_fixes", line: null }];
  const n = needPhase(planned);
  if (!planned.marks.done) throw new Refused(`phase ${n} is not done; cannot approve`);
  const grant: Change[] = planned.through && planned.through > n ? [{ kind: "state", set: { run_through: planned.through }, line: `run_through=${planned.through}` }] : [];
  const corrections = correctionsOf(n).flatMap((result) => correctChange(result, n));
  return [marker(n, "approved"), ...grant, ...corrections, ...keepChanges(n, keepsOf), { kind: "commit", phase: n }];
};

const phaseReviewed: Plan = (snap, { phase, scope }) => {
  if (scope === "cumulative") {
    const unreviewed = snap.phases.filter((p) => !p.reviewed).map((p) => marker(p.n, "reviewed", null));
    return [...unreviewed, { kind: "note", line: "all phases reviewed" }];
  }
  return phase === null ? [] : [marker(phase, "reviewed")];
};

const rejection: Plan = () => [{ kind: "state", unset: ["run_through"], line: "run grant cleared" }];

const blocked: Plan = (_snap, { reason, verdict, phase }) => {
  const why = reason ?? `${verdict} on phase ${phase ?? "?"}`;
  return [{ kind: "state", set: { status: "blocked", blocked_reason: why }, line: `status=blocked (${why})` }];
};

const unchanged: Plan = () => [];

function reopenChanges(snap: WorkSnapshot): Change[] {
  if (snap.state.status !== "blocked") return [];
  if (newestBlockRow(snap.verdicts)?.verdict === "PHASE STALLED") return [{ kind: "note", line: "status stays blocked: the developer's stall waits for the user" }];
  const answering = amendmentsAnsweringBlocks([...snap.verdicts, { verdict: "AMENDED" }]).length;
  if (answering >= STALL_REPEATS) return [];
  return [{ kind: "state", set: { status: "open" }, unset: ["blocked_reason"], line: "status=open (amended)" }];
}

function unchangedNote(snap: WorkSnapshot, { record }: PlannedVerdict): Change[] {
  if (!isUnchangedAmendment(snap.verdicts, record)) return [];
  return [{ kind: "note", line: `${ARTIFACT_BY_LANE[snap.state.lane]} unchanged since the amendment was asked` }];
}

const amended: Plan = (snap, planned) => [...unchangedNote(snap, planned), ...reopenChanges(snap)];

const tested: Plan = (snap, { verdict }, _gateOf, { tested: round } = {}) => {
  if (round === undefined) throw new Refused(`a tester ${verdict} needs the recorded results of its round`);
  const { input, derived } = round;
  const id = snap.state.id;
  const text = renderReport({ id, round: input.round, derived, rows: input.rows, criteria: input.criteria });
  const routed = derived.route === null ? "" : ` (route ${derived.route})`;
  return [
    { kind: "test_report", text, line: `${workRel(id)}test.md written` },
    { kind: "note", line: `test round ${input.round}: ${verdict}${routed}` },
  ];
};

export const EFFECTS: Record<Effect, Plan> = {
  phase_done: phaseDone,
  phase_approved: phaseApproved,
  phase_reviewed: phaseReviewed,
  rejection,
  drift: blocked,
  stall: blocked,
  crosscheck_ok: unchanged,
  artifact: unchanged,
  amended,
  tested,
};
