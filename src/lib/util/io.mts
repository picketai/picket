import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export type JsonlRead<T> = { rows: T[]; skipped: number };

function isMissing(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === "ENOENT";
}

export function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
}

export function readJson<T>(path: string): T | null {
  const text = readText(path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function readJsonl<T>(path: string): JsonlRead<T> {
  const rows: T[] = [];
  let skipped = 0;
  for (const line of (readText(path) ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as T);
    } catch {
      skipped++;
    }
  }
  return { rows, skipped };
}

export function appendJsonl(path: string, row: object): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(row)}\n`);
}
