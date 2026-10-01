import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { candidates, contentHash, find, grep, listWorktrees, localBranches, tokens } from "../../.claude/lib/sources.mjs";
import { parse as parseYaml } from "../../.claude/lib/yaml-lite.mjs";

const BIN = resolve(".claude/bin/harness.mjs");
const HOOKS = resolve(".claude/hooks");

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/**
 * A source with a main worktree on main, a linked worktree on feat-x, and a branch old that no
 * worktree has checked out. docs/pricing.md exists in all three with the same text.
 */
function tempSource() {
  const base = mkdtempSync(join(tmpdir(), "harness-source-"));
  const main = join(base, "analysis");
  mkdirSync(join(main, "docs"), { recursive: true });
  git(base, "init", "-q", "-b", "main", main);
  writeFileSync(join(main, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 10.\n");
  git(main, "add", "-A");
  git(main, "commit", "-q", "-m", "pricing");
  git(main, "branch", "old");
  const feat = join(base, "analysis-feat");
  git(main, "worktree", "add", "-q", "-b", "feat-x", feat);
  return { base, main, feat, source: { name: "analysis", root: main } };
}

/** A project declaring the source, for the CLI and hook cases. */
function tempProject() {
  const root = mkdtempSync(join(tmpdir(), "harness-srcproj-"));
  mkdirSync(join(root, ".claude"));
  writeFileSync(join(root, ".claude", "harness.json"), JSON.stringify({ sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } }));
  git(root, "init", "-q");
  return root;
}

function cli(root, args, sourceRoot) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  delete env.HARNESS_SOURCE_ANALYSIS;
  if (sourceRoot) env.HARNESS_SOURCE_ANALYSIS = sourceRoot;
  try {
    return { code: 0, out: execFileSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (err) {
    return { code: err.status, out: String(err.stdout), err: String(err.stderr) };
  }
}

test("listWorktrees and localBranches see the main and linked worktree and the unchecked-out branch", () => {
  const { base, main, source } = tempSource();
  const trees = listWorktrees(main);
  assert.deepEqual(trees.map((t) => [t.branch, t.main]), [["main", true], ["feat-x", false]]);
  assert.deepEqual(localBranches(main).find((b) => b.branch === "old").checked_out, false);
  assert.deepEqual(candidates(source, "docs/pricing.md").map((c) => c.label), ["main", "feat-x", "old"]);
  rmSync(base, { recursive: true, force: true });
});

test("the content hash ignores CRLF against LF", () => {
  assert.equal(contentHash(Buffer.from("a\r\nb\r\n")), contentHash(Buffer.from("a\nb\n")));
  assert.notEqual(contentHash(Buffer.from("a\n")), contentHash(Buffer.from("b\n")));
});

test("a working-copy edit is a candidate with its own hash and dirty: true", () => {
  const { base, feat, source } = tempSource();
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const [main, featCandidate, old] = candidates(source, "docs/pricing.md");
  assert.equal(main.sha256, old.sha256);
  assert.notEqual(featCandidate.sha256, main.sha256);
  assert.deepEqual([main.dirty, featCandidate.dirty], [false, true]);
  rmSync(base, { recursive: true, force: true });
});

test("harness source find lists docs/pricing.md once with every place it exists (T-3.3)", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const r = cli(root, ["source", "find", "analysis", "pricing.md"], main);
  assert.equal(r.code, 0, r.err);
  const { hits, overflow } = JSON.parse(r.out);
  assert.deepEqual(hits, [{ path: "docs/pricing.md", places: ["main", "feat-x", "old"] }]);
  assert.equal(overflow, 0);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("harness source grep merges identical hits across places and reports overflow past 200 (T-3.4)", () => {
  const { base, main, source } = tempSource();
  const root = tempProject();
  const r = cli(root, ["source", "grep", "analysis", "rate"], main);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse(r.out).hits, [{ path: "docs/pricing.md", line: 3, text: "The daily rate is 10.", places: ["main", "feat-x", "old"] }]);
  writeFileSync(join(main, "docs", "rates.md"), Array.from({ length: 250 }, (_, i) => `rate ${i}`).join("\n") + "\n");
  git(main, "add", "-A");
  const many = grep(source, "rate");
  assert.equal(many.hits.length, 200);
  assert.equal(many.overflow, 51);
  assert.equal(grep(source, "rate", { path: "docs/pricing.md" }).hits.length, 1, "--path narrows the search");
  assert.equal(find(source, "PRICING").hits.length, 1, "find is case-insensitive");
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("an undeclared source exits 1 naming the declared ones; an unset root exits 2 with the reason", () => {
  const root = tempProject();
  const undeclared = cli(root, ["source", "find", "specs", "x"]);
  assert.equal(undeclared.code, 1);
  assert.match(undeclared.err, /declared: analysis/);
  const unset = cli(root, ["source", "find", "analysis", "x"]);
  assert.equal(unset.code, 2);
  assert.match(JSON.parse(unset.out).error, /HARNESS_SOURCE_ANALYSIS is not set/);
  rmSync(root, { recursive: true, force: true });
});

test("preflight warns on an unset source and reports the worktree count when it is reachable (T-3.5)", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const id = JSON.parse(cli(root, ["new", "--lane", "order", "--title", "Fees"]).out).id;
  const unset = cli(root, ["preflight", id, "--human"]);
  assert.match(unset.out, /^warn source:analysis: unreachable: HARNESS_SOURCE_ANALYSIS is not set/m);
  const set = cli(root, ["preflight", id, "--human"], main);
  assert.match(set.out, /^ok {3}source:analysis: .+ · 2 worktrees$/m);
  writeFileSync(join(root, ".claude", "harness.json"), "{ broken");
  assert.match(cli(root, ["preflight", id, "--human"]).out, /^warn config: /m);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

/** Opens an order item with a story through the CLI, against the given source. */
function openWithStory(root, story, sourceRoot) {
  const file = join(root, "story.txt");
  writeFileSync(file, story);
  return cli(root, ["new", "--lane", "order", "--title", "Fees", "--ticket", "RENT-1", "--story", file], sourceRoot);
}

function readYaml(root, id) {
  return parseYaml(readFileSync(join(root, "work", id, "sources.yaml"), "utf8"));
}

test("a document only in the main worktree resolves single, and the snapshot is its bytes (T-4.1, T-4.6)", () => {
  const { base, main } = tempSource();
  mkdirSync(join(main, "docs", "rent"));
  writeFileSync(join(main, "docs", "rent", "pricing.md"), "# Rent pricing\n");
  git(main, "add", "-A");
  git(main, "commit", "-q", "-m", "rent pricing");
  writeFileSync(join(main, "docs", "rent", "pricing.md"), "# Rent pricing\n\nDraft: weekend rate.\n");
  const root = tempProject();
  const r = openWithStory(root, "As a renter I pay what `docs/rent/pricing.md` says.\n", main);
  assert.equal(r.code, 0, r.err);
  const { id, source } = JSON.parse(r.out);
  assert.equal(source, "RENT-1");
  assert.equal(readFileSync(join(root, "work", id, "story.md"), "utf8"), "As a renter I pay what `docs/rent/pricing.md` says.\n");
  const [ref] = readYaml(root, id).refs;
  assert.deepEqual([ref.ref, ref.status, ref.chosen_by, ref.branch, ref.dirty], ["docs/rent/pricing.md", "resolved", "single", "main", true]);
  assert.equal(ref.commit, git(main, "rev-parse", "HEAD"), "a dirty copy records the worktree's HEAD");
  assert.deepEqual(readFileSync(join(root, "work", id, ref.snapshot)), readFileSync(join(main, "docs", "rent", "pricing.md")));
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("CRLF in the main worktree and LF on a branch are identical, and the main worktree wins (T-4.2)", () => {
  const { base, main } = tempSource();
  writeFileSync(join(main, "docs", "pricing.md"), "# Pricing\r\n\r\nThe daily rate is 10.\r\n");
  const root = tempProject();
  const r = openWithStory(root, "See docs/pricing.md.", main);
  assert.equal(r.code, 0, r.err);
  const [ref] = readYaml(root, JSON.parse(r.out).id).refs;
  assert.equal(ref.chosen_by, "identical");
  assert.equal(ref.worktree, listWorktrees(main)[0].path);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("differing versions are ambiguous until the user picks one (T-4.3)", () => {
  const { base, main, feat } = tempSource();
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const root = tempProject();
  const id = JSON.parse(openWithStory(root, "The fee follows docs/pricing.md.", main).out).id;
  const [ref] = readYaml(root, id).refs;
  assert.deepEqual([ref.status, ref.candidates, ref.snapshot], ["ambiguous", ["main", "feat-x", "old"], undefined]);
  const gate = JSON.parse(cli(root, ["next", id], main).out);
  assert.deepEqual([gate.action, gate.actor], ["resolve_sources", "user"]);
  assert.match(cli(root, ["packet", id], main).out, /docs\/pricing\.md\n {4}main @ \w{8} · .*\n {4}feat-x @ \w{8} · uncommitted changes · .*\n {4}old @ \w{8} · branch only/);
  const unknown = cli(root, ["source", "pick", id, "docs/pricing.md", "nope"], main);
  assert.equal(unknown.code, 1);
  assert.match(unknown.err, /labels: main, feat-x, old/);
  const picked = cli(root, ["source", "pick", id, "docs/pricing.md", "feat-x"], main);
  assert.equal(picked.code, 0, picked.err);
  assert.equal(JSON.parse(picked.out).next.action, "write_artifact");
  const [after] = readYaml(root, id).refs;
  assert.deepEqual([after.status, after.chosen_by, after.branch, after.candidates], ["resolved", "user", "feat-x", undefined]);
  assert.equal(readFileSync(join(root, "work", id, after.snapshot), "utf8"), "# Pricing\n\nThe daily rate is 12.\n");
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("a pin that matches nothing exits 2 listing the places and creates no work item (T-4.4)", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const r = openWithStory(root, "Per analysis@old:docs/none.md the fee is waived.", main);
  assert.equal(r.code, 2);
  assert.deepEqual(JSON.parse(r.out).failures, ["analysis@old:docs/none.md: no docs/none.md on branch old; searched main, feat-x, old"]);
  assert.equal(existsSync(join(root, "work")) && readdirSync(join(root, "work")).length > 0, false);
  const pinned = openWithStory(root, "Per analysis@old:docs/pricing.md the fee is waived.", main);
  assert.equal(pinned.code, 0, pinned.err);
  const [ref] = readYaml(root, JSON.parse(pinned.out).id).refs;
  assert.deepEqual([ref.chosen_by, ref.branch, ref.worktree], ["pin", "old", null]);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("ordinary words stay plain text; a path-like miss with an extension is unmatched (T-4.5)", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const r = openWithStory(root, "Weekly and/or monthly; see notes/missing.md, docs/pricing.md:3 and https://x.io/a/b.md.", main);
  const record = readYaml(root, JSON.parse(r.out).id);
  assert.deepEqual(record.refs.map((x) => x.ref), ["docs/pricing.md"]);
  assert.deepEqual(record.unmatched, ["notes/missing.md"]);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("tokens strip punctuation and line suffixes, read pins, refuse dot segments, and cap at 200", () => {
  assert.deepEqual(tokens("(docs/a.md:12), `b.md`, c.md, analysis@feat-x:docs/c.md ../etc/passwd"), [
    { ref: "docs/a.md", source: null, path: "docs/a.md", pin: null },
    { ref: "b.md", source: null, path: "b.md", pin: null },
    { ref: "analysis@feat-x:docs/c.md", source: "analysis", path: "docs/c.md", pin: "feat-x" },
  ]);
  assert.equal(tokens(Array.from({ length: 300 }, (_, i) => `d/f${i}.md`).join(" ")).length, 200);
});

test("with no reachable source the story is saved and no sources.yaml is written", () => {
  const root = tempProject();
  const r = openWithStory(root, "See docs/pricing.md.", null);
  assert.equal(r.code, 0, r.err);
  const id = JSON.parse(r.out).id;
  assert.equal(existsSync(join(root, "work", id, "story.md")), true);
  assert.equal(existsSync(join(root, "work", id, "sources.yaml")), false);
  rmSync(root, { recursive: true, force: true });
});

test("source grep reports an invalid regex instead of no hits", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const r = cli(root, ["source", "grep", "analysis", "rate["], main);
  assert.equal(r.code, 1);
  assert.match(r.err, /git grep failed/);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("snapshot bytes are ignored by git and sources.yaml is not (T-4.7)", () => {
  const ignored = (p) => spawnSync("git", ["check-ignore", "-q", p], { cwd: resolve(".") }).status === 0;
  assert.equal(ignored("work/x/sources/analysis/a.md"), true);
  assert.equal(ignored("work/x/sources.yaml"), false);
});

test("SessionStart names each source with its root, or unreachable with the reason (T-3.6)", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const session = (sourceRoot) => {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
    delete env.HARNESS_SOURCE_ANALYSIS;
    if (sourceRoot) env.HARNESS_SOURCE_ANALYSIS = sourceRoot;
    const out = execFileSync("node", [join(HOOKS, "inject.state.mjs")], { input: JSON.stringify({ hook_event_name: "SessionStart", cwd: root }), encoding: "utf8", env });
    return JSON.parse(out).hookSpecificOutput.additionalContext;
  };
  assert.ok(session(main).includes(`# Sources\n- analysis: ${resolve(main)} · read-only`));
  assert.match(session(null), /- analysis: unreachable \(HARNESS_SOURCE_ANALYSIS is not set/);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});
