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
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { parse, stringify } from "./yaml-lite.mjs";

export const HIT_CAP = 200;
export const TOKEN_CAP = 200;
export const SNAPSHOT_MAX_BYTES = 1024 * 1024;

function git(repo, args, { buffer = false } = {}) {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: buffer ? null : "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/** For `git grep`: exit 1 means no match; anything else (a bad regex) is an error the caller sees. */
function gitGrep(repo, args) {
  const r = spawnSync("git", ["-C", repo, "grep", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 0) return r.stdout;
  if (r.status === 1) return "";
  throw new Error(`git grep failed: ${String(r.stderr || r.error?.message || "unknown error").trim().split(/\r?\n/)[0]}`);
}

/**
 * Every live worktree of the source, main first.
 * @returns {Array<{ path: string, branch: string|null, commit: string|null, main: boolean }>}
 */
export function listWorktrees(sourceRoot) {
  const out = git(sourceRoot, ["worktree", "list", "--porcelain"]);
  if (!out) return [];
  const trees = [];
  for (const block of out.split(/\r?\n\r?\n/)) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path || /^(bare|prunable)\b/m.test(block)) continue;
    trees.push({ path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null, commit: block.match(/^HEAD (\w+)$/m)?.[1] ?? null, main: trees.length === 0 });
  }
  return trees.filter((t) => existsSync(t.path));
}

/** @returns {Array<{ branch: string, commit: string, checked_out: boolean }>} */
export function localBranches(sourceRoot, worktrees = listWorktrees(sourceRoot)) {
  const out = git(sourceRoot, ["for-each-ref", "--format=%(refname:short)%09%(objectname)", "refs/heads"]) ?? "";
  const checkedOut = new Set(worktrees.map((w) => w.branch).filter(Boolean));
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [branch, commit] = line.split("\t");
      return { branch, commit, checked_out: checkedOut.has(branch) };
    });
}

/**
 * The places a lookup searches, in a fixed order: worktrees (main first), then the branches no
 * worktree has checked out. A worktree's label is its branch, or its folder name when detached.
 */
export function places(sourceRoot) {
  const worktrees = listWorktrees(sourceRoot);
  return [
    ...worktrees.map((w) => ({ kind: "worktree", label: w.branch ?? basename(w.path), worktree: w.path, branch: w.branch, commit: w.commit, main: w.main })),
    ...localBranches(sourceRoot, worktrees)
      .filter((b) => !b.checked_out)
      .map((b) => ({ kind: "branch", label: b.branch, worktree: null, branch: b.branch, commit: b.commit, main: false })),
  ];
}

/** Content hash with CRLF turned into LF, so a checkout under core.autocrlf matches its blob. */
export function contentHash(bytes) {
  return createHash("sha256").update(Buffer.from(bytes).toString("latin1").replace(/\r\n/g, "\n"), "latin1").digest("hex");
}

/**
 * Every version of one document across the source's places.
 * @param {{ root: string }} source
 * @returns {Array<{ label: string, worktree: string|null, branch: string|null, commit: string|null, main: boolean, sha256: string, dirty: boolean, bytes: Buffer }>}
 */
export function candidates(source, path, where = places(source.root)) {
  const out = [];
  for (const p of where) {
    let bytes;
    let dirty = false;
    if (p.kind === "worktree") {
      const file = join(p.worktree, path);
      if (!existsSync(file)) continue;
      bytes = readFileSync(file);
      dirty = Boolean(git(p.worktree, ["status", "--porcelain", "--", path])?.trim());
    } else {
      bytes = git(source.root, ["cat-file", "blob", `${p.branch}:${path}`], { buffer: true });
      if (!bytes) continue;
    }
    out.push({ label: p.label, worktree: p.worktree, branch: p.branch, commit: p.commit, main: p.main, sha256: contentHash(bytes), dirty, bytes });
  }
  return out;
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
    const listing = p.kind === "worktree" ? git(p.worktree, ["ls-files", "-z"]) : git(source.root, ["ls-tree", "-r", "-z", "--name-only", p.branch]);
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

const SEGMENT = "[A-Za-z0-9_.-]+";
const PATH_LIKE = new RegExp(`^${SEGMENT}(?:/${SEGMENT})+$`);
const NAME_WITH_EXT = /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]+$/;
const PIN = /^([A-Za-z0-9_-]+)@([A-Za-z0-9_./-]+):(.+)$/;

