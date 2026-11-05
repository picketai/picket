import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readText } from "../../util/io.mts";
import { phaseMarker, type WorkId } from "./files.mts";
import { hasMarker } from "./markers.mts";

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

export const BLOCK_FIELDS = {
  phase: ["Files", "Tests", "Lint", "Verified", "Red", "Root cause", "Decisions", "Comments", "Waivers", "Commit"],
  review: ["Classes"],
  artifact: ["Artifact"],
  report: ["Report"],
  expedited: ["Decisions", "Waivers"],
} as const satisfies Readonly<Record<BlockKind, readonly string[]>>;

export type BlockField<K extends BlockKind = BlockKind> = (typeof BLOCK_FIELDS)[K][number];

export type Block = { title: string | null; headline: string; fields: Record<string, string>; commitBody: string; verdict: "PHASE DONE" | "PHASE STALLED" | null };

const PHASE_FIELDS: readonly string[] = BLOCK_FIELDS.phase;
const COMMIT: BlockField<"phase"> = "Commit";

export function blockField(block: Block, label: BlockField<"phase">): string | undefined {
  if (!PHASE_FIELDS.includes(label)) throw new Error(`"${label}" is not a phase block field (${PHASE_FIELDS.join(", ")})`);
  return block.fields[label.toLowerCase()];
}

