import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { findPaths as find } from "../../dist/lib/verbs/source/find.mjs";
import { grepHits as grep } from "../../dist/lib/verbs/source/grep.mjs";
import { candidates, contentHash, places } from "../../dist/lib/shared/sources/places.mjs";
import { parse as parseYaml } from "../../dist/lib/util/yaml-lite.mjs";
import { canonicalPath, sourceRoots, underSource } from "../../dist/lib/shared/sources/protection.mjs";
import { runCli } from "#test/cli.mts";
import { gitAt } from "#test/git.mts";
import { writeConfig } from "#test/project.mts";
import { tempProject, tempSource } from "#test/source.mts";

const PLATFORM = process.platform;

function cli(root, args, sourceRoot) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: root };
  delete env.HARNESS_SOURCE_ANALYSIS;
  if (sourceRoot) env.HARNESS_SOURCE_ANALYSIS = sourceRoot;
  const r = runCli(process.cwd(), [...args, "--root", root], { env });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test("harness source find lists docs/pricing.md once with every place it exists (T-3.3)", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const r = cli(root, ["source", "find", "analysis", "pricing.md"], main);
  assert.equal(r.code, 0, r.err);
  const { hits, overflow } = JSON.parse(r.out);
  assert.deepEqual(hits, [{ path: "docs/pricing.md", places: ["main", "feat-x", "old"] }]);
  assert.equal(overflow, 0);
});

test("harness source grep merges identical hits across places and reports overflow past 200 (T-3.4)", (t) => {
  const { main, source } = tempSource(t);
  const root = tempProject(t);
  const r = cli(root, ["source", "grep", "analysis", "rate"], main);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse(r.out).hits, [{ path: "docs/pricing.md", line: 3, text: "The daily rate is 10.", places: ["main", "feat-x", "old"] }]);
  writeFileSync(join(main, "docs", "rates.md"), Array.from({ length: 250 }, (_, i) => `rate ${i}`).join("\n") + "\n");
  gitAt(main)("add", "-A");
  const many = grep(source, "rate");
  assert.equal(many.hits.length, 200);
  assert.equal(many.overflow, 51);
  assert.equal(grep(source, "rate", { path: "docs/pricing.md" }).hits.length, 1, "--path narrows the search");
  assert.equal(find(source, "PRICING").hits.length, 1, "find is case-insensitive");
});

test("an undeclared source exits 2 naming the declared ones; an unset root exits 2 with the reason", (t) => {
  const root = tempProject(t);
  const undeclared = cli(root, ["source", "find", "specs", "x"]);
  assert.equal(undeclared.code, 2);
  const refusal = JSON.parse(undeclared.out);
  assert.match(refusal.error, /declared: analysis/);
  assert.deepEqual([refusal.ok, refusal.declared], [false, ["analysis"]]);
  const unset = cli(root, ["source", "find", "analysis", "x"]);
  assert.equal(unset.code, 2);
  assert.match(JSON.parse(unset.out).error, /HARNESS_SOURCE_ANALYSIS is not set/);
});

test("preflight warns on an unset source and reports the worktree count when it is reachable (T-3.5)", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const id = JSON.parse(cli(root, ["open", "--lane", "order", "--title", "Fees"]).out).id;
  const unset = cli(root, ["preflight", id, "--human"]);
  assert.match(unset.out, /^warn source:analysis: unreachable: HARNESS_SOURCE_ANALYSIS is not set/m);
  const set = cli(root, ["preflight", id, "--human"], main);
  assert.match(set.out, /^ok {3}source:analysis: .+ · 2 worktrees$/m);
  writeConfig(root, "{ broken");
  assert.match(cli(root, ["preflight", id, "--human"]).out, /^warn config: /m);
});

test("a root inside this project protects that folder only; a subfolder of another repo protects the repo; preflight warns on both", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const plain = join(root, "notes");
  mkdirSync(plain);
  const roots = sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: plain }, PLATFORM);
  assert.deepEqual(roots[0].paths, [canonicalPath(plain, PLATFORM)]);
  assert.equal(underSource(join(plain, "a.md"), roots, PLATFORM), "analysis");
  assert.equal(underSource(join(root, "src", "a.ts"), roots, PLATFORM), null, "the project stays writable");
  assert.equal(underSource(join(main, "README.md"), sourceRoots(root, { HARNESS_SOURCE_ANALYSIS: join(main, "docs") }, PLATFORM), PLATFORM), "analysis");
  const id = JSON.parse(cli(root, ["open", "--lane", "order", "--title", "Fees"]).out).id;
  assert.match(cli(root, ["preflight", id, "--human"], plain).out, /^warn source:analysis: .+ is not a repository top level; .+ that folder only/m);
  assert.match(cli(root, ["preflight", id, "--human"], join(main, "docs")).out, /^warn source:analysis: .+ is not a repository top level; the guards protect its whole repository/m);
});

