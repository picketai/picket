// The work item: one directory under work/<id>/ whose files ARE the state.
//
//   work/<id>/state.yaml        id, lane, title, status, created, updated, blocked_reason
//   work/<id>/{order,design,research}.md the lane's artifact; phases are `## Phase N` headings,
//                               must_haves live in the frontmatter (see verify.mjs)
//   work/<id>/phases/N.done     marker: developer finished phase N (content = ISO timestamp)
//   work/<id>/phases/N.approved marker: user approved phase N
//   work/<id>/phases/N.reviewed marker: reviewer passed phase N (checkpoint or cumulative)
//   work/<id>/verdicts.jsonl    one line per verdict: { ts, agent, verdict, phase }
//   work/<id>/repos.yaml        each nested repo's HEAD at creation (see repos.mjs)
//   work/<id>/story.md          the ticket's text as fetched, written once (optional)
//   work/<id>/sources.yaml      the story's resolved references, snapshots in sources/ (sources.mjs)
//
// Nothing in here is remembered by a model. Everything is derived from the files on each call.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { frontmatter, parse, stringify } from "./yaml-lite.mjs";
import { execFileSync } from "node:child_process";
import { recordBases } from "./repos.mjs";
import { loadConfig } from "./config.mjs";
import { IntakeError, resolveReferences, writeIntake } from "./sources.mjs";
import { projectRoot, workRoot } from "./paths.mjs";

function gitHead(root) {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export const LANES = ["fast", "order", "design", "research"];
export const STATUSES = ["open", "blocked", "done", "abandoned"];
export const ARTIFACT_BY_LANE = { fast: null, order: "order.md", design: "design.md", research: "research.md" };

export { projectRoot, workRoot };

export function workDir(id, root = projectRoot()) {
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(id)) throw new Error(`invalid work id: ${id}`);
  return join(workRoot(root), id);
}

export function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function newId(title, now = new Date()) {
  const d = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `${d}-${slug(title) || "work"}`;
}

export function listWork(root = projectRoot()) {
  const dir = workRoot(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, "state.yaml")))
    .sort();
}

const ACTIVE_STATUSES = new Set(["open", "blocked"]);

export function listOpenWork(root = projectRoot()) {
  return listWork(root).filter((id) => ACTIVE_STATUSES.has(readState(id, root).status));
}

export function readState(id, root = projectRoot()) {
  const file = join(workDir(id, root), "state.yaml");
  if (!existsSync(file)) throw new Error(`no work item ${id} (missing ${file})`);
  const state = parse(readFileSync(file, "utf8"));
  validateState(state);
  return state;
}

export function writeState(state, root = projectRoot()) {
  validateState(state);
  const dir = workDir(state.id, root);
  mkdirSync(dir, { recursive: true });
  state.updated = new Date().toISOString();
  writeFileSync(join(dir, "state.yaml"), stringify(state) + "\n");
  return state;
}

export function validateState(s) {
  const errors = [];
  if (!s || typeof s !== "object") errors.push("state is not an object");
  else {
    if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(String(s.id))) errors.push(`id "${s.id}" is not a slug`);
    if (!LANES.includes(s.lane)) errors.push(`lane "${s.lane}" not in ${LANES.join("|")}`);
    if (!STATUSES.includes(s.status)) errors.push(`status "${s.status}" not in ${STATUSES.join("|")}`);
    if (typeof s.title !== "string" || !s.title.trim()) errors.push("title missing");
    if (typeof s.created !== "string") errors.push("created missing");
    if (s.status === "blocked" && !s.blocked_reason) errors.push("blocked without blocked_reason");
    for (const k of Object.keys(s)) {
      if (!["id", "lane", "title", "status", "created", "updated", "blocked_reason", "branch", "run_through", "source", "base", "session"].includes(k)) errors.push(`unknown field ${k}`);
    }
  }
  if (errors.length) throw new Error(`invalid state: ${errors.join("; ")}`);
  return true;
}

/**
 * Opens a work item. `request` (a non-empty string) and `story` (a ticket's text, string or bytes)
 * are saved byte for byte as request.md and story.md and never rewritten: they are what the
 * cumulative review traces the change back to. The story's references are resolved against the
 * reachable sources first; a pin that matches nothing throws IntakeError before anything is written.
 */
export function isSessionId(session) {
  return typeof session === "string" && session !== "";
}

