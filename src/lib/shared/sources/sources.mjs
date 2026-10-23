// Read-only access to a source: a repository outside the project (config.mjs) whose documents the
// stories refer to. A source has several worktrees and branches, so every lookup searches all of
// them: each worktree's working copy, plus every local branch no worktree has checked out.
// Nothing here writes to a source; every git call is a read.
//
// Intake (D-005, D-006): the story's path-like tokens become references, each resolved to one
// version by a fixed rule and snapshotted into the work item, so the architect and the reviewer
// read the same bytes even when the live file moves.
//
//   work/<id>/sources.yaml              refs: [...], unmatched: [...]
//   work/<id>/sources/<source>/<path>   the raw bytes of each resolved document
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { gitRead } from "../../util/git.mjs";
import { parse, stringify } from "../../util/yaml-lite.mjs";
import { extractReferences } from "./references.mjs";
import { contentHash, liveLookup, places, SOURCE_MAX_BUFFER } from "./places.mjs";
import { resolveReferences, resolvedRef } from "./resolve.mjs";

export const HIT_CAP = 200;
export const SNAPSHOT_MAX_BYTES = 1024 * 1024;

/** For `git grep`: exit 1 means no match; anything else (a bad regex) is an error the caller sees. */
function gitGrep(repo, args) {
  const r = spawnSync("git", ["-C", repo, "grep", ...args], { encoding: "utf8", maxBuffer: SOURCE_MAX_BUFFER });
  if (r.status === 0) return r.stdout;
  if (r.status === 1) return "";
  throw new Error(`git grep failed: ${String(r.stderr || r.error?.message || "unknown error").trim().split(/\r?\n/)[0]}`);
}

function capped(map) {
  const entries = [...map.values()].sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0));
  return { hits: entries.slice(0, HIT_CAP), overflow: Math.max(0, entries.length - HIT_CAP) };
}

/** Tracked files whose path contains `needle` (case-insensitive), one entry per path with every place. */
export function find(source, needle) {
  const lower = String(needle).toLowerCase();
  const byPath = new Map();
  for (const p of places(source.root)) {
    // -z: unquoted paths, so a non-ASCII name is not printed as "docs/\303\251t\303\251.md"
    const listing = p.kind === "worktree" ? gitRead(p.worktree, ["ls-files", "-z"], { maxBuffer: SOURCE_MAX_BUFFER }) : gitRead(source.root, ["ls-tree", "-r", "-z", "--name-only", p.branch], { maxBuffer: SOURCE_MAX_BUFFER });
    for (const path of (listing ?? "").split("\0")) {
      if (!path || !path.toLowerCase().includes(lower)) continue;
      if (!byPath.has(path)) byPath.set(path, { path, places: [] });
      byPath.get(path).places.push(p.label);
    }
  }
  return capped(byPath);
}

/**
 * `git grep` across every place. Identical hits (same path, line and text) merge into one entry
 * listing every place they occur in.
 */
export function grep(source, regex, { path = null } = {}) {
  const byHit = new Map();
  const pathspec = path ? ["--", path] : [];
  for (const p of places(source.root)) {
    const out = p.kind === "worktree" ? gitGrep(p.worktree, ["-n", "-I", "-z", "-e", regex, ...pathspec]) : gitGrep(source.root, ["-n", "-I", "-z", "-e", regex, p.branch, ...pathspec]);
    for (const line of out.split(/\r?\n/)) {
      // -z output: <path>\0<line>\0<text>; on a branch the path is prefixed `<branch>:`
      const [rawPath, lineNo, ...text] = line.split("\0");
      if (!rawPath || !lineNo) continue;
      const hitPath = p.kind === "branch" ? rawPath.slice(p.branch.length + 1) : rawPath;
      const hit = { path: hitPath, line: Number(lineNo), text: text.join("\0") };
      const key = `${hit.path}\0${hit.line}\0${hit.text}`;
      if (!byHit.has(key)) byHit.set(key, { ...hit, places: [] });
      byHit.get(key).places.push(p.label);
    }
  }
  return capped(byHit);
}

// ---- Intake: references in a story, resolved and snapshotted ----

/** A reference lookup that failed for a reason the caller must show: the CLI exits 2 on it. */
export class LookupError extends Error {
  exitCode = 2;
}

/** A pin that matches nothing: intake refuses to open the work item. */
export class IntakeError extends LookupError {
  constructor(failures) {
    super(`source references not found:\n${failures.map((f) => `- ${f}`).join("\n")}`);
    this.failures = failures;
  }
}

function intakeFile(dir) {
  return join(dir, "sources.yaml");
}

/** Copies the raw bytes into the work item and fills `snapshot`; a file over 1 MB is recorded without one. */
function snapshotInto(dir, rec, bytes) {
  if (bytes.length > SNAPSHOT_MAX_BYTES) {
    rec.snapshot = null;
    rec.snapshot_reason = `${bytes.length} bytes, over the ${SNAPSHOT_MAX_BYTES}-byte snapshot cap`;
    return;
  }
  const rel = `sources/${rec.source}/${rec.path}`;
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), bytes);
  rec.snapshot = rel;
}

function writeRecord(dir, intake) {
  writeFileSync(intakeFile(dir), stringify({ refs: intake.refs, unmatched: intake.unmatched }) + "\n");
}

