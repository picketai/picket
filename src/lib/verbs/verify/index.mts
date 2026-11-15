import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { action, done, failed } from "../../shared/action.mts";
import { locate, testRuns, type TestRun } from "../../shared/checkouts.mts";
import { runStep } from "../../shared/checks.mts";
import { readDriveLog, type DriveRow } from "../../shared/drive-log.mts";
import { machineCheck, readModelJson, realRunner, type Engine, type EngineRunner } from "../../shared/env/engine.mts";
import { locatedFindings, splitByChange, type LocatedFinding } from "../../shared/env/instep.mts";
import { sourceFor } from "../../shared/env/build-plan.mts";
import { readModel, type EnvModel } from "../../shared/env/model.mts";
import { baseKey, keyId, workingKey } from "../../shared/scenarios/keys.mts";
import { readResults, replaySummary, summaryText, type RunRow } from "../../shared/scenarios/results.mts";
import { scanUmbrella } from "../../shared/env/scan.mts";
import { COMPOSE_FILE, ENV_DIR } from "../../shared/env/standard.mts";
import { changedSince } from "../../shared/git.mts";
import type { ItemLayout } from "../../shared/repos.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import type { GrepEntry } from "../../shared/work/artifact.mts";
import { phaseCheckProblems, phaseCheckResults, type CheckResult } from "../../shared/work/declared-checks.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { phaseOf, readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { flag, UsageError, type Args } from "../../util/args.mts";
import type { JsonlRead } from "../../util/io.mts";

export type VerifyInput = { id: WorkId; phase: number; runTests: boolean };
export type VerifyResult = { name: string; ok: boolean; detail: string };
export type VerifyReport = { ok: boolean; phase: number; results: VerifyResult[]; warnings?: string[] };
export type VerifyOptions = { runTests: boolean; env: NodeJS.ProcessEnv; runner?: EngineRunner; cwd?: string };
type EnvironmentCheck = { result: VerifyResult; warnings: string[]; model: EnvModel | null };

const PHASE_NUMBER = /^\d+$/;
const TEST_TIMEOUT_MS = 300_000;
const DRIVE_COMMAND_CHARS = 80;

function notVerified(phase: number, result: VerifyResult): VerifyReport {
  return { ok: false, phase, results: [result] };
}

function physicalPath(layout: ItemLayout, planPath: string): string {
  const { dir, rel } = locate(layout, planPath);
  return posix.join(dir, rel);
}

function physicalDetail(planPath: string, physical: string): string {
  return physical === planPath ? "" : `at ${physical}`;
}

function fileResults(root: string, layout: ItemLayout, files: string[]): VerifyResult[] {
  return files.map((file) => {
    const physical = physicalPath(layout, file);
    return { name: `file:${file}`, ok: existsSync(join(root, physical)), detail: physicalDetail(file, physical) };
  });
}

function grepResult(root: string, layout: ItemLayout, { path, pattern, flags, absent }: GrepEntry): VerifyResult {
  const physical = physicalPath(layout, path);
  const file = join(root, physical);
  const exists = existsSync(file);
  const present = exists && new RegExp(pattern, flags ?? "m").test(readFileSync(file, "utf8"));
  const detail = physicalDetail(path, physical);
  if (!absent) return { name: `grep:${path}:${pattern}`, ok: present, detail };
  return { name: `absent:${path}:${pattern}`, ok: !present, detail: exists ? detail : "file missing" };
}

function grepResults(root: string, layout: ItemLayout, greps: GrepEntry[]): VerifyResult[] {
  return greps.map((grep) => grepResult(root, layout, grep));
}

function umbrellaTests(root: string, command: string | null, { runTests, env }: VerifyOptions): VerifyResult {
  if (!command) return { name: "tests", ok: false, detail: "no test command detected" };
  if (!runTests) return { name: "tests", ok: true, detail: `skipped (${command})` };
  const step = runStep(root, "test", command, { env, timeoutMs: TEST_TIMEOUT_MS, logPrefix: "verify" });
  if (step.status === "passed") return { name: "tests", ok: true, detail: command };
  return { name: "tests", ok: false, detail: `${step.status} · ${command} · log ${step.log}` };
}

