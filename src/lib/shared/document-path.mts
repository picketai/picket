import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { UsageError } from "../util/args.mts";
import { workId, workRel, type WorkId } from "./work/files.mts";

export const DOCUMENT_KINDS = ["order", "design", "report", "charter", "context-map", "sdr", "glossary", "api"] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
type WorkKind = "order" | "design";
type ArtifactKind = Exclude<DocumentKind, WorkKind>;

export type DocumentRequest = { kind: DocumentKind; subject?: string; work?: string };
export type DocumentNaming = { subject?: string; work?: string; sequence?: number };
export type DocumentName = { path: string; exists: boolean };

const DECISIONS_FOLDER = "artifacts/strategy/decisions";

const FOLDERS: Record<ArtifactKind, string> = {
  report: "artifacts/reports",
  charter: "artifacts/strategy/charters",
  "context-map": "artifacts/strategy/context-maps",
  sdr: DECISIONS_FOLDER,
  glossary: "artifacts/strategy/glossary",
  api: "artifacts/api",
};

const META_PREFIXES = [
  "Specification of", "Specification for", "Documentation of",
  "Analysis of", "Design of", "Plan for", "Review of", "Audit of",
  "Migration to", "Migration of", "Refactor of",
  "Charter for", "Charter of", "Glossary for", "Map of", "Context map of", "Context map for",
  "Progress for", "Progress of", "Progress on", "SDR for", "SDR on",
  "Spec of", "Spec for", "Scope of", "Document",
].map((prefix) => `${prefix.toLowerCase()} `);

const STOPWORDS = new Set("a an the of for to in on at with and or but by from as into our your my this that these those".split(" "));
const HTTP_METHOD = /^\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i;
const API_VERSION = /^v\d+$/;
const SLUG_TOKENS = 5;
const SEQUENCE_DIGITS = 5;
const SEQUENCED_FILE = /^(\d{5})-/;

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value);
}

function isWorkKind(kind: DocumentKind): kind is WorkKind {
  return kind === "order" || kind === "design";
}

function withoutMetaPrefix(subject: string): string {
  const prefix = META_PREFIXES.find((meta) => subject.toLowerCase().startsWith(meta));
  return prefix === undefined ? subject : subject.slice(prefix.length);
}

function isApiNoise(token: string): boolean {
  return token === "api" || API_VERSION.test(token);
}

export function documentSlug(kind: DocumentKind, subject: string): string | null {
  const phrase = withoutMetaPrefix(kind === "api" ? subject.replace(HTTP_METHOD, "").trim() : subject);
  const tokens = phrase
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !STOPWORDS.has(token))
    .filter((token) => kind !== "api" || !isApiNoise(token));
  return tokens.length === 0 ? null : tokens.slice(0, SLUG_TOKENS).join("-");
}

function workItem(kind: WorkKind, work: string | undefined): WorkId {
  if (work === undefined) throw new UsageError(`${kind} needs --work <id>`);
  return workId(work);
}

function artifactSlug(kind: ArtifactKind, subject: string | undefined, work: string | undefined): string {
  if (work !== undefined) throw new UsageError(`--work is for order and design; a ${kind} lives under ${FOLDERS[kind]}/`);
  if (!subject?.trim()) throw new UsageError(`${kind} needs a subject`);
  const slug = documentSlug(kind, subject);
  if (slug === null) throw new UsageError(`"${subject}" leaves no word for a name once stopwords are dropped`);
  return slug;
}

export function documentRequest(kind: string, { subject, work }: Omit<DocumentRequest, "kind"> = {}): DocumentRequest {
  if (!isDocumentKind(kind)) throw new UsageError(`"${kind}" is not a document kind: ${DOCUMENT_KINDS.join(", ")}`);
  if (isWorkKind(kind)) workItem(kind, work);
  else artifactSlug(kind, subject, work);
  return { kind, subject, work };
}

function sequencePrefix(sequence: number | undefined): string {
  if (sequence === undefined) throw new Error("an sdr name needs its sequence");
  return String(sequence).padStart(SEQUENCE_DIGITS, "0");
}

export function documentRel(kind: DocumentKind, { subject, work, sequence }: DocumentNaming = {}): string {
  if (isWorkKind(kind)) return `${workRel(workItem(kind, work))}${kind}.md`;
  const slug = artifactSlug(kind, subject, work);
  if (kind === "sdr") return `${DECISIONS_FOLDER}/${sequencePrefix(sequence)}-${slug}.md`;
  return `${FOLDERS[kind]}/${slug}.md`;
}

function underRoot(root: string, rel: string): string {
  return join(root, ...rel.split("/"));
}

function nextSequence(root: string): number {
  const folder = underRoot(root, DECISIONS_FOLDER);
  if (!existsSync(folder)) return 1;
  const taken = readdirSync(folder).map((name) => SEQUENCED_FILE.exec(name)?.[1]).filter((digits) => digits !== undefined).map(Number);
  return Math.max(0, ...taken) + 1;
}

export function nameDocument(root: string, { kind, subject, work }: DocumentRequest): DocumentName {
  const sequence = kind === "sdr" ? nextSequence(root) : undefined;
  const path = documentRel(kind, { subject, work, sequence });
  return { path, exists: existsSync(underRoot(root, path)) };
}