/** Writes the snapshots and `sources.yaml` for a resolution from resolveReferences. */
export function writeIntake(dir, { refs, unmatched, bytes }) {
  for (const rec of refs) if (rec.status === "resolved" && bytes.has(rec.ref)) snapshotInto(dir, rec, bytes.get(rec.ref));
  writeRecord(dir, { refs, unmatched });
}

/** @returns {{ refs: object[], unmatched: string[] }|null} null when the item has no intake record */
export function readIntake(dir) {
  const file = intakeFile(dir);
  if (!existsSync(file)) return null;
  const { refs, unmatched } = parse(readFileSync(file, "utf8"));
  return { refs: refs ?? [], unmatched: unmatched ?? [] };
}

export function ambiguousRefs(dir) {
  return (readIntake(dir)?.refs ?? []).filter((r) => r.status === "ambiguous");
}

/** The user's choice for an ambiguous reference: snapshot that candidate and record `chosen_by: user`. */
export function pick(dir, ref, label, sources) {
  const intake = readIntake(dir);
  const i = intake?.refs.findIndex((r) => r.ref === ref) ?? -1;
  if (i < 0) throw new Error(`no reference ${ref} in ${intakeFile(dir)}`);
  const entry = intake.refs[i];
  if (entry.status !== "ambiguous") throw new Error(`${ref} is already resolved (chosen_by: ${entry.chosen_by})`);
  const source = sources.find((s) => s.name === entry.source);
  if (!source?.root) throw new Error(`source ${entry.source} is unreachable: ${source?.reason ?? "not declared"}`);
  const found = liveLookup().candidates(source, entry.path);
  const c = found.find((x) => x.label === label);
  if (!c) throw new Error(`no candidate ${label} for ${ref}; labels: ${found.map((x) => x.label).join(", ")}`);
  const rec = resolvedRef({ ref: entry.ref, path: entry.path }, entry.source, c, "user");
  snapshotInto(dir, rec, c.bytes);
  intake.refs[i] = rec;
  writeRecord(dir, intake);
  return rec;
}

/**
 * A reference the architect brings in after intake, under the same rule. Resolved: appended with
 * its snapshot. Already present: a no-op that leaves sources.yaml untouched. Ambiguous or not
 * found: LookupError, and nothing is written; the architect records an OQ instead of guessing.
 * @returns {{ added: boolean, ref: object }}
 */
export function addRef(dir, ref, sources) {
  const intake = readIntake(dir) ?? { refs: [], unmatched: [] };
  const [t] = extractReferences(`\`${ref}\``).refs;
  if (!t) throw new Error(`${ref} is not a path reference (expected <path>[#anchor] or <source>@<branch>:<path>)`);
  const present = intake.refs.find((r) => r.ref === t.ref);
  if (present) return { added: false, ref: present };
  const lookup = liveLookup();
  const resolution = resolveReferences(`\`${ref}\``, sources, lookup);
  if (resolution.failures.length) throw new LookupError(resolution.failures.join("\n"));
  const [rec] = resolution.refs;
  if (!rec) {
    const searched = sources.filter((s) => s.root).map((s) => `${s.name}: ${lookup.labels(s).join(", ")}`);
    throw new LookupError(`${ref}: not found; searched ${searched.join("; ") || "no reachable source"}`);
  }
  if (rec.status === "ambiguous") throw new LookupError(`${ref} differs across places: ${rec.candidates.join(", ")}; record an OQ, or pin it as ${rec.source}@<branch>:${rec.path}`);
  snapshotInto(dir, rec, resolution.bytes.get(rec.ref));
  writeRecord(dir, { refs: [...intake.refs, rec], unmatched: intake.unmatched.filter((u) => u !== rec.path) });
  return { added: true, ref: rec };
}

/** The live bytes behind a resolved ref: its recorded worktree's file, else its branch's current tip. */
function liveBytes(rec, source) {
  if (rec.worktree) {
    if (!existsSync(rec.worktree)) return { reason: `worktree ${rec.worktree} no longer exists` };
    const file = join(rec.worktree, rec.path);
    return existsSync(file) ? { bytes: readFileSync(file) } : { reason: `${rec.path} no longer exists in ${rec.worktree}` };
  }
  if (!source?.root) return { reason: `source ${rec.source} is unreachable${source?.reason ? `: ${source.reason}` : ""}` };
  if (!gitRead(source.root, ["rev-parse", "--verify", "--quiet", `refs/heads/${rec.branch}`])) return { reason: `branch ${rec.branch} no longer exists` };
  const bytes = gitRead(source.root, ["cat-file", "blob", `${rec.branch}:${rec.path}`], { maxBuffer: SOURCE_MAX_BUFFER, buffer: true });
  return bytes ? { bytes } : { reason: `${rec.path} no longer exists on ${rec.branch}` };
}

/**
 * Whether each snapshotted document still matches its live version. A place that can no longer be
 * read counts as moved, with the reason: the reviewer reports drift, it never blocks on it.
 * @returns {Array<{ ref: string, snapshot_sha256: string, live_sha256: string|null, moved: boolean, reason?: string }>}
 */
export function liveDrift(dir, sources) {
  return (readIntake(dir)?.refs ?? [])
    .filter((r) => r.status === "resolved")
    .map((rec) => {
      const { bytes, reason } = liveBytes(rec, sources.find((s) => s.name === rec.source));
      const live = bytes ? contentHash(bytes) : null;
      return { ref: rec.ref, snapshot_sha256: rec.sha256, live_sha256: live, moved: live !== rec.sha256, ...(reason ? { reason } : {}) };
    });
}
