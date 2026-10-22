import { action, done, failed } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { flag, UsageError, type Args } from "../../util/args.mts";
import { verify } from "./verify.mjs";

export type VerifyInput = { id: WorkId; phase: number; runTests: boolean };
export type VerifyResult = { name: string; ok: boolean; detail: string };
export type VerifyReport = { ok: boolean; phase: number; results: VerifyResult[] };

const PHASE_NUMBER = /^\d+$/;

export const verifyPhase = action<VerifyInput, VerifyReport>(async ({ id, phase, runTests }, { root }) => {
  const report = verify(id, phase, { root, runTests }) as VerifyReport;
  return report.ok ? done(report) : failed(report);
});

function parseVerify(args: Args): VerifyInput {
  const [id, phase] = args.pos;
  if (!id || !phase) throw new UsageError("verify needs <id> <phase>");
  if (!PHASE_NUMBER.test(phase)) throw new UsageError(`verify needs a phase number, got "${phase}"`);
  return { id: workId(id), phase: Number(phase), runTests: !flag(args, "no-tests") };
}

function renderVerify(v: VerifyReport): string {
  return v.results.map((c) => `${c.ok ? "ok  " : "FAIL"} ${c.name}${c.detail ? ": " + c.detail : ""}`).join("\n") + `\n${v.ok ? "VERIFIED" : "NOT VERIFIED"}`;
}

export const verb: VerbSpec<VerifyInput, VerifyReport> = {
  usage: "verify <id> <phase> [--no-tests]",
  output: "json",
  parse: parseVerify,
  run: verifyPhase,
  render: renderVerify,
};
