import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readText } from "../../util/io.mts";
import { phaseMarker, type WorkId } from "./files.mts";

export type BlockKind = "phase" | "review" | "artifact" | "report" | "expedited";

export const BLOCK_HEADINGS: readonly (readonly [BlockKind, RegExp])[] = [
  ["phase", /^##\s+Phase\s+\d+\s+of\s+[a-z0-9-]+/m],
  ["review", /^##\s+Review:\s+[a-z0-9-]+/m],
  ["artifact", /^##\s+(Order|Design|Amendment):\s+[a-z0-9-]+/m],
  ["report", /^##\s+Report:\s+[a-z0-9-]+/m],
  ["expedited", /^##\s+Expedited:\s+[a-z0-9-]+/m],
];

export function detectBlock(text: string | null | undefined): BlockKind | null {
  if (!text) return null;
  return BLOCK_HEADINGS.find(([, heading]) => heading.test(text))?.[0] ?? null;
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
