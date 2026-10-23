import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readText } from "../../util/io.mts";
import { phaseMarker, type WorkId } from "./files.mts";

export type BlockKind = "phase" | "review" | "artifact" | "report" | "expedited";

export type ReviewScope = "crosscheck" | "phase" | "cumulative" | "checkpoint" | "pr";
export type BlockHeading = { kind: BlockKind; id: string; phase: number | null; scope: ReviewScope | null; index: number };

export const BLOCK_HEADINGS: readonly (readonly [BlockKind, RegExp])[] = [
  ["phase", /^##\s+Phase\s+(?<phase>\d+)\s+of\s+(?<id>[a-z0-9-]+)/m],
  ["review", /^##\s+Review:\s+(?<id>[a-z0-9-]+)(?:\s*·\s*(?<scope>crosscheck|phase\s+(?<phase>\d+)|cumulative|checkpoint|pr))?/m],
  ["artifact", /^##\s+(?:Order|Design|Amendment):\s+(?<id>[a-z0-9-]+)/m],
  ["report", /^##\s+Report:\s+(?<id>[a-z0-9-]+)/m],
  ["expedited", /^##\s+Expedited:\s+(?<id>[a-z0-9-]+)/m],
];

export function detectBlock(text: string | null | undefined): BlockKind | null {
  if (!text) return null;
  return BLOCK_HEADINGS.find(([, heading]) => heading.test(text))?.[0] ?? null;
}

function scopeOf(scope: string | undefined): ReviewScope | null {
  if (scope === undefined) return null;
  return scope.startsWith("phase") ? "phase" : (scope as ReviewScope);
}

function headingOf(kind: BlockKind, match: RegExpExecArray): BlockHeading {
  const { id, phase, scope } = match.groups ?? {};
  return { kind, id, phase: phase === undefined ? null : Number(phase), scope: scopeOf(scope), index: match.index };
}

export function readHeading(text: string | null | undefined): BlockHeading | null {
  if (!text) return null;
  const found = BLOCK_HEADINGS.flatMap(([kind, heading]) => {
    const match = heading.exec(text);
    return match ? [headingOf(kind, match)] : [];
  });
  return found.reduce<BlockHeading | null>((earliest, heading) => (earliest === null || heading.index < earliest.index ? heading : earliest), null);
}

export type Block = { title: string | null; headline: string; fields: Record<string, string>; verdict: "PHASE DONE" | "PHASE STALLED" | null };

const PATH_TOKEN = /^[\w.@\-\/\\]*\.[A-Za-z0-9]+$/;
const FIELD_LABEL = String.raw`Root cause|[A-Z][a-z]+`;
const FIELD_START = new RegExp(`^(${FIELD_LABEL}):\\s`);
const FIELD_LINE = new RegExp(`^(${FIELD_LABEL}):\\s*(.*)$`);
const STAGED_TAIL = /\s*\(staged.*\)$/i;

export function blockPath(root: string, id: WorkId, n: number): string {
  return phaseMarker(root, id, n, "block.md");
}

export function saveBlock(root: string, id: WorkId, n: number, text: string): void {
  const path = blockPath(root, id, n);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text.replace(/\r\n/g, "\n").trim() + "\n");
}

export function readBlock(root: string, id: WorkId, n: number): string | null {
  return readText(blockPath(root, id, n));
}

export function blockFiles(root: string, id: WorkId, n: number): string[] {
  const files = parseBlock(readBlock(root, id, n) ?? "").fields.files ?? "";
  return files.split(/[\s,():]+/).filter((token) => PATH_TOKEN.test(token));
}

function isBlockVerdict(line: string): line is NonNullable<Block["verdict"]> {
  return /^(PHASE DONE|PHASE STALLED)$/.test(line);
}

export function parseBlock(text: string | null | undefined): Block {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: Block = { title: null, headline: "", fields: {}, verdict: null };
  let i = 0;
  while (i < lines.length && !/^## /.test(lines[i])) i++;
  if (i < lines.length) {
    out.title = lines[i].replace(/^## /, "").trim();
    i++;
  }
  while (i < lines.length && !lines[i].trim()) i++;
  const para: string[] = [];
  while (i < lines.length && lines[i].trim() && !FIELD_START.test(lines[i])) para.push(lines[i].trim()), i++;
  out.headline = para.join(" ");
  for (; i < lines.length; i++) {
    const m = lines[i].match(FIELD_LINE);
    if (m) out.fields[m[1].toLowerCase()] = m[2].trim();
  }
  const last = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  if (isBlockVerdict(last)) out.verdict = last;
  return out;
}

export function proposedCommit(block: Block): string | null {
  const commit = block.fields.commit;
  return commit ? commit.replace(STAGED_TAIL, "") : null;
}
