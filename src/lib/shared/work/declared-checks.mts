import type { ContainsMap, DriveHit, DriveRow } from "../drive-log.mts";
import type { WorkId } from "./files.mts";
import { phaseOf, type WorkSnapshot } from "./snapshot.mts";

export type HttpCheck = { covers: string; method: string; path: string; status: number; contains: string[] };
export type RunCheck = { covers: string; command: string; exit_code: number; contains: string[] };
export type DeclaredCheck = HttpCheck | RunCheck;
export type ReadChecks = { checks: DeclaredCheck[]; problems: string[] };

type Fields = Record<string, unknown>;

const HTTP_KEYS = ["covers", "method", "path", "status", "contains"];
const RUN_KEYS = ["covers", "command", "exit_code", "contains"];
const COVERS = /^T-(\d+)\.\d+$/;
const METHOD = /^[A-Z]+$/;

function isFields(value: unknown): value is Fields {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coversProblems(covers: unknown, phase: number, at: string): string[] {
  const match = typeof covers === "string" ? covers.match(COVERS) : null;
  if (match && Number(match[1]) === phase) return [];
  return [`${at} covers ${JSON.stringify(covers ?? null)}, not a T-${phase}.<x> criterion of this phase`];
}

function containsProblems(contains: unknown, at: string): string[] {
  if (contains === undefined) return [];
  const strings = Array.isArray(contains) && contains.every((item) => typeof item === "string" && item !== "");
  return strings ? [] : [`${at} contains must be a list of non-empty strings`];
}

function foreignKeyProblems(fields: Fields, keys: string[], kind: string, at: string): string[] {
  return Object.keys(fields)
    .filter((key) => !keys.includes(key))
    .map((key) => `${at} has key ${key}, which ${kind} check does not take`);
}

function httpProblems(fields: Fields, at: string): string[] {
  const problems: string[] = [];
  if (typeof fields.method !== "string" || !METHOD.test(fields.method)) problems.push(`${at} method must be upper-case letters, such as GET`);
  if (typeof fields.path !== "string" || !fields.path.startsWith("/")) problems.push(`${at} path must start with /`);
  const status = fields.status;
  if (typeof status !== "number" || !Number.isInteger(status) || status < 100 || status > 599) problems.push(`${at} status must be an integer from 100 to 599`);
  return problems;
}

function runProblems(fields: Fields, at: string): string[] {
  const problems: string[] = [];
  if (typeof fields.command !== "string" || fields.command.trim() === "") problems.push(`${at} command must not be empty`);
  if (typeof fields.exit_code !== "number" || !Number.isInteger(fields.exit_code)) problems.push(`${at} exit_code must be an integer`);
  return problems;
}

function kindProblems(fields: Fields, at: string): string[] {
  if (Object.hasOwn(fields, "path")) return [...foreignKeyProblems(fields, HTTP_KEYS, "an HTTP", at), ...httpProblems(fields, at)];
  return [...foreignKeyProblems(fields, RUN_KEYS, "a run", at), ...runProblems(fields, at)];
}

function checkProblems(entry: unknown, phase: number, at: string): string[] {
  const fields = isFields(entry) ? entry : {};
  const hasPath = Object.hasOwn(fields, "path");
  const hasCommand = Object.hasOwn(fields, "command");
  if (hasPath && hasCommand) return [`${at} has both path and command; a check is an HTTP check or a run check`];
  if (!hasPath && !hasCommand) return [`${at} has neither path nor command`];
  return [...coversProblems(fields.covers, phase, at), ...kindProblems(fields, at), ...containsProblems(fields.contains, at)];
}

function toCheck(fields: Fields): DeclaredCheck {
  const contains = Array.isArray(fields.contains) ? fields.contains.map(String) : [];
  const covers = String(fields.covers);
  if (Object.hasOwn(fields, "path")) return { covers, method: String(fields.method), path: String(fields.path), status: Number(fields.status), contains };
  return { covers, command: String(fields.command), exit_code: Number(fields.exit_code), contains };
}

export type CheckKind = "http" | "run";

function kindOf(check: DeclaredCheck): CheckKind {
  return "path" in check ? "http" : "run";
}

export function declaredStrings(checks: DeclaredCheck[], kind: CheckKind): string[] {
  return [...new Set(checks.filter((check) => kindOf(check) === kind).flatMap((check) => check.contains))];
}

export function containsMap(text: string, strings: string[]): Record<string, boolean> {
  return Object.fromEntries(strings.map((string) => [string, text.includes(string)]));
}

export function readChecks(drive: unknown, phase: number): ReadChecks | null {
  if (!Array.isArray(drive)) return null;
  if (drive.length === 0) return { checks: [], problems: ["is an empty list; write drive: true, false, or at least one check"] };
  const checks: DeclaredCheck[] = [];
  const problems: string[] = [];
  drive.forEach((entry, i) => {
    const found = checkProblems(entry, phase, `check ${i + 1}`);
    if (found.length) problems.push(...found);
    else checks.push(toCheck(entry as Fields));
  });
  return { checks, problems };
}

export type CheckOutcome = "pass" | "prefix" | "failed" | "not_run";
export type RanHit = DriveHit;
export type RanCommand = { run: string; exit_code: number | null; contains?: ContainsMap };
export type CheckResult = { phase: number; index: number; check: DeclaredCheck; outcome: CheckOutcome; ran: RanHit | RanCommand | null; detail: string };

const DRIVE_SOURCE = "picket drive";

export function phaseRows(rows: DriveRow[], id: WorkId, n: number): DriveRow[] {
  return rows.filter((row) => row.source === DRIVE_SOURCE && row.work_id === id && row.phase === n);
}

function coveredPhase(check: DeclaredCheck): number {
  return Number(check.covers.match(COVERS)?.[1]);
}

function missingString(contains: ContainsMap | undefined, strings: string[], where: string): string | null {
  for (const string of strings) {
    if (contains?.[string] === undefined) return `"${string}" not checked by the logged drive`;
    if (!contains[string]) return `"${string}" not in the ${where}`;
  }
  return null;
}

function latest<T>(items: T[], matches: (item: T) => boolean): T | null {
  return [...items].reverse().find(matches) ?? null;
}

function httpResult(check: HttpCheck, hits: DriveHit[]): Omit<CheckResult, "phase" | "index" | "check"> {
  const sameMethod = (hit: DriveHit) => hit.method === check.method;
  const hit = latest(hits, (h) => sameMethod(h) && h.path === check.path) ?? latest(hits, (h) => sameMethod(h) && h.path.endsWith(check.path));
  if (!hit) {
    const ran = latest(hits, sameMethod);
    return { outcome: "not_run", ran, detail: ran ? `not run; last ran ${ran.method} ${ran.path}` : "not run" };
  }
  if (hit.status !== check.status) return { outcome: "failed", ran: hit, detail: `declared ${check.status}, ran ${hit.status ?? "no answer"}` };
  const missing = missingString(hit.contains, check.contains, "body");
  if (missing) return { outcome: "failed", ran: hit, detail: missing };
  if (hit.path !== check.path) return { outcome: "prefix", ran: hit, detail: `ran at ${hit.path}; declared ${check.path}, the user rules at the gate` };
  return { outcome: "pass", ran: hit, detail: `${check.method} ${check.path} → ${hit.status}` };
}

function ranCommand(row: DriveRow): RanCommand {
  return { run: row.run ?? "", exit_code: row.exit_code ?? null, ...(row.contains ? { contains: row.contains } : {}) };
}

function runResult(check: RunCheck, rows: DriveRow[]): Omit<CheckResult, "phase" | "index" | "check"> {
  const runs = rows.filter((row) => row.run !== undefined).map(ranCommand);
  const ran = latest(runs, (row) => row.run === check.command);
  if (!ran) {
    const last = runs.at(-1) ?? null;
    return { outcome: "not_run", ran: last, detail: last ? `not run; last ran "${last.run}"` : "not run" };
  }
  if (ran.exit_code !== check.exit_code) return { outcome: "failed", ran, detail: `declared exit ${check.exit_code}, ran exit ${ran.exit_code ?? "none"}` };
  const missing = missingString(ran.contains, check.contains, "output");
  if (missing) return { outcome: "failed", ran, detail: missing };
  return { outcome: "pass", ran, detail: `"${check.command}" → exit ${ran.exit_code}` };
}

export function compareChecks(checks: DeclaredCheck[], rows: DriveRow[]): CheckResult[] {
  const hits = rows.flatMap((row) => row.hits ?? []);
  return checks.map((check, index) => {
    const result = "path" in check ? httpResult(check, hits) : runResult(check, rows);
    return { phase: coveredPhase(check), index, check, ...result };
  });
}

export function phaseCheckResults(snap: WorkSnapshot, rows: DriveRow[], n: number): CheckResult[] | null {
  const read = readChecks(phaseOf(snap, n)?.entry?.drive, n);
  return read ? compareChecks(read.checks, phaseRows(rows, snap.state.id, n)) : null;
}
