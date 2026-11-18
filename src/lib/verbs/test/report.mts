import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { action, done } from "../../shared/action.mts";
import { deriveVerdict, type Derived } from "../../shared/testing/derive.mts";
import { openTestItem, testFacts, testReportPath } from "../../shared/testing/facts.mts";
import { renderReport, roundCounts } from "../../shared/testing/report.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type ReportInput = { id: WorkId };
export type ReportOutput = { id: WorkId; counts: string; derived: Derived };

export const report = action<ReportInput, ReportOutput>(async ({ id }, { root }) => {
  const { snap } = openTestItem(root, id);
  const facts = testFacts(root, snap);
  const derived = deriveVerdict(facts);
  const text = renderReport({ id, round: facts.round, derived, rows: facts.rows, criteria: facts.criteria });
  const path = testReportPath(root, id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return done({ id, counts: roundCounts(facts.rows, facts.round), derived });
});

function verdictText({ id, derived }: ReportOutput): string {
  const [unclassified] = derived.unclassified;
  if (unclassified !== undefined) return `unclassified: ${derived.unclassified.join(", ")}; run picket test classify ${id} ${unclassified} <product|test|environment> --evidence <why>`;
  return `verdict: ${derived.verdict}${derived.route === null ? "" : ` · route ${derived.route}`}`;
}

function parseReport(args: Args): ReportInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("test report needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<ReportInput, ReportOutput> = {
  usage: "test report <id>",
  output: "text",
  parse: parseReport,
  run: report,
  render: (output) => `${output.counts}\n${verdictText(output)}`,
};
