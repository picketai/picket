import { closeSync, existsSync, fstatSync, openSync, readSync } from "node:fs";
import type { TranscriptEntry } from "./entries.mts";

export const TAIL_WINDOWS = [512 * 1024, 4 * 1024 * 1024, Infinity] as const;

export type TailOptions = { maxBytes?: number; contains?: string };

const NEWLINE = 0x0a;

function readRange(fd: number, start: number, end: number): Buffer {
  const buf = Buffer.allocUnsafe(end - start);
  readSync(fd, buf, 0, buf.length, start);
  return buf;
}

function withoutCutLine(chunk: Buffer): Buffer {
  const nl = chunk.indexOf(NEWLINE);
  return nl === -1 ? Buffer.alloc(0) : chunk.subarray(nl + 1);
}

export function tailText(path: string | null | undefined, maxBytes: number): string {
  if (!path || !existsSync(path)) return "";
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const chunk = readRange(fd, start, size);
    return (start > 0 ? withoutCutLine(chunk) : chunk).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

function windowsUpTo(maxBytes: number): number[] {
  return [...TAIL_WINDOWS.filter((window) => window < maxBytes), maxBytes];
}

function parsed(line: string): TranscriptEntry | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function* parsedFromEnd(text: string, contains: string | undefined): Generator<TranscriptEntry> {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.trim() || (contains !== undefined && !line.includes(contains))) continue;
    const entry = parsed(line);
    if (entry !== null) yield entry;
  }
}

export function* entriesFromEnd(path: string | null | undefined, { maxBytes = Infinity, contains }: TailOptions = {}): Generator<TranscriptEntry> {
  if (!path || !existsSync(path)) return;
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    let end = size;
    let carry = Buffer.alloc(0);
    for (const window of windowsUpTo(maxBytes)) {
      const start = Math.max(0, size - window);
      const chunk = Buffer.concat([readRange(fd, start, end), carry]);
      end = start;
      if (start === 0) {
        yield* parsedFromEnd(chunk.toString("utf8"), contains);
        return;
      }
      const nl = chunk.indexOf(NEWLINE);
      carry = nl === -1 ? chunk : chunk.subarray(0, nl);
      yield* parsedFromEnd(withoutCutLine(chunk).toString("utf8"), contains);
    }
  } finally {
    closeSync(fd);
  }
}