export function createWork({ lane, title, id, source = null, request = null, story = null, session = null, root = projectRoot(), now = new Date() }) {
  if (!LANES.includes(lane)) throw new Error(`lane must be one of ${LANES.join("|")}`);
  const wid = id ?? newId(title, now);
  if (existsSync(join(workDir(wid, root), "state.yaml"))) throw new Error(`work item ${wid} already exists`);
  const intake = story == null ? null : storyIntake(String(story), root);
  const state = { id: wid, lane, title, status: "open", created: now.toISOString(), updated: now.toISOString() };
  if (source) state.source = source;
  if (isSessionId(session)) state.session = session;
  const base = gitHead(root);
  if (base) state.base = base;
  writeState(state, root);
  mkdirSync(join(workDir(wid, root), "phases"), { recursive: true });
  if (typeof request === "string" && request !== "") writeFileSync(join(workDir(wid, root), "request.md"), request);
  if (story != null) writeFileSync(join(workDir(wid, root), "story.md"), story);
  if (intake) writeIntake(workDir(wid, root), intake);
  recordBases(wid, root);
  return state;
}

/** The story's references resolved against the reachable sources; null when none is reachable. */
function storyIntake(text, root) {
  const sources = loadConfig(root).sources;
  if (!sources.some((s) => s.root)) return null;
  const intake = resolveReferences(text, sources);
  if (intake.failures.length) throw new IntakeError(intake.failures);
  return intake;
}

/** The lane's artifact, parsed: frontmatter, body, and the `## Phase N` headings in order. */
export function readArtifact(id, root = projectRoot()) {
  const state = readState(id, root);
  const name = ARTIFACT_BY_LANE[state.lane];
  if (!name) return { exists: false, path: null, front: {}, body: "", phases: [] };
  const path = join(workDir(id, root), name);
  if (!existsSync(path)) return { exists: false, path, front: {}, body: "", phases: [] };
  const { front, body } = frontmatter(readFileSync(path, "utf8"));
  const phases = [];
  for (const m of body.matchAll(/^## Phase (\d+)(?::|\s+-|\s+—)?\s*(.*)$/gm)) {
    phases.push({ n: Number(m[1]), title: m[2].trim() });
  }
  return { exists: true, path, front, body, phases };
}

export function marker(id, n, kind, root = projectRoot()) {
  return join(workDir(id, root), "phases", `${n}.${kind}`);
}

export function hasMarker(id, n, kind, root = projectRoot()) {
  return existsSync(marker(id, n, kind, root));
}

export function setMarker(id, n, kind, root = projectRoot(), now = new Date()) {
  const p = marker(id, n, kind, root);
  mkdirSync(join(workDir(id, root), "phases"), { recursive: true });
  writeFileSync(p, now.toISOString() + "\n");
  return p;
}

export function appendVerdict(id, entry, root = projectRoot()) {
  const p = join(workDir(id, root), "verdicts.jsonl");
  appendFileSync(p, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

function isInside(dir, root) {
  const rel = relative(root, dir);
  return !rel.startsWith("..") && !isAbsolute(rel);
}

export function commentPath(path, root = projectRoot(), cwd = process.cwd()) {
  const base = isInside(cwd, root) ? cwd : root;
  return relative(root, resolve(base, String(path))).replaceAll("\\", "/");
}

function samePath(a, b) {
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

export function appendComment(id, { path, text }, root = projectRoot(), cwd = process.cwd()) {
  const entry = { ts: new Date().toISOString(), path: commentPath(path, root, cwd), text: String(text) };
  appendFileSync(join(workDir(id, root), "comments.jsonl"), JSON.stringify(entry) + "\n");
  return entry;
}

function readComments(id, root) {
  const p = join(workDir(id, root), "comments.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => ({ id, ...JSON.parse(l) }));
}

export function approvedComments(root = projectRoot()) {
  return listWork(root)
    .filter((id) => ["open", "blocked"].includes(readState(id, root).status))
    .flatMap((id) => readComments(id, root));
}

export function approvedCommentsFor(rel, root = projectRoot()) {
  const target = commentPath(rel, root, root);
  return approvedComments(root).filter((entry) => samePath(commentPath(entry.path, root, root), target));
}

export function readVerdicts(id, root = projectRoot()) {
  const p = join(workDir(id, root), "verdicts.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** Everything a caller needs to know, derived from disk in one pass. */
export function deriveState(id, root = projectRoot()) {
  const state = readState(id, root);
  const artifact = readArtifact(id, root);
  const phases = artifact.phases.map((p) => ({
    ...p,
    done: hasMarker(id, p.n, "done", root),
    approved: hasMarker(id, p.n, "approved", root),
    reviewed: hasMarker(id, p.n, "reviewed", root),
  }));
  const verdicts = readVerdicts(id, root);
  const current = phases.find((p) => !p.approved) ?? null;
  return {
    ...state,
    artifact: artifact.exists ? artifact.path : null,
    artifact_expected: ARTIFACT_BY_LANE[state.lane],
    phases,
    phase_count: phases.length,
    phases_approved: phases.filter((p) => p.approved).length,
    current_phase: current ? current.n : null,
    verdicts,
    last_verdict: verdicts.at(-1) ?? null,
  };
}
