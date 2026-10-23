import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { revParse } from "../git.mts";
import { workRoot } from "../paths.mts";
import { readText } from "../../util/io.mts";
import { parse, stringify } from "../../util/yaml-lite.mjs";
import { isWorkId, workDir, workFile, workId, type WorkFile, type WorkId } from "./files.mts";
import { readVerdicts, type VerdictRow } from "./verdict-log.mts";

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

export type NewItem = {
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

export function lastActivity(state: WorkState, lastVerdict: VerdictRow | null): string {
  const updated = state.updated ?? state.created;
  const verdictTs = lastVerdict?.ts;
  return verdictTs && verdictTs > updated ? verdictTs : updated;
}

type Activity = { state: WorkState; since: string };

function activityOf(root: string, state: WorkState): Activity {
  return { state, since: lastActivity(state, readVerdicts(root, state.id).rows.at(-1) ?? null) };
}

function isLater(a: Activity, b: Activity): boolean {
  return (a.since.localeCompare(b.since) || a.state.id.localeCompare(b.state.id)) > 0;
}

export function currentItem(root: string, { session }: { session: string | null }): WorkState | null {
  const active = listWork(root)
    .map((id) => readState(root, id))
    .filter((state) => isActive(state.status));
  const own = isSessionId(session) ? active.filter((state) => state.session === session) : [];
  const candidates = (own.length ? own : active).map((state) => activityOf(root, state));
  return candidates.reduce<Activity | null>((best, item) => (best === null || isLater(item, best) ? item : best), null)?.state ?? null;
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

function initialState(root: string, id: WorkId, { lane, title, source, session }: NewItem & { lane: Lane }, now: Date): WorkState {
  const state: WorkState = { id, lane, title, status: "open", created: now.toISOString(), updated: now.toISOString() };
  if (source) state.source = source;
  if (isSessionId(session)) state.session = session;
  const base = revParse(root, "HEAD");
  if (base) state.base = base;
  return state;
}

export function createItem(root: string, item: NewItem, now: Date): WorkState {
  const { lane, title, id, story } = item;
  if (!isLane(lane)) throw new Error(`lane must be one of ${LANES.join("|")}`);
  const wid = checkedId(id ?? newId(title, now));
  if (existsSync(workFile(root, wid, "state.yaml"))) throw new Error(`work item ${wid} already exists`);
  const state = writeState(root, initialState(root, wid, { ...item, lane }, now), now);
  mkdirSync(join(workDir(root, wid), "phases"), { recursive: true });
  if (typeof item.request === "string" && item.request !== "") writeFileSync(workFile(root, wid, "request.md"), item.request);
  if (story != null) writeFileSync(workFile(root, wid, "story.md"), story);
  return state;
}
