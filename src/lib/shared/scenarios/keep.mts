import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { readJson } from "../../util/io.mts";
import type { DriveHit, DriveRow } from "../drive-log.mts";
import type { EnvModel } from "../env/model.mts";
import { statePath, STATE_FILES } from "../paths.mts";
import { phasePaths } from "../work/artifact.mts";
import { phaseCheckResults, type CheckResult, type HttpCheck } from "../work/declared-checks.mts";
import { phaseOf, type WorkSnapshot } from "../work/snapshot.mts";
import { listScenarios, nextScenarioId, writeScenarioFile } from "./files.mts";
import { FORMAT, parseScenario, writeScenario, type Card, type ExpectStep, type RequestStep, type ScenarioHeader } from "./format.mts";
import { readResults } from "./results.mts";

export type CandidateOutcome = "passed" | "failed" | "blocked" | "not kept";
export type Candidate = { covers: string; index: number; outcome: CandidateOutcome; detail: string; text: string | null; replaces: string | null };
export type KeepApp = { name: string; context: string };
export type CandidateInput = { item: string; result: CheckResult; criterion: string; ts: string; apps: KeepApp[]; files: string[] };
export type CandidatesByPhase = Record<string, Candidate[]>;

export const CANDIDATE_ID = "S-0000";

const CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const MASK = "***";
const RUN_PREFIX = "PKT-";
const USER_PLACEHOLDER = "{user:";
const PKT = /PKT-[A-Za-z0-9]+/g;
const FIXED_DATE = /\b\d{4}-\d{2}-\d{2}(?=T|\b)/g;
const ERROR_STATUS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LENGTH = 10;

function notKept(reason: string): { notKept: string } {
  return { notKept: reason };
}

function relativeDay(day: string, date: string): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);
  return `{date:${days < 0 ? "-" : "+"}${Math.abs(days)}d}`;
}

function rewritten(text: string, day: string): string {
  return text.replace(FIXED_DATE, (date) => relativeDay(day, date)).replace(PKT, `${RUN_PREFIX}{run}`);
}

function holds(context: string, file: string): boolean {
  return context === "" || file === context || file.startsWith(`${context}/`);
}

function serviceFor(check: HttpCheck, apps: KeepApp[], files: string[]): string | null {
  if (check.service !== undefined) return check.service;
  const owners = [...new Set(apps.filter((app) => files.some((file) => holds(app.context, file))).map((app) => app.name))];
  return owners.length === 1 ? owners[0] : null;
}

function header(input: CandidateInput, check: HttpCheck): ScenarioHeader {
  const intent = input.criterion.trim() === "" ? check.covers : input.criterion.trim();
  return {
    id: CANDIDATE_ID,
    kind: check.status >= ERROR_STATUS ? "negative" : "normal",
    covers: [`${input.item}/${check.covers}`],
    intent,
    ...(check.replaces === undefined ? {} : { supersedes: check.replaces }),
    status: "active",
    format: FORMAT,
  };
}

function cardOf(input: CandidateInput, check: HttpCheck, hit: DriveHit, service: string): Card {
  const day = input.ts.slice(0, DAY_LENGTH);
  const body = hit.body === undefined ? null : rewritten(hit.body, day);
  const request: RequestStep = { word: "request", line: 1, method: check.method, target: `{${service}}${rewritten(hit.path, day)}`, headers: body === null ? [] : [["content-type", "application/json"]], body };
  const status: ExpectStep = { word: "expect", line: 2, what: "status", status: check.status };
  const contains = check.contains.map((text, at): ExpectStep => ({ word: "expect", line: 3 + at, what: "contains", text: rewritten(text, day) }));
  return { header: header(input, check), steps: [request, status, ...contains] };
}

function capturesBeforeNextRequest(steps: Card["steps"], request: number): boolean {
  const after = steps.slice(request + 1);
  const nextRequest = after.findIndex((step) => step.word === "request");
  return (nextRequest === -1 ? after : after.slice(0, nextRequest)).some((step) => step.word === "capture");
}

function loginIndex(steps: Card["steps"]): number {
  const first = steps.findIndex((step) => step.word === "request");
  const step = steps[first];
  const signsIn = step?.word === "request" && (step.body ?? "").includes(USER_PLACEHOLDER);
  return signsIn && capturesBeforeNextRequest(steps, first) ? first : -1;
}

function ownsData(text: string, created: readonly string[]): boolean {
  return text.includes(RUN_PREFIX) || created.some((entry) => text.includes(`{data:${entry}.`));
}

export function writesUnownedData(card: Card, created: readonly string[]): boolean {
  const login = loginIndex(card.steps);
  return card.steps.some((step, at) => at !== login && step.word === "request" && CHANGING_METHODS.includes(step.method) && !ownsData(`${step.target}${step.body ?? ""}`, created));
}