const PATH_TOKEN = /^[\w.@\-\/\\]*\.[A-Za-z0-9]+$/;
const PATH_SEPARATORS = /[\s,():;`]+/;
const KNOWN_LABEL = [...new Set(Object.values(BLOCK_FIELDS).flat())].join("|");
const PLAIN_LABEL = String.raw`Root cause|[A-Z][a-z]+`;
const LIST_MARKER = String.raw`(?:[-*]|\d+\.)\s+`;
const BOLD_LABEL = String.raw`\*\*(?<bold>${KNOWN_LABEL})(?::\*\*|\*\*:)`;
const LISTED_LABEL = `(?:${LIST_MARKER})?(?:${BOLD_LABEL}|(?<listed>${KNOWN_LABEL}):)`;
const LABEL_LINE = new RegExp(`^(?:${LISTED_LABEL}|(?<plain>${PLAIN_LABEL}):)(?<value>\\s.*)?$`);
const LIST_ITEM = new RegExp(`^\\s*${LIST_MARKER}(?<text>\\S.*)$`);
const INDENTED = /^\s+\S/;
const VALUE_JOIN = "; ";
const FIXES_ENTRY = /^(?=## Phase )/m;

type LabelLine = { label: string; value: string; isListed: boolean };
type ListItems = { items: string[]; last: number };

export function blockPath(root: string, id: WorkId, n: number): string {
  return phaseMarker(root, id, n, "block.md");
}

function fixesPath(root: string, id: WorkId, n: number): string {
  return join(dirname(blockPath(root, id, n)), `${n}.fixes.md`);
}

export function normalisedBlock(text: string): string {
  return text.replace(/\r\n/g, "\n").trim() + "\n";
}

export function saveBlock(root: string, id: WorkId, n: number, text: string): void {
  const path = blockPath(root, id, n);
  mkdirSync(dirname(path), { recursive: true });
  const block = normalisedBlock(text);
  if (!hasMarker(root, id, n, "approved")) return writeFileSync(path, block);
  const fixes = fixesPath(root, id, n);
  appendFileSync(fixes, existsSync(fixes) ? "\n" + block : block);
}

export function readBlock(root: string, id: WorkId, n: number): string | null {
  return readText(blockPath(root, id, n));
}

export function latestSavedBlock(root: string, id: WorkId, n: number): string | null {
  const fixes = readText(fixesPath(root, id, n))?.split(FIXES_ENTRY).at(-1);
  const latest = fixes?.trim() ? fixes : readBlock(root, id, n);
  return latest === null ? null : normalisedBlock(latest);
}

function filesOf(block: string): string[] {
  const files = blockField(parseBlock(block), "Files") ?? "";
  return files.split(PATH_SEPARATORS).filter((token) => PATH_TOKEN.test(token));
}

export function blockFiles(root: string, id: WorkId, n: number): string[] {
  return filesOf(readBlock(root, id, n) ?? "");
}

export function fixesFiles(root: string, id: WorkId, n: number): string[] {
  const entries = readText(fixesPath(root, id, n))?.split(FIXES_ENTRY) ?? [];
  return entries.flatMap(filesOf);
}

function labelLine(line: string): LabelLine | null {
  const groups = line.match(LABEL_LINE)?.groups;
  if (!groups) return null;
  return { label: groups.bold ?? groups.listed ?? groups.plain, value: (groups.value ?? "").trim(), isListed: LIST_ITEM.test(line) };
}

function listItemsAfter(lines: string[], from: number, field: LabelLine): ListItems {
  const items: string[] = [];
  let last = from - 1;
  for (let i = from; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const opensField = field.isListed && labelLine(lines[i]) !== null;
    const text = opensField ? undefined : lines[i].match(LIST_ITEM)?.groups?.text;
    if (text === undefined) break;
    items.push(text.trim());
    last = i;
  }
  return { items, last };
}

function indentedBody(lines: string[], from: number): string {
  let end = from;
  while (end < lines.length && (!lines[end].trim() || INDENTED.test(lines[end]))) end++;
  const body = lines.slice(from, end);
  const indents = body.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return body.map((line) => line.slice(cut).trimEnd()).join("\n").trim();
}

function isBlockVerdict(line: string): line is NonNullable<Block["verdict"]> {
  return /^(PHASE DONE|PHASE STALLED)$/.test(line);
}

export function parseBlock(text: string | null | undefined): Block {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: Block = { title: null, headline: "", fields: {}, commitBody: "", verdict: null };
  let i = 0;
  while (i < lines.length && !/^## /.test(lines[i])) i++;
  if (i < lines.length) {
    out.title = lines[i].replace(/^## /, "").trim();
    i++;
  }
  while (i < lines.length && !lines[i].trim()) i++;
  const para: string[] = [];
  while (i < lines.length && lines[i].trim() && !labelLine(lines[i])) para.push(lines[i].trim()), i++;
  out.headline = para.join(" ");
  for (; i < lines.length; i++) {
    const field = labelLine(lines[i]);
    if (!field) continue;
    const key = field.label.toLowerCase();
    if (field.label === COMMIT) {
      out.fields[key] = field.value;
      out.commitBody = indentedBody(lines, i + 1);
    } else {
      const { items, last } = listItemsAfter(lines, i + 1, field);
      out.fields[key] = [field.value, ...items].filter(Boolean).join(VALUE_JOIN);
      i = last;
    }
  }
  const last = lines.filter((l) => l.trim()).at(-1)?.trim() ?? "";
  if (isBlockVerdict(last)) out.verdict = last;
  return out;
}

export const COMMENT_SEPARATOR = /(?<=")\s*;\s+/;
export const WAIVER_SEPARATOR = /;\s+(?=\S+:\d+\s+"|\S+\s+deleted\b)/;

export type CommentProposal = { path: string; line: number; text: string };
export type WaiverProposal = { path: string; text: string | null; deleted: boolean };

const COMMENT_PROPOSAL = /^(?<path>\S+):(?<line>\d+)\s+"(?<text>.*)"$/;
const WAIVER_LINE_PROPOSAL = /^(?<path>\S+):\d+\s+"(?<text>.*)"\s+because\s+\S/;
const WAIVER_DELETED_PROPOSAL = /^(?<path>\S+)\s+deleted\s+because\s+\S/;

export function proposals(value: string | null | undefined, separator: RegExp): string[] {
  const v = String(value ?? "").trim();
  if (!v || /^none\.?$/i.test(v)) return [];
  return v.split(separator).map((s) => s.trim()).filter(Boolean);
}

export function commentProposal(text: string): CommentProposal | null {
  const groups = text.trim().match(COMMENT_PROPOSAL)?.groups;
  return groups ? { path: groups.path, line: Number(groups.line), text: groups.text } : null;
}

export function waiverProposal(text: string): WaiverProposal | null {
  const trimmed = text.trim();
  const deleted = trimmed.match(WAIVER_DELETED_PROPOSAL)?.groups;
  if (deleted) return { path: deleted.path, text: null, deleted: true };
  const line = trimmed.match(WAIVER_LINE_PROPOSAL)?.groups;
  return line ? { path: line.path, text: line.text, deleted: false } : null;
}

export function proposedCommit(block: Block): string | null {
  const commit = blockField(block, "Commit");
  if (!commit) return null;
  return block.commitBody ? `${commit}\n\n${block.commitBody}` : commit;
}