function openWithStory(root, story, sourceRoot) {
  const file = join(root, "story.txt");
  writeFileSync(file, story);
  return cli(root, ["open", "--lane", "order", "--title", "Fees", "--ticket", "SHOP-1", "--story", file], sourceRoot);
}

function readYaml(root, id) {
  return parseYaml(readFileSync(join(root, "work", id, "sources.yaml"), "utf8"));
}

test("a story naming a folder opens the work item and resolves only the files it names", (t) => {
  const { main, source } = tempSource(t);
  mkdirSync(join(main, "src", "DriverPlatformWebapp"), { recursive: true });
  assert.deepEqual(candidates(source, "src/DriverPlatformWebapp", places(main)), []);
  const root = tempProject(t);
  const story = "The webapp lives in `src/DriverPlatformWebapp`, priced by `docs/pricing.md`, weekly and/or monthly, per https://x.io/a/b.md.\n";
  const r = openWithStory(root, story, main);
  assert.equal(r.code, 0, r.err);
  const { id, source: ticket } = JSON.parse(r.out);
  assert.equal(ticket, "SHOP-1");
  assert.equal(readFileSync(join(root, "work", id, "story.md"), "utf8"), story);
  const { refs, unmatched } = readYaml(root, id);
  assert.deepEqual(refs.map((ref) => ref.path), ["docs/pricing.md"]);
  assert.deepEqual(unmatched, []);
});

test("differing versions are ambiguous until the user picks one (T-4.3)", (t) => {
  const { main, feat } = tempSource(t);
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const root = tempProject(t);
  const id = JSON.parse(openWithStory(root, "The fee follows docs/pricing.md.", main).out).id;
  const [ref] = readYaml(root, id).refs;
  assert.deepEqual([ref.status, ref.candidates, ref.snapshot], ["ambiguous", ["main", "feat-x", "old"], undefined]);
  const gate = JSON.parse(cli(root, ["next", id], main).out);
  assert.deepEqual([gate.action, gate.actor], ["resolve_sources", "user"]);
  assert.match(cli(root, ["packet", id], main).out, /docs\/pricing\.md\n {4}main @ \w{8} · .*\n {4}feat-x @ \w{8} · uncommitted changes · .*\n {4}old @ \w{8} · branch only/);
  const unknown = cli(root, ["source", "pick", id, "docs/pricing.md", "nope"], main);
  assert.equal(unknown.code, 2);
  const refusal = JSON.parse(unknown.out);
  assert.match(refusal.error, /labels: main, feat-x, old/);
  assert.deepEqual([refusal.ok, refusal.labels], [false, ["main", "feat-x", "old"]]);
  const notRecorded = cli(root, ["source", "pick", id, "docs/none.md", "main"], main);
  assert.deepEqual([notRecorded.code, JSON.parse(notRecorded.out).ref], [2, "docs/none.md"]);
  const picked = cli(root, ["source", "pick", id, "docs/pricing.md", "feat-x"], main);
  assert.equal(picked.code, 0, picked.err);
  assert.equal(JSON.parse(picked.out).next.action, "write_artifact");
  const [after] = readYaml(root, id).refs;
  assert.deepEqual([after.status, after.chosen_by, after.branch, after.dirty, after.candidates], ["resolved", "user", "feat-x", true, undefined]);
  assert.equal(readFileSync(join(root, "work", id, after.snapshot), "utf8"), "# Pricing\n\nThe daily rate is 12.\n");
});

test("a pin that matches nothing exits 2 listing the places and creates no work item (T-4.4)", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const r = openWithStory(root, "Per analysis@old:docs/none.md the fee is waived.", main);
  assert.equal(r.code, 2);
  assert.deepEqual(JSON.parse(r.out).failures, ["analysis@old:docs/none.md: no docs/none.md on branch old; searched main, feat-x, old"]);
  assert.equal(existsSync(join(root, "work")) && readdirSync(join(root, "work")).length > 0, false);
  const pinned = openWithStory(root, "Per analysis@old:docs/pricing.md the fee is waived.", main);
  assert.equal(pinned.code, 0, pinned.err);
  const [ref] = readYaml(root, JSON.parse(pinned.out).id).refs;
  assert.deepEqual([ref.chosen_by, ref.branch, ref.worktree], ["pin", "old", null]);
});

