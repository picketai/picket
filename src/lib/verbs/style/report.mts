import { done, failed, type Outcome } from "../../shared/action.mts";
import type { StyleReport } from "../../shared/styling/plan.mts";

export type { StyleChange, StyleReport } from "../../shared/styling/plan.mts";

export function reportOutcome(report: StyleReport): Outcome<StyleReport> {
  return report.changes.some((change) => change.result === "failed") ? failed(report) : done(report);
}
