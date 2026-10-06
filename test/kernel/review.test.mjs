import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createWork, readState, writeState } from "../../core/lib/work.mjs";
import { branchingManifestPath } from "../../core/lib/paths.mjs";
import { reviewSummary } from "../../core/lib/review.mjs";
import { nestedRepos, readBases } from "../../core/lib/repos.mjs";

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function commitFile(dir, file, text, message) {
  writeFileSync(join(dir, file), text);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
}

/** A project root (its own repo) with one nested product repo at src/Rent on branch main. */
function umbrella() {
  const root = mkdtempSync(join(tmpdir(), "harness-review-"));
  mkdirSync(join(root, ".claude"));
  git(root, "init", "-q", "-b", "trunk");
  commitFile(root, "README.md", "umbrella\n", "root");
  const rent = join(root, "src", "Rent");
  mkdirSync(rent, { recursive: true });
  git(rent, "init", "-q", "-b", "main");
  commitFile(rent, "pricing.cs", "class Pricing {}\n", "rent");
  return { root, rent };
}

test("a modified file in a nested repo is listed by its path, not as the repo directory (T-1.1)", () => {
  const { root, rent } = umbrella();
  const s = createWork({ lane: "order", title: "Rent pricing", root });
  writeFileSync(join(rent, "pricing.cs"), "class Pricing { int Rate; }\n");
  const r = reviewSummary(s.id, { root });
  assert.ok(r.changed_files.includes("src/Rent/pricing.cs"), r.changed_files.join(","));
  assert.ok(!r.changed_files.includes("src/Rent/"));
  assert.equal(r.lines_added, 1);
  rmSync(root, { recursive: true, force: true });
});

test("a commit in the nested repo after createWork is diffed from the recorded base (T-1.2)", () => {
  const { root, rent } = umbrella();
  const s = createWork({ lane: "order", title: "Rent pricing", root });
  const recorded = readBases(s.id, root)["src/Rent"];
  assert.equal(recorded, git(rent, "rev-parse", "HEAD"));
  commitFile(rent, "fees.cs", "class Fees {}\n", "fees");
  const r = reviewSummary(s.id, { root });
  assert.ok(r.changed_files.includes("src/Rent/fees.cs"));
  assert.equal(r.repos.length, 1);
  assert.deepEqual({ path: r.repos[0].path, base: r.repos[0].base, base_from: r.repos[0].base_from, files: r.repos[0].files }, { path: "src/Rent", base: recorded, base_from: "recorded", files: 1 });
  rmSync(root, { recursive: true, force: true });
});

test("an item with a branch is diffed in the nested repo's linked worktree on that branch (T-1.3)", () => {
  const { root, rent } = umbrella();
  const s = createWork({ lane: "order", title: "Rent pricing", root });
  writeState({ ...readState(s.id, root), branch: "feat-x" }, root);
  const wt = join(mkdtempSync(join(tmpdir(), "harness-wt-")), "rent-feat");
  git(rent, "worktree", "add", "-q", "-b", "feat-x", wt);
  writeFileSync(join(wt, "pricing.cs"), "class Pricing { int Fee; }\n");
  const r = reviewSummary(s.id, { root });
  assert.match(r.repos[0].worktree, /\/rent-feat$/);
  assert.ok(r.changed_files.includes("src/Rent/pricing.cs"));
  assert.equal(r.lines_added, 1);
  rmSync(root, { recursive: true, force: true });
  rmSync(resolve(wt, ".."), { recursive: true, force: true });
});

test("without repos.yaml the nested repo is diffed from merge-base with its default branch (T-1.4)", () => {
  const { root, rent } = umbrella();
  git(rent, "checkout", "-q", "-b", "feature");
  commitFile(rent, "fees.cs", "class Fees {}\n", "fees");
  const s = createWork({ lane: "order", title: "Rent pricing", root });
  rmSync(join(root, "work", s.id, "repos.yaml"));
  const r = reviewSummary(s.id, { root });
  assert.equal(r.repos[0].base_from, "merge-base");
  assert.equal(r.repos[0].base, git(rent, "rev-parse", "main"));
  assert.ok(r.changed_files.includes("src/Rent/fees.cs"));
  rmSync(root, { recursive: true, force: true });
});

test("the manifest's nested entries win over the src/ scan, inline comments stripped", () => {
  const { root } = umbrella();
  mkdirSync(dirname(branchingManifestPath(root)), { recursive: true });
  writeFileSync(branchingManifestPath(root), "version: 1\nscan_root: src   # nested clones\nrepos:\n  - name: Umbrella\n    path: .\n    default_branch: trunk\n  - name: Rent\n    path: src/Rent   # the product\n    default_branch: main\n");
  assert.deepEqual(nestedRepos(root), [{ path: "src/Rent", default_branch: "main" }]);
  rmSync(root, { recursive: true, force: true });
});

test("this repository has no nested repos, so the summary has the same shape as before (T-1.6)", () => {
  const here = resolve(".");
  assert.deepEqual(nestedRepos(here), []);
});

test("a project without nested repos writes no repos.yaml and reports repos []", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-review-"));
  mkdirSync(join(root, ".claude"));
  git(root, "init", "-q", "-b", "trunk");
  commitFile(root, "a.ts", "a\n", "a");
  const s = createWork({ lane: "order", title: "Plain", root });
  assert.equal(existsSync(join(root, "work", s.id, "repos.yaml")), false);
  writeFileSync(join(root, "a.ts"), "b\n");
  const r = reviewSummary(s.id, { root });
  assert.deepEqual(r.changed_files, ["a.ts"]);
  assert.deepEqual(r.repos, []);
  assert.equal(r.request, null);
  assert.deepEqual(r.sources, [], "no sources.yaml, no drift entries (T-5.5)");
  rmSync(root, { recursive: true, force: true });
});
