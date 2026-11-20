import type { ResultRow, ScenarioOutcome } from "./results.mts";

export const RESULT_CLASSES = ["passed", "new failure", "failing before the item", "known defect", "no base result", "replaced by this item", "unstable", "blocked", "not run"] as const;
export type ResultClass = (typeof RESULT_CLASSES)[number];

const BLAMED: readonly ResultClass[] = ["new failure", "no base result"];

function againstBase(base: ResultRow | null): ResultClass {
  if (base?.outcome === "passed") return "new failure";
  if (base?.outcome === "failed") return "failing before the item";
  return "no base result";
}

export function classify(item: { outcome: ScenarioOutcome; unstable: boolean }, base: ResultRow | null, replaced: boolean, known: string | null): ResultClass {
  if (item.unstable) return "unstable";
  if (item.outcome === "passed") return "passed";
  if (item.outcome === "blocked" || item.outcome === "not run") return item.outcome;
  if (replaced) return "replaced by this item";
  if (known !== null) return "known defect";
  return againstBase(base);
}

export function isBlamed(cls: ResultClass): boolean {
  return BLAMED.includes(cls);
}
