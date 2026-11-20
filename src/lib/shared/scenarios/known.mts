import { join, posix } from "node:path";
import { MOCK_DIR, CATALOG_DIR } from "../env/standard.mts";
import { changedSince } from "../git.mts";
import { HOST_DIR, PICKET_DIR, WORK_DIR } from "../paths.mts";
import type { ItemLayout } from "../repos.mts";
import type { ResultClass } from "./compare.mts";
import type { ResultRow, RunMode, ScenarioRow, Versions } from "./results.mts";

export type StoppedInput = { base: ResultRow | null; lastFailing: ResultRow | null; masked: string[]; named: boolean; changes: string[] };
export type Stopped = { class: ResultClass; detail: string };

const TAG_SEPARATOR = "-t";
const NO_COMMIT_CHANGED = "no app commit changed";
const NO_FAILING_RUN = "no failing run recorded";
const NO_BASE_PREFIX = "no base result; ";
const NOTHING_CHANGED = "nothing";
const FAILING_MODES: readonly RunMode[] = ["full", "affected", "base"];
const BOOKKEEPING = [`${WORK_DIR}/`, `${HOST_DIR}/`, `${PICKET_DIR}/state/`];

function commitOf(version: string): string {
  const at = version.indexOf(TAG_SEPARATOR);
  return at < 0 ? version : version.slice(0, at);
}

export function commitRange(from: Versions, to: Versions): string {
  const moved = Object.keys(from)
    .filter((app) => to[app] !== undefined && commitOf(from[app]) !== commitOf(to[app]))
    .map((app) => `${app} ${commitOf(from[app])}..${commitOf(to[app])}`);
  return moved.length ? moved.join(", ") : NO_COMMIT_CHANGED;
}

export function itemChanges(root: string, layout: ItemLayout, base: string | null): string[] {
  const rootChanges = base ? changedSince(root, base) : [];
  const repoChanges = layout.repos.flatMap(({ path, base: repoBase, worktree }) => (repoBase ? changedSince(join(root, worktree ?? path), repoBase).map((file) => posix.join(path, file)) : []));
  const product = [...rootChanges, ...repoChanges].filter((file) => !BOOKKEEPING.some((prefix) => file.startsWith(prefix)));
  return [...new Set(product)].sort();
}

export function maskedBy(changes: readonly string[], cardPath: string): string[] {
  return changes.filter((file) => file.startsWith(`${MOCK_DIR}/`) || file.startsWith(`${CATALOG_DIR}/`) || file === cardPath);
}

export function namesDefect(texts: readonly string[], id: string): boolean {
  const word = new RegExp(`\\b${id}\\b`);
  return texts.some((text) => word.test(text));
}

export function lastFailing(rows: readonly ScenarioRow[], scenario: string): ResultRow | null {
  const modes = new Map(rows.flatMap((row) => (row.type === "run" ? [[row.run, row.mode] as const] : [])));
  const failed = rows.filter((row): row is ResultRow => row.type === "result" && row.scenario === scenario && row.outcome === "failed" && FAILING_MODES.includes(modes.get(row.run) ?? "only"));
  return failed.at(-1) ?? null;
}

function changedText(files: readonly string[]): string {
  return `changed: ${files.length ? files.join(", ") : NOTHING_CHANGED}`;
}

export function stoppedFailing({ base, lastFailing: failing, masked, named, changes }: StoppedInput): Stopped {
  if (base?.outcome === "passed") return { class: "fixed outside this item", detail: failing === null ? NO_FAILING_RUN : commitRange(failing.versions, base.versions) };
  if (masked.length > 0) return { class: "possibly masked", detail: changedText(masked) };
  if (base?.outcome === "failed" && named) return { class: "fixed by this item", detail: "" };
  return { class: "side effect", detail: `${base === null ? NO_BASE_PREFIX : ""}${changedText(changes)}` };
}
