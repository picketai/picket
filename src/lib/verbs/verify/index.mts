import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { action, done, failed } from "../../shared/action.mts";
import { runStep } from "../../shared/checks.mts";
import { readDriveLog } from "../../shared/drive-log.mts";
import { detectTooling } from "../../shared/tooling.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import type { GrepEntry } from "../../shared/work/artifact.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { phaseOf, readSnapshot } from "../../shared/work/snapshot.mts";
import { flag, UsageError, type Args } from "../../util/args.mts";

export type VerifyInput = { id: WorkId; phase: number; runTests: boolean };
export type VerifyResult = { name: string; ok: boolean; detail: string };
export type VerifyReport = { ok: boolean; phase: number; results: VerifyResult[]; warnings?: string[] };
export type VerifyOptions = { runTests: boolean; env: NodeJS.ProcessEnv };

const PHASE_NUMBER = /^\d+$/;
const TEST_TIMEOUT_MS = 300_000;
const DRIVE_COMMAND_CHARS = 80;

function notVerified(phase: number, result: VerifyResult): VerifyReport {
  return { ok: false, phase, results: [result] };
}

function fileResults(root: string, files: string[]): VerifyResult[] {
  return files.map((file) => ({ name: `file:${file}`, ok: existsSync(join(root, file)), detail: "" }));
}

function grepResults(root: string, greps: GrepEntry[]): VerifyResult[] {
  return greps.map(({ path, pattern, flags }) => {
    const file = join(root, path);
    const ok = existsSync(file) && new RegExp(pattern, flags ?? "m").test(readFileSync(file, "utf8"));
    return { name: `grep:${path}:${pattern}`, ok, detail: "" };
  });
}

function testsResult(root: string, command: string | null, { runTests, env }: VerifyOptions): VerifyResult {
  if (!command) return { name: "tests", ok: false, detail: "no test command detected" };
  if (!runTests) return { name: "tests", ok: true, detail: `skipped (${command})` };
  const step = runStep(root, "test", command, { env, timeoutMs: TEST_TIMEOUT_MS, logPrefix: "verify" });
  if (step.status === "passed") return { name: "tests", ok: true, detail: command };
  return { name: "tests", ok: false, detail: `${step.status} · ${command} · log ${step.log}` };
}

function skippedNote(skipped: number): string {
  return skipped ? ` (${skipped} unreadable line${skipped === 1 ? "" : "s"} skipped)` : "";
}

function driveResult(root: string, id: WorkId, n: number): VerifyResult {
  const log = readDriveLog(root);
  const drives = log.rows.filter((row) => row.kind === "drive" && (row.work_id === id || !row.work_id) && (row.phase === n || row.phase == null));
  const last = drives.at(-1);
  const detail = last ? `${drives.length} drive-class command(s) observed, last: ${last.command?.slice(0, DRIVE_COMMAND_CHARS)}` : "no drive-class command observed for this phase";
  return { name: "drive_observed", ok: drives.length > 0, detail: detail + skippedNote(log.skipped) };
}

export function verify(root: string, id: WorkId, n: number, options: VerifyOptions): VerifyReport {
  const snap = readSnapshot(root, id);
  const phase = phaseOf(snap, n);
  if (!phase) return notVerified(n, { name: "phase_exists", ok: false, detail: `no ## Phase ${n} in ${snap.artifact?.path ?? null}` });
  const mustHaves = phase.entry;
  if (!mustHaves) return notVerified(n, { name: "must_haves_declared", ok: false, detail: `frontmatter has no phases[] entry for n: ${n}` });
  const results: VerifyResult[] = [
    { name: "must_haves_declared", ok: true, detail: Object.keys(mustHaves).filter((key) => key !== "n").join(", ") },
    ...fileResults(root, mustHaves.files ?? []),
    ...grepResults(root, mustHaves.greps ?? []),
  ];
  const { tooling, warnings } = mustHaves.tests ? detectTooling(root) : { tooling: null, warnings: [] };
  if (tooling) results.push(testsResult(root, tooling.test, options));
  if (mustHaves.drive) results.push(driveResult(root, id, n));
  const report = { ok: results.every((result) => result.ok), phase: n, results };
  return warnings.length ? { ...report, warnings } : report;
}

export const verifyPhase = action<VerifyInput, VerifyReport>(async ({ id, phase, runTests }, { root, env }) => {
  const report = verify(root, id, phase, { runTests, env });
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
