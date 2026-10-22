import { action, done, failed } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { preflight } from "./preflight.mjs";

export type PreflightInput = { id: WorkId };
export type PreflightCheck = { level: string; name: string; detail: string };
export type PreflightReport = { ok: boolean; checks: PreflightCheck[] };

export const preflightReport = action<PreflightInput, PreflightReport>(async ({ id }, { root, home }) => {
  const report = preflight(id, root, home) as PreflightReport;
  return report.ok ? done(report) : failed(report);
});

function parsePreflight(args: Args): PreflightInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("preflight needs <id>");
  return { id: workId(id) };
}

function renderPreflight(v: PreflightReport): string {
  return v.checks.map((c) => `${c.level.padEnd(4)} ${c.name}: ${c.detail}`).join("\n") + `\n${v.ok ? "PREFLIGHT OK" : "PREFLIGHT FAILED"}`;
}

export const verb: VerbSpec<PreflightInput, PreflightReport> = {
  usage: "preflight <id>",
  output: "json",
  parse: parsePreflight,
  run: preflightReport,
  render: renderPreflight,
};