test("with no reachable source the story is saved and no sources.yaml is written", (t) => {
  const root = tempProject(t);
  const r = openWithStory(root, "See docs/pricing.md.", null);
  assert.equal(r.code, 0, r.err);
  const { id, warnings } = JSON.parse(r.out);
  assert.match(warnings[0], /without snapshots: no reachable source \(analysis: HARNESS_SOURCE_ANALYSIS is not set/);
  assert.equal(existsSync(join(root, "work", id, "story.md")), true);
  assert.equal(existsSync(join(root, "work", id, "sources.yaml")), false);
});

test("source grep reports an invalid regex instead of no hits", (t) => {
  const { main } = tempSource(t);
  const root = tempProject(t);
  const r = cli(root, ["source", "grep", "analysis", "rate["], main);
  assert.equal(r.code, 2);
  const refusal = JSON.parse(r.out);
  assert.match(refusal.error, /^git grep failed:/);
  assert.deepEqual([refusal.ok, refusal.source], [false, "analysis"]);
});

test("snapshot bytes are ignored by git and sources.yaml is not (T-4.7)", () => {
  const ignored = (p) => spawnSync("git", ["check-ignore", "-q", p], { cwd: resolve(".") }).status === 0;
  assert.equal(ignored("work/x/sources/analysis/a.md"), true);
  assert.equal(ignored("work/x/sources.yaml"), false);
});

function openPlain(root) {
  return JSON.parse(cli(root, ["open", "--lane", "order", "--title", "Later refs"]).out).id;
}

test("source add appends a single-candidate document once; a second add changes nothing (T-5.1)", (t) => {
  const { main } = tempSource(t);
  writeFileSync(join(main, "docs", "a.md"), "# A\n");
  const root = tempProject(t);
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
});

test("source add of a document with two versions exits 2 with both labels and writes nothing (T-5.2)", (t) => {
  const { main, feat } = tempSource(t);
  writeFileSync(join(feat, "docs", "pricing.md"), "# Pricing\n\nThe daily rate is 12.\n");
  const root = tempProject(t);
  const id = JSON.parse(openWithStory(root, "No references here.", main).out).id;
  const before = readFileSync(join(root, "work", id, "sources.yaml"));
  const r = cli(root, ["source", "add", id, "docs/pricing.md"], main);
  assert.equal(r.code, 2);
  assert.match(JSON.parse(r.out).error, /differs across places: main, feat-x, old/);
  assert.deepEqual(JSON.parse(r.out).candidates, ["main", "feat-x", "old"]);
  assert.deepEqual(readFileSync(join(root, "work", id, "sources.yaml")), before);
  const missing = cli(root, ["source", "add", id, "docs/none.md"], main);
  assert.equal(missing.code, 2);
  assert.match(JSON.parse(missing.out).error, /not found; searched analysis: main, feat-x, old/);
  const word = cli(root, ["source", "add", id, "hello"], main);
  assert.deepEqual([word.code, JSON.parse(word.out).ref], [2, "hello"]);
});

test("summary reports moved: true with both hashes after the worktree file is edited (T-5.3)", (t) => {
  const { main } = tempSource(t);
  writeFileSync(join(main, "docs", "a.md"), "# A\n");
  const root = tempProject(t);
  const id = openPlain(root);
  cli(root, ["source", "add", id, "docs/a.md"], main);
  const summary = () => JSON.parse(cli(root, ["summary", id], main).out).sources;
  const [still] = summary();
  assert.deepEqual([still.ref, still.moved, still.live_sha256 === still.snapshot_sha256], ["docs/a.md", false, true]);
  writeFileSync(join(main, "docs", "a.md"), "# A, revised\n");
  const [moved] = summary();
  assert.equal(moved.moved, true);
  assert.equal(moved.snapshot_sha256, still.snapshot_sha256);
  assert.equal(moved.live_sha256, contentHash(Buffer.from("# A, revised\n")));
});

test("a removed linked worktree reports live_sha256 null, moved true and a reason (T-5.4)", (t) => {
  const { main, feat } = tempSource(t);
  writeFileSync(join(feat, "docs", "only-feat.md"), "# Feat only\n");
  const root = tempProject(t);
  const id = openPlain(root);
  const added = JSON.parse(cli(root, ["source", "add", id, "docs/only-feat.md"], main).out);
  assert.equal(added.ref.branch, "feat-x");
  gitAt(main)("worktree", "remove", "--force", feat);
  const [ref] = JSON.parse(cli(root, ["summary", id], main).out).sources;
  assert.deepEqual([ref.live_sha256, ref.moved], [null, true]);
  assert.match(ref.reason, /worktree .* no longer exists/);
});