function checkoutTests(root: string, { dir, command }: TestRun, { runTests, env }: VerifyOptions): VerifyResult {
  const name = `tests:${dir}`;
  if (!command) return { name, ok: true, detail: "no suite detected" };
  if (!runTests) return { name, ok: true, detail: `skipped (${command})` };
  const step = runStep(root, "test", command, { env, timeoutMs: TEST_TIMEOUT_MS, logPrefix: `verify-${dir.replaceAll("/", "-")}`, cwd: join(root, dir) });
  if (step.status === "passed") return { name, ok: true, detail: command };
  return { name, ok: false, detail: `${step.status} · ${command} · log ${step.log}` };
}

function testsResult(root: string, run: TestRun, options: VerifyOptions): VerifyResult {
  return run.dir === "" ? umbrellaTests(root, run.command, options) : checkoutTests(root, run, options);
}

function skippedNote(skipped: number): string {
  return skipped ? ` (${skipped} unreadable line${skipped === 1 ? "" : "s"} skipped)` : "";
}

function driveResult(log: JsonlRead<DriveRow>, id: WorkId, n: number): VerifyResult {
  const drives = log.rows.filter((row) => row.kind === "drive" && row.work_id === id && row.phase === n);
  const last = drives.at(-1);
  const detail = last ? `${drives.length} drive-class command(s) observed, last: ${last.command?.slice(0, DRIVE_COMMAND_CHARS)}` : `no drive row for phase ${n} of this item`;
  return { name: "drive_observed", ok: drives.length > 0, detail: detail + skippedNote(log.skipped) };
}

function checkResult({ check, outcome, detail }: CheckResult): VerifyResult {
  return { name: `check:${check.covers}`, ok: outcome === "pass" || outcome === "prefix", detail };
}

function unreadableChecks(problems: string[]): VerifyResult[] {
  return problems.length ? [{ name: "drive_checks", ok: false, detail: `the record's drive list does not read: ${problems.join("; ")}` }] : [];
}

function driveResults(root: string, snap: WorkSnapshot, n: number): VerifyResult[] {
  const log = readDriveLog(root);
  const checks = phaseCheckResults(snap, log.rows, n);
  if (!checks) return [driveResult(log, snap.state.id, n)];
  return [...unreadableChecks(phaseCheckProblems(snap, n)), ...checks.map(checkResult)];
}

function changedPaths(root: string, snap: WorkSnapshot, planPaths: string[]): string[] {
  const rootChanges = snap.state.base ? changedSince(root, snap.state.base) : [];
  const repoChanges = snap.layout.repos.flatMap(({ path, base, worktree }) => (base ? changedSince(join(root, worktree ?? path), base).map((file) => posix.join(path, file)) : []));
  return [...new Set([...planPaths, ...rootChanges, ...repoChanges])];
}

function notChecked(reason: string): EnvironmentCheck {
  return { result: { name: "environment", ok: false, detail: `environment not checked: ${reason}` }, warnings: [], model: null };
}

function findingText({ finding }: LocatedFinding): string {
  return finding.service === null ? finding.message : `${finding.service}: ${finding.message}`;
}

function modelOrReason(engine: Engine, root: string): EnvModel | string {
  try {
    return readModel(readModelJson(engine, root));
  } catch (err) {
    return (err as Error).message;
  }
}

function environmentCheck(root: string, snap: WorkSnapshot, planPaths: string[], { env, cwd, runner = realRunner }: VerifyOptions): EnvironmentCheck {
  const { engine, machine } = machineCheck(env, cwd ?? root, root, runner);
  if (!engine || !machine.ok) return notChecked(machine.missing[0]?.split(":")[0] ?? "no container engine");
  const model = modelOrReason(engine, root);
  if (typeof model === "string") return notChecked(model);
  const errors = locatedFindings(scanUmbrella(root), model, root).filter(({ finding }) => finding.level === "error");
  const { caused, other } = splitByChange(errors, changedPaths(root, snap, planPaths));
  const detail = caused.length ? `out of step: ${caused.map(findingText).join("; ")}` : "in step for the paths this item changed";
  return { result: { name: "environment", ok: caused.length === 0, detail }, warnings: other.map((f) => `environment: ${findingText(f)}`), model };
}

function scenarioResult(ok: boolean, detail: string): VerifyResult {
  return { name: "scenarios", ok, detail };
}

