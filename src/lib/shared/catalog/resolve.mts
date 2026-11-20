import { browserTexts, isBrowserStep, type Card, type Step } from "../scenarios/format.mts";
import { runScenario, type RunInput } from "../scenarios/runner.mts";
import { asCard, listEntries, type CatalogEntry, type EntryKind } from "./entry.mts";

export type DataResolution = { data: Record<string, string> } | { blocked: string };
export type EntryRun = Omit<RunInput, "card" | "data">;

const DATA_NAME = /\{data:([a-z][a-z0-9-]*)\.[a-z][a-z0-9_]*\}/g;

const FAILED_ENTRY: Record<EntryKind, (name: string) => string> = {
  find: (name) => `no matching data: ${name}`,
  fixed: (name) => `data drift: ${name} is missing`,
  sql: (name) => `no matching data: ${name}; its SQL file runs with picket data run`,
  create: (name) => `could not create data: ${name}`,
  user: (name) => `no matching data: ${name}`,
};

function stepTexts(step: Step): string[] {
  if (step.word === "request") return [step.target, ...step.headers.map(([, value]) => value), ...(step.body === null ? [] : [step.body])];
  if (step.word === "expect" && step.what === "contains") return [step.text];
  return isBrowserStep(step) ? browserTexts(step) : [];
}

export function dataRefs(card: Card): string[] {
  const names = card.steps.flatMap(stepTexts).flatMap((text) => [...text.matchAll(DATA_NAME)].map((match) => match[1]));
  return [...new Set(names)];
}

export function catalogOf(root: string): CatalogEntry[] {
  return listEntries(root).flatMap((file) => (file.entry === null ? [] : [file.entry]));
}

export async function resolveData(card: Card, catalog: readonly CatalogEntry[], run: EntryRun): Promise<DataResolution> {
  const data: Record<string, string> = {};
  for (const name of dataRefs(card)) {
    const entry = catalog.find((candidate) => candidate.name === name);
    if (entry === undefined) return { blocked: `no catalog entry ${name}` };
    const ran = await runScenario({ ...run, card: asCard(entry.steps), data: {} });
    if (ran.outcome !== "passed") return { blocked: FAILED_ENTRY[entry.kind](name) };
    for (const [capture, value] of Object.entries(ran.captures)) data[`${name}.${capture}`] = value;
  }
  return { data };
}
