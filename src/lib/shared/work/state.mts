import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config.mjs";
import { revParse } from "../git.mts";
import { workRoot } from "../paths.mts";
import { recordBases } from "../repos.mjs";
import { liveLookup } from "../sources/places.mts";
import { resolveReferences } from "../sources/resolve.mts";
import { IntakeError, writeIntake } from "../sources/sources.mjs";
import { readText } from "../../util/io.mts";
import { parse, stringify } from "../../util/yaml-lite.mjs";
import { isWorkId, workDir, workFile, workId, type WorkFile, type WorkId } from "./files.mts";

export const LANES = ["fast", "order", "design", "research"] as const;
export const STATUSES = ["open", "blocked", "done", "abandoned"] as const;
export const STATE_FIELDS = ["id", "lane", "title", "status", "created", "updated", "blocked_reason", "branch", "run_through", "source", "base", "session"] as const;

export type Lane = (typeof LANES)[number];
export type Status = (typeof STATUSES)[number];

export type WorkState = {
  id: WorkId;
  lane: Lane;
  title: string;
  status: Status;
  created: string;
  updated?: string;
  blocked_reason?: string;
  branch?: string;
  run_through?: number;
  source?: string;
  base?: string;
  session?: string;
};

export type NewWork = {
  lane: string;
  title: string;
  id?: string | null;
  source?: string | null;
  request?: string | null;
  story?: string | Uint8Array | null;
  session?: string | null;
};

export const ARTIFACT_BY_LANE: Record<Lane, WorkFile | null> = { fast: null, order: "order.md", design: "design.md", research: "research.md" };

const ACTIVE_STATUSES: readonly Status[] = ["open", "blocked"];
const SLUG_CHARS = 48;

function isLane(value: unknown): value is Lane {
  return LANES.includes(value as Lane);
}

function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

function isStateField(key: string): boolean {
  return STATE_FIELDS.includes(key as (typeof STATE_FIELDS)[number]);
}

export function isActive(status: Status): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isSessionId(session: unknown): session is string {
  return typeof session === "string" && session !== "";
}

function checkedId(text: string): WorkId {
  if (!isWorkId(text)) throw new Error(`invalid work id: ${text}`);
  return text;
}

function stateErrors(s: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!isWorkId(String(s.id))) errors.push(`id "${s.id}" is not a slug`);
  if (!isLane(s.lane)) errors.push(`lane "${s.lane}" not in ${LANES.join("|")}`);
  if (!isStatus(s.status)) errors.push(`status "${s.status}" not in ${STATUSES.join("|")}`);
  if (typeof s.title !== "string" || !s.title.trim()) errors.push("title missing");
  if (typeof s.created !== "string") errors.push("created missing");
  if (s.status === "blocked" && !s.blocked_reason) errors.push("blocked without blocked_reason");
  for (const key of Object.keys(s)) if (!isStateField(key)) errors.push(`unknown field ${key}`);
  return errors;
}

export function validateState(s: unknown): asserts s is WorkState {
  const errors = s && typeof s === "object" ? stateErrors(s as Record<string, unknown>) : ["state is not an object"];
  if (errors.length) throw new Error(`invalid state: ${errors.join("; ")}`);
}

export function readState(root: string, id: WorkId): WorkState {
  const file = workFile(root, checkedId(id), "state.yaml");
  const text = readText(file);
  if (text === null) throw new Error(`no work item ${id} (missing ${file})`);
  const state: unknown = parse(text);
  validateState(state);
  return state;
}

export function writeState(root: string, state: WorkState, now: Date): WorkState {
  validateState(state);
  const dir = workDir(root, state.id);
  mkdirSync(dir, { recursive: true });
  state.updated = now.toISOString();
  writeFileSync(join(dir, "state.yaml"), stringify(state) + "\n");
  return state;
}

export function listWork(root: string): WorkId[] {
  const dir = workRoot(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(isWorkId)
    .filter((id) => existsSync(workFile(root, id, "state.yaml")))
    .sort();
}

export function listOpenWork(root: string): WorkId[] {
  return listWork(root).filter((id) => isActive(readState(root, id).status));
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_CHARS);
}

export function newId(title: string, now: Date): WorkId {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  return workId(`${day}-${slug(title) || "work"}`);
}

function storyIntake(text: string, root: string) {
  const sources = loadConfig(root).sources;
  if (!sources.some((s) => s.root)) return null;
  const intake = resolveReferences(text, sources, liveLookup());
  if (intake.failures.length) throw new IntakeError(intake.failures);
  return intake;
}

function initialState(root: string, id: WorkId, { lane, title, source, session }: NewWork & { lane: Lane }, now: Date): WorkState {
  const state: WorkState = { id, lane, title, status: "open", created: now.toISOString(), updated: now.toISOString() };
  if (source) state.source = source;
  if (isSessionId(session)) state.session = session;
  const base = revParse(root, "HEAD");
  if (base) state.base = base;
  return state;
}

export function createWork(root: string, request: NewWork, now: Date): WorkState {
  const { lane, title, id, story } = request;
  if (!isLane(lane)) throw new Error(`lane must be one of ${LANES.join("|")}`);
  const wid = checkedId(id ?? newId(title, now));
  if (existsSync(workFile(root, wid, "state.yaml"))) throw new Error(`work item ${wid} already exists`);
  const intake = story == null ? null : storyIntake(String(story), root);
  const state = writeState(root, initialState(root, wid, { ...request, lane }, now), now);
  mkdirSync(join(workDir(root, wid), "phases"), { recursive: true });
  if (typeof request.request === "string" && request.request !== "") writeFileSync(workFile(root, wid, "request.md"), request.request);
  if (story != null) writeFileSync(workFile(root, wid, "story.md"), story);
  if (intake) writeIntake(workDir(root, wid), intake);
  recordBases(wid, root);
  return state;
}
