import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isUnexplained, type ResultClass } from "../../shared/scenarios/compare.mts";
import { defectPath, labelCard, nextDefectId, readDefects, writeDefect, type CardLabels, type DefectEntry } from "../../shared/scenarios/defects.mts";
import { listScenarios, nextScenarioId, writeScenarioFile, type SavedScenario } from "../../shared/scenarios/files.mts";
import { writeScenario } from "../../shared/scenarios/format.mts";
import { defectCard } from "../../shared/testing/cases.mts";
import type { KeptBefore, KeptFiles } from "../../shared/scenarios/keep.mts";
import { newestEscape } from "../../shared/testing/escapes.mts";
import type { KeptScenario } from "../../shared/testing/keep-cases.mts";
import { escapeCounts, learningPath, writeLearning, type EscapeCount } from "../../shared/testing/learning.mts";
import { defectRows, latestCases, latestClass, type CaseRow, type DefectRow, type TestRow } from "../../shared/testing/results.mts";
import { readResults, type ResultRow, type RunRow, type ScenarioRow } from "../../shared/scenarios/results.mts";
import type { WorkSnapshot } from "../../shared/work/snapshot.mts";

export type TestedCases = { rows: readonly TestRow[]; kept: readonly KeptScenario[] };
type Settling = { root: string; item: string; today: string; run: RunRow; scenarios: SavedScenario[] };
type Settled = { touched: KeptBefore[]; line: string };

const RECORDED_MODES: readonly string[] = ["full", "affected"];
const FAILING_BEFORE: ResultClass = "failing before the item";
const FIXED_BY_ITEM: ResultClass = "fixed by this item";
const FIXED: readonly ResultClass[] = ["fixed outside this item", FIXED_BY_ITEM];
const NO_SCENARIO = "none";
const DAY_LENGTH = 10;

function recordedRun(rows: readonly ScenarioRow[], item: string): RunRow | null {
  const runs = rows.filter((row): row is RunRow => row.type === "run" && row.item === item && RECORDED_MODES.includes(row.mode) && row.reason === undefined);
  return runs.at(-1) ?? null;
}

function runResults(rows: readonly ScenarioRow[], run: RunRow): ResultRow[] {
  return rows.filter((row): row is ResultRow => row.type === "result" && row.run === run.run);
}

function openDefects(root: string): DefectEntry[] {
  return readDefects(root).filter((entry) => entry.status === "open");
}

function relabel(root: string, scenario: SavedScenario, labels: CardLabels): KeptBefore {
  const earlier = readFileSync(join(root, scenario.path), "utf8");
  writeFileSync(join(root, scenario.path), labelCard(earlier, labels));
  return { path: scenario.path, text: earlier };
}

function unlabelledCard(scenarios: readonly SavedScenario[], id: string, open: readonly DefectEntry[]): SavedScenario | null {
  const scenario = scenarios.find((entry) => entry.id === id);
  const header = scenario?.card?.header;
  if (!scenario || header?.status !== "active" || header.known !== undefined) return null;
  return open.some((entry) => entry.scenario === id) ? null : scenario;
}

function evidence(run: RunRow, result: ResultRow): string {
  const versions = Object.entries(result.versions).map(([app, version]) => `${app} ${version}`);
  return versions.length ? `run ${run.run} on ${versions.join(", ")}` : `run ${run.run}`;
}

function recorded(at: Settling, result: ResultRow): Settled | null {
  const scenario = unlabelledCard(at.scenarios, result.scenario, openDefects(at.root));
  if (scenario === null) return null;
  const entry: DefectEntry = { id: nextDefectId(at.root), status: "open", opened: at.today, found_in: at.item, scenario: result.scenario, expected: scenario.card?.header.intent ?? "", actual: result.detail, evidence: evidence(at.run, result) };
  const path = writeDefect(at.root, entry);
  return { touched: [{ path, text: null }, relabel(at.root, scenario, { known: entry.id })], line: `${entry.id} recorded from ${result.scenario}` };
}

function entryOf(root: string, result: ResultRow): DefectEntry | null {
  const open = openDefects(root);
  return open.find((entry) => entry.id === result.defect) ?? open.find((entry) => entry.scenario === result.scenario) ?? null;
}

function fixed(at: Settling, result: ResultRow, entry: DefectEntry): Settled {
  const path = defectPath(entry.id);
  const earlier = readFileSync(join(at.root, path), "utf8");
  writeDefect(at.root, { ...entry, status: "fixed", fixed: at.today, fixed_in: at.item, reason: result.class, ...(result.detail === "" ? {} : { range: result.detail }) });
  const scenario = at.scenarios.find((saved) => saved.id === result.scenario);
  const card = scenario === undefined ? [] : [relabel(at.root, scenario, { known: null, defect: entry.id })];
  const range = result.detail === "" ? "" : ` (${result.detail})`;
  return { touched: [{ path, text: earlier }, ...card], line: `${entry.id} ${result.class}${range}` };
}

