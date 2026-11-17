import { join } from "node:path";
import { Refused } from "../action.mts";
import { readResults, replaySummary, type ResultRow, type ScenarioRow } from "../scenarios/results.mts";
import { workDir, type WorkId } from "../work/files.mts";
import { readSnapshot, type WorkSnapshot } from "../work/snapshot.mts";
import type { VerdictRow } from "../work/verdict-log.mts";
import { testedCriteria, type DeriveInput } from "./derive.mts";
import { readTestRows, testRound, TEST_DIR } from "./results.mts";

export type TestItem = { snap: WorkSnapshot; criteria: string[] };

const CLOSED_STATUSES = ["done", "abandoned"];
const REPORT_FILE = "test.md";
const BRIEF_FILE = "brief.md";
const TESTER = "tester";

export function testReportPath(root: string, id: WorkId): string {
  return join(workDir(root, id), REPORT_FILE);
}

export function testBriefPath(root: string, id: WorkId): string {
  return join(workDir(root, id), TEST_DIR, BRIEF_FILE);
}

export function openTestItem(root: string, id: WorkId): TestItem {
  const snap = readSnapshot(root, id);
  const { status } = snap.state;
  if (CLOSED_STATUSES.includes(status)) throw new Refused(`${id} is ${status}; only an open or blocked item is tested`, { id, status });
  const criteria = testedCriteria(snap.phases);
  if (criteria.length === 0) throw new Refused(`${id} declares no HTTP check, so it has no tested criteria`, { id });
  return { snap, criteria };
}

function passedIn(rows: readonly ScenarioRow[], run: string | null): string[] {
  if (run === null) return [];
  return rows.filter((row): row is ResultRow => row.type === "result" && row.run === run && row.class === "passed").map((row) => row.scenario);
}

function previousReplayRun(verdicts: readonly VerdictRow[]): string | null {
  return verdicts.filter((row) => row.agent === TESTER).at(-1)?.replay_run ?? null;
}

export function testFacts(root: string, snap: WorkSnapshot): DeriveInput {
  const id = snap.state.id;
  const scenarioRows = readResults(root);
  const summary = replaySummary(scenarioRows, id);
  const run = summary.run !== null && summary.run.reason === undefined ? summary.run.run : null;
  const previous = previousReplayRun(snap.verdicts);
  return {
    criteria: testedCriteria(snap.phases),
    rows: readTestRows(root, id),
    round: testRound(snap.verdicts),
    replay: { run, passed: passedIn(scenarioRows, run), blamed: summary.blamed.map((entry) => entry.scenario) },
    previousReplay: { run: previous, passed: passedIn(scenarioRows, previous) },
  };
}
