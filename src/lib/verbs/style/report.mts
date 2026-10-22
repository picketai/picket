import { done, failed, type Outcome } from "../../shared/action.mts";

export type StyleChange = { id: string; result: string } & Record<string, unknown>;
export type StyleReport = { changes: StyleChange[]; restart: string[]; manual: string[] };

export function reportOutcome(report: StyleReport): Outcome<StyleReport> {
  return report.changes.some((change) => change.result === "failed") ? failed(report) : done(report);
}