function resolved(at: Settling, result: ResultRow): Settled | null {
  const entry = entryOf(at.root, result);
  if (entry === null) return null;
  if (FIXED.includes(result.class)) return fixed(at, result, entry);
  if (isUnexplained(result.class)) return { touched: [], line: `${entry.id} ${result.class} (${result.detail}); still open` };
  return null;
}

function settle(at: Settling, result: ResultRow): Settled | null {
  return result.class === FAILING_BEFORE ? recorded(at, result) : resolved(at, result);
}

function scenarioDefects(root: string, item: string, today: string): Settled[] {
  const rows = readResults(root);
  const run = recordedRun(rows, item);
  if (run === null) return [];
  const at: Settling = { root, item, today, run, scenarios: listScenarios(root) };
  return runResults(rows, run).flatMap((result) => settle(at, result) ?? []);
}

function fixedProductCases(rows: readonly TestRow[]): CaseRow[] {
  return latestCases(rows).filter((row) => row.outcome === "passed" && latestClass(rows, row.case)?.class === "product");
}

function lastFailure(rows: readonly TestRow[], caseId: string): CaseRow | null {
  return rows.filter((row): row is CaseRow => row.type === "case" && row.case === caseId && row.outcome === "failed").at(-1) ?? null;
}

function caseDefect(root: string, item: string, today: string, { rows, kept }: TestedCases, row: CaseRow): Settled | null {
  if (readDefects(root).some((entry) => entry.found_in === item && entry.case === row.case)) return null;
  const cls = latestClass(rows, row.case);
  const escape = newestEscape(rows, row.case);
  const scenario = kept.find((saved) => saved.covers === `${row.criterion} ${row.kind}`)?.id ?? NO_SCENARIO;
  const entry: DefectEntry = {
    id: nextDefectId(root),
    status: "fixed",
    opened: (cls?.ts ?? today).slice(0, DAY_LENGTH),
    found_in: item,
    scenario,
    expected: row.intent,
    actual: lastFailure(rows, row.case)?.detail ?? "",
    evidence: cls?.evidence ?? "",
    case: row.case,
    ...(escape === null ? {} : { root_cause: escape.root_cause, escaped: escape.escaped }),
    fixed: today,
    fixed_in: item,
    reason: FIXED_BY_ITEM,
  };
  return { touched: [{ path: writeDefect(root, entry), text: null }], line: `${entry.id} ${FIXED_BY_ITEM} (${row.case})` };
}

function caseDefects(root: string, item: string, today: string, cases: TestedCases): Settled[] {
  return fixedProductCases(cases.rows).flatMap((row) => caseDefect(root, item, today, cases, row) ?? []);
}

function recordedEvidence(row: DefectRow): string {
  return row.mocks.length ? `${row.evidence}; through a mock: ${row.mocks.join(", ")}` : row.evidence;
}

function foundDefect(root: string, item: string, row: DefectRow): Settled | null {
  if (readDefects(root).some((entry) => entry.found_in === item && entry.case === row.found)) return null;
  const built = defectCard(row.kind, row.intent, row.steps);
  if ("problems" in built) return null;
  const id = nextDefectId(root);
  const scenario = nextScenarioId(root, readResults(root));
  const card = writeScenarioFile(root, scenario, writeScenario({ ...built.card, header: { ...built.card.header, id: scenario, covers: [], known: id } }));
  const entry: DefectEntry = { id, status: "open", opened: row.ts.slice(0, DAY_LENGTH), found_in: item, scenario, expected: row.intent, actual: row.detail, evidence: recordedEvidence(row), case: row.found };
  return { touched: [{ path: writeDefect(root, entry), text: null }, { path: card, text: null }], line: `${id} recorded from ${row.found} (${scenario})` };
}

function foundDefects(root: string, item: string, rows: readonly TestRow[]): Settled[] {
  return defectRows(rows).flatMap((row) => foundDefect(root, item, row) ?? []);
}

export function recordKnownDefects(root: string, snap: WorkSnapshot, now: Date, cases: TestedCases): KeptFiles {
  const item = snap.state.id;
  const today = now.toISOString().slice(0, DAY_LENGTH);
  const settled = [...scenarioDefects(root, item, today), ...caseDefects(root, item, today, cases), ...foundDefects(root, item, cases.rows)];
  const touched = settled.flatMap((entry) => entry.touched);
  return { paths: touched.map((before) => before.path), lines: settled.map((entry) => entry.line), before: touched };
}

function learnedText({ point, role, items, entries }: EscapeCount): string {
  const counted = `${point} in ${items.length} items (${entries.map((entry) => entry.id).join(", ")})`;
  return role === null ? counted : `${counted} to ${learningPath(role)}`;
}

export function learnFromDefects(root: string, item: string): string[] {
  const counts = escapeCounts(readDefects(root));
  writeLearning(root, counts);
  return counts.filter((count) => count.items.includes(item)).map(learnedText);
}