export function candidateCard(input: CandidateInput): { card: Card } | { notKept: string } {
  const { check, outcome, ran } = input.result;
  if (!("path" in check)) return notKept("a run check is never kept; only an HTTP check becomes a saved scenario");
  if ((outcome !== "pass" && outcome !== "prefix") || ran === null || !("path" in ran)) return notKept(outcome === "failed" ? "the check failed" : "the check did not run");
  if (ran.body?.includes(MASK)) return notKept("the logged body holds a masked secret");
  const service = serviceFor(check, input.apps, input.files);
  if (service === null) return notKept("the phase's files sit in no app or in several; name one with service");
  const card = cardOf(input, check, ran, service);
  if (writesUnownedData(card, [])) return notKept(`${check.method} changes data it did not create; create it with a ${RUN_PREFIX} prefix`);
  return { card };
}

export function criterionText(body: string, covers: string): string {
  const escaped = covers.replaceAll(".", "\\.");
  return body.match(new RegExp(`^\\s*-\\s*\\*\\*${escaped}\\*\\*\\s*(.*)$`, "m"))?.[1].trim() ?? "";
}

function builtApps(root: string, model: EnvModel): KeepApp[] {
  return model.services.flatMap((service) => (service.role === "app" && service.build !== null ? [{ name: service.name, context: relative(root, service.build.context).replaceAll("\\", "/") }] : []));
}

function rowTime(rows: DriveRow[], ran: CheckResult["ran"]): string {
  return rows.find((row) => ran !== null && row.hits?.some((hit) => hit === ran))?.ts ?? "";
}

export function candidateInputs(root: string, snap: WorkSnapshot, rows: DriveRow[], n: number, model: EnvModel): CandidateInput[] {
  const phase = phaseOf(snap, n);
  const files = phase ? phasePaths(phase) : [];
  const apps = builtApps(root, model);
  const results = (phaseCheckResults(snap, rows, n) ?? []).filter((result) => "path" in result.check);
  return results.map((result) => ({ item: snap.state.id, result, criterion: criterionText(snap.artifact?.body ?? "", result.check.covers), ts: rowTime(rows, result.ran), apps, files }));
}

export function deprecate(text: string, by: string): string | null {
  const { card } = parseScenario(text);
  if (card === null) return null;
  return writeScenario({ ...card, header: { ...card.header, status: "deprecated", superseded_by: by } });
}

export function keepText(candidate: Candidate): string {
  if (candidate.outcome === "passed") return `kept on approval${candidate.replaces === null ? "" : `, replaces ${candidate.replaces}`}`;
  if (candidate.outcome === "not kept") return `not kept: ${candidate.detail}`;
  return `not kept: replay ${candidate.outcome}: ${candidate.detail}`;
}

function candidatesPath(root: string, item: string): string {
  return statePath(root, `${STATE_FILES.scenarioCandidates}/${item}.json`);
}

export function readCandidates(root: string, item: string): CandidatesByPhase {
  return readJson<CandidatesByPhase>(candidatesPath(root, item)) ?? {};
}

export function storeCandidates(root: string, item: string, phase: number, candidates: Candidate[]): void {
  const path = candidatesPath(root, item);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ ...readCandidates(root, item), [String(phase)]: candidates }, null, 2)}\n`);
}

export type KeptBefore = { path: string; text: string | null };
export type KeptFiles = { paths: string[]; lines: string[]; before: KeptBefore[] };

const PHASE_COMMIT_FAILED = "the phase commit failed";

function deprecateReplaced(root: string, replaced: string, by: string): { before: KeptBefore[]; line: string } {
  const old = listScenarios(root).find((scenario) => scenario.id === replaced && scenario.card?.header.status === "active");
  const earlier = old ? readFileSync(join(root, old.path), "utf8") : null;
  const text = earlier === null ? null : deprecate(earlier, by);
  if (!old || text === null) return { before: [], line: `${replaced} is no active saved scenario; nothing deprecated` };
  writeFileSync(join(root, old.path), text);
  return { before: [{ path: old.path, text: earlier }], line: `${replaced} deprecated, superseded by ${by}` };
}

export function keepCandidates(root: string, candidates: Candidate[]): KeptFiles {
  const kept: KeptFiles = { paths: [], lines: [], before: [] };
  for (const candidate of candidates) {
    const card = candidate.text === null ? null : parseScenario(candidate.text).card;
    if (card === null) {
      kept.lines.push(`${candidate.covers} not kept: its candidate card does not parse`);
      continue;
    }
    const id = nextScenarioId(root, readResults(root));
    const path = writeScenarioFile(root, id, writeScenario({ ...card, header: { ...card.header, id } }));
    const replaced = candidate.replaces === null ? null : deprecateReplaced(root, candidate.replaces, id);
    const touched: KeptBefore[] = [{ path, text: null }, ...(replaced?.before ?? [])];
    kept.paths.push(...touched.map((entry) => entry.path));
    kept.before.push(...touched);
    kept.lines.push(`kept ${id} from ${candidate.covers}${replaced ? `; ${replaced.line}` : ""}`);
  }
  return kept;
}

function scenarioIdOf(path: string): string {
  return basename(path, ".md");
}

export function restoreKept(root: string, kept: KeptFiles): string[] {
  return kept.before.map(({ path, text }) => {
    if (text === null) {
      rmSync(join(root, path), { force: true });
      return `${scenarioIdOf(path)} not kept: ${PHASE_COMMIT_FAILED}`;
    }
    writeFileSync(join(root, path), text);
    return `${scenarioIdOf(path)} left active: ${PHASE_COMMIT_FAILED}`;
  });
}