const hasExtension = (path) => /\.[A-Za-z0-9]+$/.test(basename(path));
/** No `.`/`..` segment, so a snapshot path can never leave the work item. */
const isSafe = (path) => !path.split("/").some((s) => s === "." || s === "..");

const MARKDOWN_LINK = /\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function decodePercent(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * One raw token, cleaned: wrapping punctuation, then `#fragment` (kept as the anchor), `?query`
 * and a `:line` suffix stripped. `docs/fees.md#late-fees,` gives `docs/fees.md` and `late-fees`.
 */
function cleanToken(raw) {
  let word = raw.trim().replace(/^[("'[{<*]+/, "").replace(/[)"'\]}>.,;!?*]+$/, "");
  let anchor = null;
  const hash = word.indexOf("#");
  if (hash >= 0) {
    anchor = word.slice(hash + 1) || null;
    word = word.slice(0, hash);
  }
  word = word.replace(/\?.*$/, "").replace(/:\d+(-\d+)?$/, "").replace(/[.,;:!?]+$/, "");
  return { word, anchor };
}

/**
 * One cleaned word as a reference; `{ unshaped }` when it looks like a path (a slash and an
 * extension) but fails the path shape, so it is never looked up and goes to `unmatched`; null for
 * plain text. A backticked bare name with an extension counts; `<source>@<branch>:<path>` is a pin.
 */
function classify(word, anchor, { backticked }) {
  if (!word || word.includes("://")) return null;
  const pin = word.match(PIN);
  const path = pin ? pin[3] : word;
  const shaped = (PATH_LIKE.test(path) || ((backticked || pin) && NAME_WITH_EXT.test(path))) && isSafe(path);
  if (!shaped) return path.includes("/") && hasExtension(path) ? { unshaped: path } : null;
  return pin ? { ref: word, source: pin[1], path, anchor, pin: pin[2] } : { ref: word, source: null, path, anchor, pin: null };
}

/**
 * The references in a story, in order: every markdown link target (percent-escapes decoded, a
 * leading `./` dropped), then the path-like words of the prose. Tokens with the same path merge;
 * at most TOKEN_CAP references.
 * @returns {{ refs: Array<{ ref, source, path, anchor, pin }>, unshaped: string[] }}
 */
function extract(text) {
  const refs = new Map();
  const unshaped = new Set();
  const take = (raw, backticked) => {
    const { word, anchor } = cleanToken(raw);
    const r = classify(word, anchor, { backticked });
    if (!r) return;
    if (r.unshaped) unshaped.add(r.unshaped);
    else if (!refs.has(r.ref) && refs.size < TOKEN_CAP) refs.set(r.ref, r);
    else if (refs.has(r.ref) && !refs.get(r.ref).anchor) refs.get(r.ref).anchor = r.anchor;
  };
  const prose = String(text).replace(MARKDOWN_LINK, (_, target) => {
    take(decodePercent(target).replace(/^\.\//, ""), true);
    return " ";
  });
  for (const m of prose.matchAll(/`([^`\n]+)`|(\S+)/g)) take(m[1] ?? m[2], m[1] !== undefined);
  return { refs: [...refs.values()], unshaped: [...unshaped] };
}

/**
 * The references a story names (D-005): see extract.
 * @returns {Array<{ ref: string, source: string|null, path: string, anchor: string|null, pin: string|null }>}
 */
export function tokens(text) {
  return extract(text).refs;
}

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

function resolvedRecord(t, sourceName, c, chosenBy) {
  const rec = { ref: t.ref, source: sourceName, path: t.path, status: "resolved", chosen_by: chosenBy, worktree: c.worktree, branch: c.branch, commit: c.commit, sha256: c.sha256, dirty: c.dirty, snapshot: null };
  if (t.anchor) rec.anchor = t.anchor; // the heading the story pointed at, for citations
  return rec;
}

/**
 * The D-005 rule for one unpinned reference: one candidate, use it; several with one hash, use the
 * main worktree's (else the first); several hashes, ambiguous, and the user picks.
 */
function choose(t, sourceName, found) {
  if (found.length === 1) return { rec: resolvedRecord(t, sourceName, found[0], "single"), bytes: found[0].bytes };
  if (new Set(found.map((c) => c.sha256)).size === 1) {
    const c = found.find((x) => x.main) ?? found[0];
    return { rec: resolvedRecord(t, sourceName, c, "identical"), bytes: c.bytes };
  }
  return { rec: { ref: t.ref, source: sourceName, path: t.path, status: "ambiguous", candidates: found.map((c) => c.label) }, bytes: null };
}

/**
 * Resolves every reference in the story against the reachable sources, reading git only. Writes
 * nothing, so a failing pin can stop `harness new` before the work item exists.
 * @returns {{ refs: object[], unmatched: string[], failures: string[], bytes: Map<string, Buffer> }}
 */
export function resolveReferences(text, sources) {
  const reachable = sources.filter((s) => s.root);
  const placesOf = new Map(reachable.map((s) => [s.name, places(s.root)]));
  const refs = [];
  const unmatched = [];
  const failures = [];
  const bytes = new Map();
  const keep = ({ rec, bytes: b }) => {
    refs.push(rec);
    if (b) bytes.set(rec.ref, b);
  };
  const { refs: found, unshaped } = extract(text);
  unmatched.push(...unshaped);
  for (const t of found) {
    if (t.pin) {
      const source = sources.find((s) => s.name === t.source);
      if (!source?.root) {
        failures.push(`${t.ref}: source ${t.source} is ${source ? `unreachable (${source.reason})` : "not declared"}`);
        continue;
      }
      const found = candidates(source, t.path, placesOf.get(source.name)).filter((c) => c.branch === t.pin);
      if (!found.length) failures.push(`${t.ref}: no ${t.path} on branch ${t.pin}; searched ${placesOf.get(source.name).map((p) => p.label).join(", ")}`);
      else keep({ rec: resolvedRecord(t, source.name, found[0], "pin"), bytes: found[0].bytes });
      continue;
    }
    const hit = reachable.map((s) => ({ source: s, found: candidates(s, t.path, placesOf.get(s.name)) })).find((h) => h.found.length);
    if (hit) keep(choose(t, hit.source.name, hit.found));
    else if (t.path.includes("/") && hasExtension(t.path) && !unmatched.includes(t.path)) unmatched.push(t.path);
  }
  return { refs, unmatched, failures, bytes };
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
  const found = candidates(source, entry.path);
  const c = found.find((x) => x.label === label);
  if (!c) throw new Error(`no candidate ${label} for ${ref}; labels: ${found.map((x) => x.label).join(", ")}`);
  const rec = resolvedRecord({ ref: entry.ref, path: entry.path }, entry.source, c, "user");
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
  const [t] = extract(`\`${ref}\``).refs;
  if (!t) throw new Error(`${ref} is not a path reference (expected <path>[#anchor] or <source>@<branch>:<path>)`);
  const present = intake.refs.find((r) => r.ref === t.ref);
  if (present) return { added: false, ref: present };
  const resolution = resolveReferences(`\`${ref}\``, sources);
  if (resolution.failures.length) throw new LookupError(resolution.failures.join("\n"));
  const [rec] = resolution.refs;
  if (!rec) {
    const searched = sources.filter((s) => s.root).map((s) => `${s.name}: ${places(s.root).map((p) => p.label).join(", ")}`);
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
  if (!git(source.root, ["rev-parse", "--verify", "--quiet", `refs/heads/${rec.branch}`])) return { reason: `branch ${rec.branch} no longer exists` };
  const bytes = git(source.root, ["cat-file", "blob", `${rec.branch}:${rec.path}`], { buffer: true });
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
