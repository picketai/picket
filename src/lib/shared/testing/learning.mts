import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DefectEntry } from "../scenarios/defects.mts";
import { HOST_DIR } from "../paths.mts";
import { escapeRole, REVIEW_ROW, UNIT_TEST, DECLARED_CHECK, type EscapeRole } from "./escapes.mts";

export type EscapeCount = { point: string; role: EscapeRole | null; items: string[]; entries: DefectEntry[] };

export const LEARNING_FILE = "escaped-defects.md";
const MIN_ITEMS = 2;
const MEMORY_INDEX = "MEMORY.md";
const INDEX_LINE = `- [Escaped defects](${LEARNING_FILE}): defects that got past this role's check, counted by picket close`;
const NO_ROOT_CAUSE = "no root cause recorded";

export function memoryFolder(role: EscapeRole): string {
  return `${HOST_DIR}/agent-memory/picket-${role}`;
}

export function learningPath(role: EscapeRole): string {
  return `${memoryFolder(role)}/${LEARNING_FILE}`;
}

export function escapeCounts(entries: readonly DefectEntry[]): EscapeCount[] {
  const byPoint = new Map<string, DefectEntry[]>();
  for (const entry of entries) if (entry.escaped !== undefined) byPoint.set(entry.escaped, [...(byPoint.get(entry.escaped) ?? []), entry]);
  return [...byPoint]
    .map(([point, counted]) => ({ point, role: escapeRole(point), items: [...new Set(counted.map((entry) => entry.found_in))], entries: counted }))
    .filter((count) => count.items.length >= MIN_ITEMS)
    .sort((a, b) => a.point.localeCompare(b.point));
}

function pointText(point: string): string {
  if (point === UNIT_TEST || point === DECLARED_CHECK) return `a ${point}`;
  return REVIEW_ROW.test(point) ? `review row ${point}` : point;
}

function countLine({ point, items, entries }: EscapeCount): string {
  const named = entries.map((entry) => `${entry.id} (${entry.found_in}): ${entry.root_cause ?? NO_ROOT_CAUSE}`);
  return `- Defects escaped ${pointText(point)} in ${items.length} items: ${named.join("; ")}.`;
}

function learningText(counts: readonly EscapeCount[]): string {
  const front = ["---", "name: escaped-defects", "description: defects that got past this role's check in two or more items, counted by picket close", "metadata:", "  type: feedback", "---"];
  return [...front, "", ...counts.map(countLine), ""].join("\n");
}

function indexed(root: string, role: EscapeRole): void {
  const path = join(root, memoryFolder(role), MEMORY_INDEX);
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (text.includes(`(${LEARNING_FILE})`)) return;
  writeFileSync(path, `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}${INDEX_LINE}\n`);
}

export function writeLearning(root: string, counts: readonly EscapeCount[]): string[] {
  const roles = [...new Set(counts.flatMap((count) => (count.role === null ? [] : [count.role])))].sort();
  return roles.map((role) => {
    mkdirSync(join(root, memoryFolder(role)), { recursive: true });
    writeFileSync(join(root, learningPath(role)), learningText(counts.filter((count) => count.role === role)));
    indexed(root, role);
    return learningPath(role);
  });
}
