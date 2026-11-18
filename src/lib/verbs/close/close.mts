import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Refused } from "../../shared/action.mts";
import { machineCheck, readModelJson, type EngineRunner } from "../../shared/env/engine.mts";
import { readModel, type EnvModel } from "../../shared/env/model.mts";
import { foreignClaim, purgeStack, type Resources } from "../../shared/env/purge.mts";
import { readStacks } from "../../shared/env/stacks.mts";
import { COMPOSE_FILE, ENV_DIR, itemKey, stackName } from "../../shared/env/standard.mts";
import { dropItemChecks } from "../../shared/check-log.mts";
import { isBlamed } from "../../shared/scenarios/compare.mts";
import { listScenarios } from "../../shared/scenarios/files.mts";
import { changedSinceReplay, keyId, workingKey } from "../../shared/scenarios/keys.mts";
import { itemMocks, latestRun, readResults, type ResultRow, type RunRow, type ScenarioRow } from "../../shared/scenarios/results.mts";
import { listMocks, realService } from "../../shared/mocks/definition.mts";
import { checkCommitMessage, SUBJECT_LIMIT } from "../../shared/commit-message.mts";
import { securityPaths } from "../../shared/config.mjs";
import { commitOwned, dirtyPaths, filesInCommit, isRepo, lastCommitOf, listedPathMatcher, repoPrefix, stagedFiles, type CommitResult } from "../../shared/git.mts";
import { appendLedger, readLedger, recordAccept } from "../../shared/ledger.mts";
import { decisionCounts, deferredCriteria, phasePaths, strategicReviewIds, type DecisionCounts, type Deferral } from "../../shared/work/artifact.mts";
import { blockFiles } from "../../shared/work/block.mts";
import { workFile, workRel, type WorkId } from "../../shared/work/files.mts";
import { readLeft, type LeftEntry } from "../../shared/work/left.mts";
import { nextOf, type NextView } from "../../shared/work/next-view.mts";
import { reportFindings, type ReportFindings } from "../../shared/work/report.mts";
import { reviewQuestions } from "../../shared/work/reviews.mts";
import { readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { listWork, writeState, type Lane, type WorkState } from "../../shared/work/state.mts";
import { readVerdicts, type VerdictRow } from "../../shared/work/verdict-log.mts";
import { restoreKept, type KeptFiles } from "../../shared/scenarios/keep.mts";
import { testedCriteria } from "../../shared/testing/derive.mts";
import { keepFinalCases, notProven, type KeptCases } from "../../shared/testing/keep-cases.mts";
import { roundCounts } from "../../shared/testing/report.mts";
import { latestCases, readTestRows, roundRows, testRound, type TestRow } from "../../shared/testing/results.mts";
import { testApplies } from "../../shared/work/test-stage.mts";
import { auditLine } from "./audit.mts";

export type Repeat = { class: string; items: WorkId[] };
export type CloseOptions = { message?: string; touched?: string[] };
export type CloseContext = { now: Date; env: NodeJS.ProcessEnv; cwd: string; runner: EngineRunner };
export type EnvironmentRemoval = { removed: Resources | null; warning: string | null };
export type CommitRange = { first: string; last: string };
export type Closing = {
  audit: string;
  phases: number;
  commits: CommitRange | null;
  decisions: DecisionCounts | null;
  review: string | null;
  questions: string | null;
  deferred: Deferral[];
  report: ReportFindings | null;
  strategic: string[];
  tested: string | null;
  unproved: string[];
  kept: string[];
};
export type CloseResult = WorkState & {
  commit: string | null;
  message: string;
  committed: string[];
  left_staged: string[];
  warnings: string[];
  dirty: string[];
  left: LeftEntry[];
  repeats: Repeat[];
  closing: Closing;
  worktrees: string[];
  environment: EnvironmentRemoval | null;
};

const PHASED_LANES: readonly Lane[] = ["order", "design"];
const CLASSED_VERDICT = "CHANGES REQUIRED";
const MIN_REPEATS = 2;

const CLOSE_PREFIX = "chore: close ";
const TITLE_ROOM = SUBJECT_LIMIT - CLOSE_PREFIX.length;

const UPPERCASE_LETTER = /\p{Lu}/u;

function startsWithAcronym(chars: string[]): boolean {
  return chars.length > 1 && UPPERCASE_LETTER.test(chars[1]);
}

function lowercasedFirstLetter(title: string): string {
  const chars = [...title];
  if (!chars.length || startsWithAcronym(chars)) return title;
  return chars[0].toLowerCase() + chars.slice(1).join("");
}

function shortenedTitle(title: string): string {
  const chars = [...title];
  if (chars.length <= TITLE_ROOM) return chars.join("");
  const head = chars.slice(0, TITLE_ROOM).join("");
  const lastSpace = head.lastIndexOf(" ");
  return (lastSpace > 0 ? head.slice(0, lastSpace) : head).trimEnd();
}

export function defaultCloseMessage(title: string): string {
  return CLOSE_PREFIX + shortenedTitle(lowercasedFirstLetter(title.trim()));
}

function checkedCloseMessage(message: string | undefined, { id, title, status }: WorkState): string {
  const checked = checkCommitMessage(message ?? defaultCloseMessage(title));
  if ("problem" in checked) throw new Refused(`${checked.problem}; ${id} stays ${status}`, { id });
  return checked.message;
}

function itemOwner(root: string, snap: WorkSnapshot, touched: string[]): (path: string) => boolean {
  const id = snap.state.id;
  const phases = PHASED_LANES.includes(snap.state.lane) ? snap.phases : [];
  const phaseLists = phases.flatMap((p) => [...phasePaths(p), ...blockFiles(root, id, p.n)]);
  return listedPathMatcher(root, [workRel(id), ...phaseLists, ...touched]);
}

function refuseUntouchedFastClose(root: string, { id, lane }: WorkState, touched: string[]): void {
  if (lane !== "fast" || touched.length) return;
  const own = `${repoPrefix(root)}${workRel(id)}`;
  const foreign = stagedFiles(root).filter((path) => !path.startsWith(own));
  if (foreign.length) throw new Refused(`staged paths outside ${own}: ${foreign.join(", ")}; pass --touched <p1,p2> to commit them with the close, or unstage them`, { id });
}

function hasActiveScenario(root: string): boolean {
  return existsSync(join(root, ENV_DIR, COMPOSE_FILE)) && listScenarios(root).some((scenario) => scenario.card?.header.status === "active");
}

function blamedResults(rows: ScenarioRow[], run: string): ResultRow[] {
  return rows.filter((row): row is ResultRow => row.type === "result" && row.run === run && isBlamed(row.class));
}

function workingModel(root: string, { env, cwd, runner }: CloseContext): EnvModel | string {
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) return machine.missing[0]?.split(":")[0] ?? "no container engine";
  try {
    return readModel(readModelJson(engine, root));
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

function refuseStaleAffectedRun(root: string, snap: WorkSnapshot, run: RunRow, closeCtx: CloseContext): void {
  const id = snap.state.id;
  const replay = `run picket env replay ${id} --affected`;
  const model = workingModel(root, closeCtx);
  if (typeof model === "string") throw new Refused(`the affected replay cannot be checked against the working tree: ${model}; ${replay}`, { id });
  if (run.key === keyId(workingKey(root, snap.layout, model, closeCtx.env))) return;
  throw new Refused(`stale: ${changedSinceReplay(root, snap.layout, model, run, closeCtx.env)} changed since the affected replay; ${replay}`, { id });
}

function refuseUnreplayedFastClose(root: string, snap: WorkSnapshot, closeCtx: CloseContext): void {
  const { id, lane, status } = snap.state;
  if (lane !== "fast" || status === "done" || !hasActiveScenario(root)) return;
  const rows = readResults(root);
  const run = latestRun(rows, id, ["affected"]);
  if (run === null) throw new Refused(`run picket env replay ${id} --affected before closing`, { id });
  if (run.reason !== undefined) return;
  const blamed = blamedResults(rows, run.run);
  if (blamed.length > 0) {
    const named = blamed.map((row) => `${row.scenario} ${row.class}`).join(", ");
    throw new Refused(`${named} after this change: fix the change, or, if the request changes this behaviour on purpose, run picket set ${id} status=abandoned and take it to the order lane`, { id });
  }
  refuseStaleAffectedRun(root, snap, run, closeCtx);
}

function markDone(root: string, state: WorkState, now: Date): WorkState {
  if (state.status === "done") return state;
  const closed: WorkState = { ...state, status: "done" };
  delete closed.blocked_reason;
  return writeState(root, closed, now);
}

function nextAllowsClose(lane: Lane, pending: NextView): boolean {
  if (pending.action === "close") return true;
  return lane === "research" && pending.action === "approve_phase" && pending.actor === "user";
}

function refuseUnlessClosable(root: string, snap: WorkSnapshot): void {
  const { id, lane, status } = snap.state;
  if (status === "abandoned") throw new Refused(`${id} is abandoned; only an open, blocked or done item closes`, { id });
  if (status === "done") return;
  const pending = nextOf(snap, securityPaths(root));
  if (nextAllowsClose(lane, pending)) return;
  const { action, actor, phase, detail } = pending;
  throw new Refused(`next is ${action}, not close`, { id, next: { action, actor, phase, detail } });
}

function classesOf(root: string, id: WorkId): string[] {
  return readVerdicts(root, id)
    .rows.filter((row) => row.verdict === CLASSED_VERDICT && Array.isArray(row.classes))
    .flatMap((row) => [...new Set(row.classes)]);
}

export function repeatedClasses(root: string): Repeat[] {
  const seen = new Map<string, WorkId[]>();
  for (const id of listWork(root)) for (const cls of classesOf(root, id)) seen.set(cls, [...(seen.get(cls) ?? []), id]);
  return [...seen]
    .filter(([, ids]) => ids.length >= MIN_REPEATS)
    .map(([cls, ids]) => ({ class: cls, items: [...new Set(ids)] }))
    .sort((a, b) => a.class.localeCompare(b.class));
}

function ownRepeats(root: string, id: WorkId): Repeat[] {
  return repeatedClasses(root).filter(({ items }) => items.includes(id));
}

function recordRepeats(root: string, id: WorkId, repeats: Repeat[], now: Date): void {
  try {
    for (const { class: cls, items } of repeats) appendLedger(root, { event: "repeat", session: null, agent: null, work_id: id, class: cls, items }, now);
  } catch {}
}

function publishedPaths(snap: WorkSnapshot): string[] {
  return [...new Set(snap.verdicts.flatMap((row) => (typeof row.published === "string" ? [row.published] : [])))];
}

function commitClose(root: string, snap: WorkSnapshot, message: string, touched: string[], env: NodeJS.ProcessEnv, kept: KeptFiles): CommitResult {
  const id = snap.state.id;
  const added = [...publishedPaths(snap), ...kept.paths];
  try {
    return commitOwned(root, message, { add: [workRel(id), ...added], owns: itemOwner(root, snap, [...touched, ...added]), env });
  } catch (err) {
    restoreKept(root, kept);
    throw new Refused((err as Error).message, { id });
  }
}

type TestStage = { tested: string | null; passed: boolean; round: number | null };

const NO_KEPT: KeptCases = { files: { paths: [], lines: [], before: [] }, labels: [] };
const TESTER = "tester";

function isAcceptedAfter(snap: WorkSnapshot, tester: VerdictRow): boolean {
  return snap.replies.some((reply) => reply.action === "resolve_tests" && reply.choice === "accept" && Date.parse(reply.ts) > Date.parse(tester.ts));
}

function unprovedWhy(rows: readonly TestRow[], criterion: string): string {
  const cells = rows.flatMap((row) => (row.type === "cell" && row.criterion === criterion ? [row.why] : []));
  const cases = latestCases(rows).filter((row) => row.criterion === criterion).map((row) => `${row.case} ${row.outcome}`);
  return [...cells, ...cases].join("; ") || "no case ran";
}

function unprovedCriteria(snap: WorkSnapshot, rows: readonly TestRow[], round: number): string {
  const inRound = roundRows(rows, round);
  const passed = new Set(latestCases(inRound).filter((row) => row.outcome === "passed").map((row) => row.criterion));
  return testedCriteria(snap.phases)
    .filter((criterion) => !passed.has(criterion))
    .map((criterion) => `${criterion} (${unprovedWhy(inRound, criterion)})`)
    .join(", ");
}

function testStage(snap: WorkSnapshot, rows: readonly TestRow[]): TestStage {
  if (!PHASED_LANES.includes(snap.state.lane)) return { tested: null, passed: false, round: null };
  const applies = testApplies(snap);
  if (!applies.applies) return { tested: applies.why, passed: false, round: null };
  const tester = snap.verdicts.filter((row) => row.agent === TESTER).at(-1);
  if (tester === undefined) return { tested: "not tested", passed: false, round: null };
  const round = tester.round ?? testRound(snap.verdicts) - 1;
  if (tester.verdict === "APPROVED") return { tested: `APPROVED in round ${round} · ${roundCounts(rows, round)}`, passed: true, round };
  if (isAcceptedAfter(snap, tester)) return { tested: `accepted by the user, not verified: ${unprovedCriteria(snap, rows, round)}`, passed: true, round };
  return { tested: `not tested: round ${round} ended ${tester.verdict}`, passed: false, round };
}

function keptCases(root: string, snap: WorkSnapshot, rows: readonly TestRow[], stage: TestStage): KeptCases {
  if (!stage.passed || stage.round === null) return NO_KEPT;
  return keepFinalCases(root, snap.state.id, rows, stage.round);
}

function approvalCommit(root: string, id: WorkId, phase: number): string | null {
  return lastCommitOf(root, `${workRel(id)}phases/${phase}.approved`);
}

function commitRange(root: string, snap: WorkSnapshot, closeCommit: string | null): CommitRange | null {
  const count = snap.phases.length;
  if (!PHASED_LANES.includes(snap.state.lane) || count === 0) return null;
  const first = approvalCommit(root, snap.state.id, 1);
  const last = closeCommit ?? approvalCommit(root, snap.state.id, count);
  return first && last ? { first, last } : null;
}

function cumulativeVerdict(snap: WorkSnapshot): string | null {
  return snap.verdicts.filter((row) => row.agent === "reviewer" && row.scope === "cumulative").at(-1)?.verdict ?? null;
}

type TestedFacts = Pick<Closing, "tested" | "unproved" | "kept">;

function unprovedServices(root: string, id: WorkId, stage: TestStage, rows: readonly TestRow[]): string[] {
  const mocks = listMocks(root);
  const real = (mock: string) => realService(mocks, mock);
  const tested = stage.round === null ? [] : notProven(rows, stage.round, real);
  return [...new Set([...tested, ...itemMocks(readResults(root), id).map(real)])].sort();
}

function testedFacts(root: string, id: WorkId, stage: TestStage, rows: readonly TestRow[], kept: KeptCases): TestedFacts {
  return { tested: stage.tested, unproved: unprovedServices(root, id, stage, rows), kept: kept.labels };
}

function closingFacts(root: string, snap: WorkSnapshot, audit: string, closeCommit: string | null, tested: TestedFacts): Closing {
  const { id, lane } = snap.state;
  const body = snap.artifact?.body ?? "";
  const report = lane === "research" ? reportFindings(body) : null;
  return {
    audit,
    phases: snap.phases.length,
    commits: commitRange(root, snap, closeCommit),
    decisions: lane === "design" ? decisionCounts(body) : null,
    review: cumulativeVerdict(snap),
    questions: reviewQuestions(root, id),
    deferred: PHASED_LANES.includes(lane) ? deferredCriteria(body) : [],
    report,
    strategic: report?.strategic_review ?? recordStrategicIds(lane, body),
    ...tested,
  };
}

function recordStrategicIds(lane: Lane, body: string): string[] {
  return PHASED_LANES.includes(lane) ? strategicReviewIds(body) : [];
}

function writeAudit(root: string, id: WorkId, audit: string): void {
  writeFileSync(workFile(root, id, "audit.txt"), `${audit}\n`);
}

function recordedWorktrees(snap: WorkSnapshot): string[] {
  return snap.layout.repos.flatMap((repo) => (repo.worktree ? [repo.worktree] : []));
}

function itemStack(root: string, state: WorkState): string | null {
  const recorded = Object.entries(readStacks(root)).find(([, entry]) => entry.item === state.id)?.[0];
  if (recorded) return recorded;
  return existsSync(join(root, ENV_DIR, COMPOSE_FILE)) ? stackName(itemKey(state)) : null;
}

function notRemoved(reason: string): EnvironmentRemoval {
  return { removed: null, warning: `environment not removed: ${reason}` };
}

function purgeOnClose(root: string, state: WorkState, { now, env, cwd, runner }: CloseContext): EnvironmentRemoval | null {
  const stack = itemStack(root, state);
  if (stack === null) return null;
  const recordedFor = readStacks(root)[stack]?.item;
  if (recordedFor !== undefined && recordedFor !== state.id) return notRemoved(`${stack} is recorded for ${recordedFor}`);
  const { engine, machine } = machineCheck(env, cwd, root, runner);
  if (!engine || !machine.ok) return notRemoved(machine.missing[0]?.split(":")[0] ?? "no container engine");
  try {
    const claim = foreignClaim(engine, root, stack, state.id);
    if (claim !== null) return notRemoved(claim);
    return { removed: purgeStack(engine, root, stack, state.id, now).resources, warning: null };
  } catch (err) {
    return notRemoved((err as Error).message);
  }
}

export function close(root: string, id: WorkId, { message, touched = [] }: CloseOptions, closeCtx: CloseContext): CloseResult {
  const { now, env } = closeCtx;
  const snap = readSnapshot(root, id);
  refuseUnlessClosable(root, snap);
  refuseUnreplayedFastClose(root, snap, closeCtx);
  const audit = auditLine(snap.state, snap.phases.length, readLedger(root).rows);
  const commitMessage = checkedCloseMessage(message, snap.state);
  const repeats = ownRepeats(root, id);
  recordRepeats(root, id, repeats, now);
  const worktrees = recordedWorktrees(snap);
  dropItemChecks(root, id);
  const rows = readTestRows(root, id);
  const stage = testStage(snap, rows);
  if (!isRepo(root)) {
    const state = markDone(root, snap.state, now);
    writeAudit(root, id, audit);
    const environment = purgeOnClose(root, state, closeCtx);
    const closing = closingFacts(root, snap, audit, null, testedFacts(root, id, stage, rows, NO_KEPT));
    return { ...state, commit: null, message: commitMessage, committed: [], left_staged: [], warnings: [], dirty: [], left: readLeft(root, id), repeats, closing, worktrees, environment };
  }
  refuseUntouchedFastClose(root, snap.state, touched);
  const state = markDone(root, snap.state, now);
  writeAudit(root, id, audit);
  const kept = keptCases(root, snap, rows, stage);
  const { sha: commit, left_staged, warnings } = commitClose(root, snap, commitMessage, touched, env, kept.files);
  if (commit) recordAccept(root, id, commit, null, now);
  const committed = commit ? filesInCommit(root, commit) : [];
  const environment = purgeOnClose(root, state, closeCtx);
  const closing = closingFacts(root, snap, audit, commit, testedFacts(root, id, stage, rows, kept));
  return { ...state, commit, message: commitMessage, committed, left_staged, warnings, dirty: dirtyPaths(root), left: readLeft(root, id), repeats, closing, worktrees, environment };
}