function changedSinceReplay(root: string, snap: WorkSnapshot, model: EnvModel, run: RunRow, env: NodeJS.ProcessEnv): string {
  const apps = model.services.filter((service) => service.role === "app" && service.build !== null && service.profiles.length === 0);
  const changed = apps.filter((service) => run.versions[service.name] !== sourceFor(root, snap.layout, service, env).version).map((service) => service.name);
  return changed.length ? changed.join(", ") : "the environment";
}

function scenariosCheck(root: string, snap: WorkSnapshot, model: EnvModel, env: NodeJS.ProcessEnv): VerifyResult {
  const working = keyId(workingKey(root, snap.layout, model, env));
  if (working === keyId(baseKey(root, snap.layout, snap.state.base ?? null, model))) return scenarioResult(true, "no app or environment change since the base");
  const replay = `run picket env replay ${snap.state.id}`;
  const summary = replaySummary(readResults(root), snap.state.id);
  if (summary.run === null) return scenarioResult(false, `not replayed: ${replay}`);
  if (summary.run.reason !== undefined) return scenarioResult(false, `not replayed: ${summary.run.reason}; ${replay}`);
  if (summary.run.key !== working) return scenarioResult(false, `stale: ${changedSinceReplay(root, snap, model, summary.run, env)} changed since the replay; ${replay}`);
  if (summary.blamed.length) return scenarioResult(false, summary.blamed.map((entry) => `${entry.scenario} ${entry.class}`).join("; "));
  return scenarioResult(true, summaryText(summary));
}

export function verify(root: string, id: WorkId, n: number, options: VerifyOptions): VerifyReport {
  const snap = readSnapshot(root, id);
  const phase = phaseOf(snap, n);
  if (!phase) return notVerified(n, { name: "phase_exists", ok: false, detail: `no ## Phase ${n} in ${snap.artifact?.path ?? null}` });
  const mustHaves = phase.entry;
  if (!mustHaves) return notVerified(n, { name: "must_haves_declared", ok: false, detail: `frontmatter has no phases[] entry for n: ${n}` });
  const results: VerifyResult[] = [
    { name: "must_haves_declared", ok: true, detail: Object.keys(mustHaves).filter((key) => key !== "n").join(", ") },
    ...fileResults(root, snap.layout, mustHaves.files ?? []),
    ...grepResults(root, snap.layout, mustHaves.greps ?? []),
  ];
  const runs = mustHaves.tests ? testRuns(root, id, n) : [];
  results.push(...runs.map((run) => testsResult(root, run, options)));
  const warnings = runs.flatMap((run) => run.warnings);
  if (mustHaves.drive) results.push(...driveResults(root, snap, n));
  if (existsSync(join(root, ENV_DIR, COMPOSE_FILE))) {
    const environment = environmentCheck(root, snap, mustHaves.files ?? [], options);
    results.push(environment.result);
    warnings.push(...environment.warnings);
    if (environment.model !== null) results.push(scenariosCheck(root, snap, environment.model, options.env));
  }
  const report = { ok: results.every((result) => result.ok), phase: n, results };
  return warnings.length ? { ...report, warnings } : report;
}

export const verifyPhase = action<VerifyInput, VerifyReport>(async ({ id, phase, runTests }, { root, env, cwd }) => {
  const report = verify(root, id, phase, { runTests, env, cwd, runner: realRunner });
  return report.ok ? done(report) : failed(report);
});

function parseVerify(args: Args): VerifyInput {
  const [id, phase] = args.pos;
  if (!id || !phase) throw new UsageError("verify needs <id> <phase>");
  if (!PHASE_NUMBER.test(phase)) throw new UsageError(`verify needs a phase number, got "${phase}"`);
  return { id: workId(id), phase: Number(phase), runTests: !flag(args, "no-tests") };
}

function renderVerify(v: VerifyReport): string {
  const results = v.results.map((c) => `${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ": " + c.detail : ""}`);
  const warnings = (v.warnings ?? []).map((warning) => `warning: ${warning}`);
  return [...results, ...warnings, v.ok ? "VERIFIED" : "NOT VERIFIED"].join("\n");
}

export const verb: VerbSpec<VerifyInput, VerifyReport> = {
  usage: "verify <id> <phase> [--no-tests]",
  output: "json",
  parse: parseVerify,
  run: verifyPhase,
  render: renderVerify,
};
