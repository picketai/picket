import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { candidates, contentHash, find, grep, listWorktrees, localBranches, tokens } from "../../core/lib/sources.mjs";
import { parse as parseYaml } from "../../core/lib/yaml-lite.mjs";
import { canonicalPath, sourceRoots, underSource } from "../../core/lib/source-paths.mjs";
import { writeConfig } from "./config-fixture.mjs";

const BIN = resolve("core/bin/picket.mjs");
const HOOKS = resolve("core/hooks");

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
  writeConfig(root, { sources: { analysis: { env: "HARNESS_SOURCE_ANALYSIS" } } });
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
  writeConfig(root, "{ broken");
  assert.match(cli(root, ["preflight", id, "--human"]).out, /^warn config: /m);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("a root inside this project protects that folder only; a subfolder of another repo protects the repo; preflight warns on both", () => {
  const { base, main } = tempSource();
  const root = tempProject();
  const plain = join(root, "notes");
  mkdirSync(plain);
  const roots = sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: plain });
  assert.deepEqual(roots[0].paths, [canonicalPath(plain)]);
  assert.equal(underSource(join(plain, "a.md"), roots), "analysis");
  assert.equal(underSource(join(root, "src", "a.ts"), roots), null, "the project stays writable");
  assert.equal(underSource(join(main, "README.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: join(main, "docs") })), "analysis");
  const id = JSON.parse(cli(root, ["new", "--lane", "order", "--title", "Fees"]).out).id;
  assert.match(cli(root, ["preflight", id, "--human"], plain).out, /^warn source:analysis: .+ is not a repository top level; .+ that folder only/m);
  assert.match(cli(root, ["preflight", id, "--human"], join(main, "docs")).out, /^warn source:analysis: .+ is not a repository top level; the guards protect its whole repository/m);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

/** Opens an order item with a story through the CLI, against the given source. */
function openWithStory(root, story, sourceRoot) {
  const file = join(root, "story.txt");
  writeFileSync(file, story);
  return cli(root, ["new", "--lane", "order", "--title", "Fees", "--ticket", "SHOP-1", "--story", file], sourceRoot);
}

function readYaml(root, id) {
  return parseYaml(readFileSync(join(root, "work", id, "sources.yaml"), "utf8"));
}

test("a document only in the main worktree resolves single, and the snapshot is its bytes (T-4.1, T-4.6)", () => {
  const { base, main } = tempSource();
  mkdirSync(join(main, "docs", "orders"));
  writeFileSync(join(main, "docs", "orders", "pricing.md"), "# Order pricing\n");
  git(main, "add", "-A");
  git(main, "commit", "-q", "-m", "order pricing");
  writeFileSync(join(main, "docs", "orders", "pricing.md"), "# Order pricing\n\nDraft: weekend rate.\n");
  const root = tempProject();
  const r = openWithStory(root, "As a customer I pay what `docs/orders/pricing.md` says.\n", main);
  assert.equal(r.code, 0, r.err);
  const { id, source } = JSON.parse(r.out);
  assert.equal(source, "SHOP-1");
  assert.equal(readFileSync(join(root, "work", id, "story.md"), "utf8"), "As a customer I pay what `docs/orders/pricing.md` says.\n");
  const [ref] = readYaml(root, id).refs;
  assert.deepEqual([ref.ref, ref.status, ref.chosen_by, ref.branch, ref.dirty], ["docs/orders/pricing.md", "resolved", "single", "main", true]);
  assert.equal(ref.commit, git(main, "rev-parse", "HEAD"), "a dirty copy records the worktree's HEAD");
  assert.deepEqual(readFileSync(join(root, "work", id, ref.snapshot)), readFileSync(join(main, "docs", "orders", "pricing.md")));
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
    { ref: "docs/a.md", source: null, path: "docs/a.md", anchor: null, pin: null },
    { ref: "b.md", source: null, path: "b.md", anchor: null, pin: null },
    { ref: "analysis@feat-x:docs/c.md", source: "analysis", path: "docs/c.md", anchor: null, pin: "feat-x" },
  ]);
  assert.equal(tokens(Array.from({ length: 300 }, (_, i) => `d/f${i}.md`).join(" ")).length, 200);
});

test("a #fragment and a markdown link target resolve their path; an unshaped path goes to unmatched", () => {
  assert.deepEqual(tokens("See [late fees](./docs/orders/late%2Dfees.md), docs/orders/fees.md#late-fees and docs/orders/fees.md?v=2."), [
    { ref: "docs/orders/late-fees.md", source: null, path: "docs/orders/late-fees.md", anchor: null, pin: null },
    { ref: "docs/orders/fees.md", source: null, path: "docs/orders/fees.md", anchor: "late-fees", pin: null },
  ]);
  const { base, main } = tempSource();
  mkdirSync(join(main, "docs", "orders"));
  writeFileSync(join(main, "docs", "orders", "fees.md"), "# Fees\n");
  const root = tempProject();
  const r = openWithStory(root, "Per [fees](docs/orders/fees.md) and docs/orders/fees.md#late-fees; also docs/ré/x.md.", main);
  const record = readYaml(root, JSON.parse(r.out).id);
  assert.deepEqual(record.refs.map((x) => [x.ref, x.anchor]), [["docs/orders/fees.md", "late-fees"]]);
  assert.deepEqual(record.unmatched, ["docs/ré/x.md"]);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("with no reachable source the story is saved and no sources.yaml is written", () => {
  const root = tempProject();
  const r = openWithStory(root, "See docs/pricing.md.", null);
  assert.equal(r.code, 0, r.err);
  const { id, warnings } = JSON.parse(r.out);
  assert.match(warnings[0], /without snapshots: no reachable source \(analysis: HARNESS_SOURCE_ANALYSIS is not set/);
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

/** An order item opened without a story, so sources.yaml starts absent. */
function openPlain(root) {
  return JSON.parse(cli(root, ["new", "--lane", "order", "--title", "Later refs"]).out).id;
}

test("source add appends a single-candidate document once; a second add changes nothing (T-5.1)", () => {
  const { base, main } = tempSource();
  writeFileSync(join(main, "docs", "a.md"), "# A\n");
  const root = tempProject();
  const id = openPlain(root);
  const first = cli(root, ["source", "add", id, "docs/a.md"], main);
  assert.equal(first.code, 0, first.err);
  assert.equal(JSON.parse(first.out).added, true);
  const record = readFileSync(join(root, "work", id, "sources.yaml"));
  const [ref] = parseYaml(String(record)).refs;
  assert.deepEqual([ref.status, ref.chosen_by, ref.snapshot], ["resolved", "single", "sources/analysis/docs/a.md"]);
  assert.equal(readFileSync(join(root, "work", id, ref.snapshot), "utf8"), "# A\n");
  const again = cli(root, ["source", "add", id, "docs/a.md"], main);
  assert.equal(JSON.parse(again.out).added, false);
  assert.deepEqual(readFileSync(join(root, "work", id, "sources.yaml")), record);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("source add of a document with two versions exits 2 with both labels and writes nothing (T-5.2)", () => {
  const { base, main, feat } = tempSource();
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const root = tempProject();
  const id = JSON.parse(openWithStory(root, "No references here.", main).out).id;
  const before = readFileSync(join(root, "work", id, "sources.yaml"));
  const r = cli(root, ["source", "add", id, "docs/pricing.md"], main);
  assert.equal(r.code, 2);
  assert.match(JSON.parse(r.out).error, /differs across places: main, feat-x, old/);
  assert.deepEqual(readFileSync(join(root, "work", id, "sources.yaml")), before);
  const missing = cli(root, ["source", "add", id, "docs/none.md"], main);
  assert.equal(missing.code, 2);
  assert.match(JSON.parse(missing.out).error, /not found; searched analysis: main, feat-x, old/);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("review-summary reports moved: true with both hashes after the worktree file is edited (T-5.3)", () => {
  const { base, main } = tempSource();
  writeFileSync(join(main, "docs", "a.md"), "# A\n");
  const root = tempProject();
  const id = openPlain(root);
  cli(root, ["source", "add", id, "docs/a.md"], main);
  const summary = () => JSON.parse(cli(root, ["review-summary", id], main).out).sources;
  const [still] = summary();
  assert.deepEqual([still.ref, still.moved, still.live_sha256 === still.snapshot_sha256], ["docs/a.md", false, true]);
  writeFileSync(join(main, "docs", "a.md"), "# A, revised\n");
  const [moved] = summary();
  assert.equal(moved.moved, true);
  assert.equal(moved.snapshot_sha256, still.snapshot_sha256);
  assert.equal(moved.live_sha256, contentHash(Buffer.from("# A, revised\n")));
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("a removed linked worktree reports live_sha256 null, moved true and a reason (T-5.4)", () => {
  const { base, main, feat } = tempSource();
  writeFileSync(join(feat, "docs", "only-feat.md"), "# Feat only\n");
  const root = tempProject();
  const id = openPlain(root);
  const added = JSON.parse(cli(root, ["source", "add", id, "docs/only-feat.md"], main).out);
  assert.equal(added.ref.branch, "feat-x");
  git(main, "worktree", "remove", "--force", feat);
  const [ref] = JSON.parse(cli(root, ["review-summary", id], main).out).sources;
  assert.deepEqual([ref.live_sha256, ref.moved], [null, true]);
  assert.match(ref.reason, /worktree .* no longer exists/);
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("sourceRoots lists the same worktrees as git worktree list, also from a linked worktree (T-6.6)", () => {
  const { base, main, feat } = tempSource();
  const second = join(base, "analysis-second");
  git(main, "worktree", "add", "-q", "-b", "feat-y", second);
  const root = tempProject();
  const expected = listWorktrees(main).map((w) => canonicalPath(w.path)).sort();
  assert.equal(expected.length, 3);
  const fromFs = (sourceRoot) => sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: sourceRoot })[0].paths.slice().sort();
  assert.deepEqual(fromFs(main), expected);
  assert.deepEqual(fromFs(feat), expected, "a root that is itself a linked worktree still finds the others");
  assert.equal(underSource(join(second, "docs", "new.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: main })), "analysis");
  assert.equal(underSource(join(root, "a.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: main })), null);
  assert.deepEqual(sourceRoots(root, {}), [], "no root, nothing protected");
  assert.deepEqual(fromFs(join(main, "docs")), expected, "a subfolder root protects the whole repository and its worktrees");
  rmSync(base, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
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
