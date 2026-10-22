import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { appendWaiver, createWork, readState, writeState } from "../../dist/lib/work.mjs";
import { branchingManifestPath } from "../../dist/lib/paths.mjs";
import { reviewSummary, reviewSummaryRange } from "../../dist/lib/review.mjs";
import { nestedRepos, readBases } from "../../dist/lib/repos.mjs";

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function commitFile(dir, file, text, message) {
  writeFileSync(join(dir, file), text);
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
}

/** A project root (its own repo) with one nested product repo at src/Orders on branch main. */
function umbrella() {
  const root = mkdtempSync(join(tmpdir(), "harness-review-"));
  mkdirSync(join(root, ".claude"));
  git(root, "init", "-q", "-b", "trunk");
  commitFile(root, "README.md", "umbrella\n", "root");
  const orders = join(root, "src", "Orders");
  mkdirSync(orders, { recursive: true });
  git(orders, "init", "-q", "-b", "main");
  commitFile(orders, "pricing.cs", "class Pricing {}\n", "orders");
  return { root, orders };
}

test("a modified file in a nested repo is listed by its path, not as the repo directory (T-1.1)", () => {
  const { root, orders } = umbrella();
  const s = createWork({ lane: "order", title: "Orders pricing", root });
  writeFileSync(join(orders, "pricing.cs"), "class Pricing { int Rate; }\n");
  const r = reviewSummary(s.id, { root });
  assert.ok(r.changed_files.includes("src/Orders/pricing.cs"), r.changed_files.join(","));
  assert.ok(!r.changed_files.includes("src/Orders/"));
  assert.equal(r.lines_added, 1);
  rmSync(root, { recursive: true, force: true });
});

test("a commit in the nested repo after createWork is diffed from the recorded base (T-1.2)", () => {
  const { root, orders } = umbrella();
  const s = createWork({ lane: "order", title: "Orders pricing", root });
  const recorded = readBases(s.id, root)["src/Orders"];
  assert.equal(recorded, git(orders, "rev-parse", "HEAD"));
  commitFile(orders, "fees.cs", "class Fees {}\n", "fees");
  const r = reviewSummary(s.id, { root });
  assert.ok(r.changed_files.includes("src/Orders/fees.cs"));
  assert.equal(r.repos.length, 1);
  assert.deepEqual({ path: r.repos[0].path, base: r.repos[0].base, base_from: r.repos[0].base_from, files: r.repos[0].files }, { path: "src/Orders", base: recorded, base_from: "recorded", files: 1 });
  rmSync(root, { recursive: true, force: true });
});

test("an item with a branch is diffed in the nested repo's linked worktree on that branch (T-1.3)", () => {
  const { root, orders } = umbrella();
  const s = createWork({ lane: "order", title: "Orders pricing", root });
  writeState({ ...readState(s.id, root), branch: "feat-x" }, root);
  const wt = join(mkdtempSync(join(tmpdir(), "harness-wt-")), "orders-feat");
  git(orders, "worktree", "add", "-q", "-b", "feat-x", wt);
  writeFileSync(join(wt, "pricing.cs"), "class Pricing { int Fee; }\n");
  const r = reviewSummary(s.id, { root });
  assert.match(r.repos[0].worktree, /\/orders-feat$/);
  assert.ok(r.changed_files.includes("src/Orders/pricing.cs"));
  assert.equal(r.lines_added, 1);
  rmSync(root, { recursive: true, force: true });
  rmSync(resolve(wt, ".."), { recursive: true, force: true });
});

test("without repos.yaml the nested repo is diffed from merge-base with its default branch (T-1.4)", () => {
  const { root, orders } = umbrella();
  git(orders, "checkout", "-q", "-b", "feature");
  commitFile(orders, "fees.cs", "class Fees {}\n", "fees");
  const s = createWork({ lane: "order", title: "Orders pricing", root });
  rmSync(join(root, "work", s.id, "repos.yaml"));
  const r = reviewSummary(s.id, { root });
  assert.equal(r.repos[0].base_from, "merge-base");
  assert.equal(r.repos[0].base, git(orders, "rev-parse", "main"));
  assert.ok(r.changed_files.includes("src/Orders/fees.cs"));
  rmSync(root, { recursive: true, force: true });
});

test("the manifest's nested entries win over the src/ scan, inline comments stripped", () => {
  const { root } = umbrella();
  mkdirSync(dirname(branchingManifestPath(root)), { recursive: true });
  writeFileSync(branchingManifestPath(root), "version: 1\nscan_root: src   # nested clones\nrepos:\n  - name: Umbrella\n    path: .\n    default_branch: trunk\n  - name: Orders\n    path: src/Orders   # the product\n    default_branch: main\n");
  assert.deepEqual(nestedRepos(root), [{ path: "src/Orders", default_branch: "main" }]);
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

function extensionRepo(stepsByExtension) {
  const root = mkdtempSync(join(tmpdir(), "picket-review-ext-"));
  git(root, "init", "-q", "-b", "trunk");
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeFileSync(join(root, ".picket", "config.json"), JSON.stringify({ version: 1, extensions: Object.keys(stepsByExtension) }));
  for (const [name, steps] of Object.entries(stepsByExtension)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(join(dir, "review"), { recursive: true });
    for (const [file] of steps) writeFileSync(join(dir, "review", file), `| ${file} | check |\n`);
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "0.1.0", schema: 1, review_steps: steps.map(([file, min_size]) => ({ path: `review/${file}`, min_size })) }));
  }
  commitFile(root, "README.md", "base\n", "base");
  return root;
}

function changeFiles(root, count, dir = "src") {
  mkdirSync(join(root, dir), { recursive: true });
  for (let i = 0; i < count; i++) writeFileSync(join(root, dir, `f${i}.ts`), "export const x = 1;\n");
}

const STEPS = { acme: [["small.md", "small"], ["medium.md", "medium"]], local: [["large.md", "large"]] };
const stepPaths = (summary) => summary.extension_steps.map((s) => `${s.extension}:${s.path}`);

test("extension review steps load from their min_size up, in config order across extensions", () => {
  const root = extensionRepo(STEPS);
  try {
    const id = createWork({ lane: "order", title: "Steps", root }).id;
    changeFiles(root, 1);
    assert.equal(reviewSummary(id, { root }).size, "small");
    assert.deepEqual(stepPaths(reviewSummary(id, { root })), ["acme:.picket/extensions/acme/review/small.md"]);
    changeFiles(root, 6);
    assert.equal(reviewSummary(id, { root }).size, "medium");
    assert.deepEqual(stepPaths(reviewSummary(id, { root })), ["acme:.picket/extensions/acme/review/small.md", "acme:.picket/extensions/acme/review/medium.md"]);
    changeFiles(root, 12);
    assert.equal(reviewSummary(id, { root }).size, "large");
    assert.deepEqual(stepPaths(reviewSummary(id, { root })), ["acme:.picket/extensions/acme/review/small.md", "acme:.picket/extensions/acme/review/medium.md", "local:.picket/extensions/local/review/large.md"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a small change on a security path loads every extension review step", () => {
  const root = extensionRepo(STEPS);
  try {
    const id = createWork({ lane: "design", title: "Auth", root }).id;
    changeFiles(root, 1, "src/auth");
    const summary = reviewSummary(id, { root });
    assert.equal(summary.size, "small");
    assert.equal(summary.security_path, true);
    assert.equal(summary.extension_steps.length, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("with no extension enabled, extension_steps is empty and the summary keeps every other field", () => {
  const root = extensionRepo({});
  try {
    const id = createWork({ lane: "order", title: "Plain", root }).id;
    changeFiles(root, 2);
    const summary = reviewSummary(id, { root });
    assert.deepEqual(summary.extension_steps, []);
    assert.deepEqual(Object.keys(summary), ["work_id", "base", "request", "size", "changed_files", "lines_added", "lines_removed", "frameworks", "concerns", "security_path", "extension_steps", "phases", "repos", "sources", "silenced", "mutation"]);
    assert.equal(summary.mutation, null, "no mutation.json, no mutation");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function testedRepo() {
  const root = mkdtempSync(join(tmpdir(), "harness-review-silenced-"));
  mkdirSync(join(root, ".claude"));
  mkdirSync(join(root, "test"));
  git(root, "init", "-q", "-b", "trunk");
  writeFileSync(join(root, "test", "old.test.ts"), 'it("keeps", () => {});\n');
  commitFile(root, "test/fee.test.ts", 'it("rounds", () => {});\n', "base");
  return root;
}

const focus = 'it.only("rounds", () => {});';

test("a focus added since base is listed unwaived, however the file was written (T-2.1, T-2.3)", () => {
  const root = testedRepo();
  try {
    const id = createWork({ lane: "order", title: "Fees", root }).id;
    writeFileSync(join(root, "test", "fee.test.ts"), `${focus}\nit("rounds", () => {});\n`);
    assert.deepEqual(reviewSummary(id, { root }).silenced, [{ path: "test/fee.test.ts", kind: "focused-test", text: focus, waived: false }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a waived line is listed with waived: true", () => {
  const root = testedRepo();
  try {
    const id = createWork({ lane: "order", title: "Fees", root }).id;
    writeFileSync(join(root, "test", "fee.test.ts"), `${focus}\n`);
    appendWaiver(id, { path: "test/fee.test.ts", text: focus }, root, root);
    assert.deepEqual(reviewSummary(id, { root }).silenced.map((m) => m.waived), [true]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a tracked test file deleted since base is a deleted-test, waived only by a --deleted waiver (T-2.2)", () => {
  const root = testedRepo();
  try {
    const id = createWork({ lane: "order", title: "Fees", root }).id;
    rmSync(join(root, "test", "old.test.ts"));
    assert.deepEqual(reviewSummary(id, { root }).silenced, [{ path: "test/old.test.ts", kind: "deleted-test", text: null, waived: false }]);
    appendWaiver(id, { path: "test/old.test.ts", text: "it(" }, root, root);
    assert.equal(reviewSummary(id, { root }).silenced[0].waived, false, "a text waiver does not cover a deletion");
    appendWaiver(id, { path: "test/old.test.ts", deleted: true }, root, root);
    assert.equal(reviewSummary(id, { root }).silenced[0].waived, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a file over a megabyte at base is read whole, so its existing suppression is not new", () => {
  const root = testedRepo();
  try {
    const big = ["// eslint-disable-next-line no-console", ...Array.from({ length: 40000 }, (_, i) => `export const value${i} = ${i};`)].join("\n");
    commitFile(root, "big.ts", `${big}\n`, "big");
    const id = createWork({ lane: "order", title: "Big", root }).id;
    writeFileSync(join(root, "big.ts"), `${big}\nexport const extra = 1;\n`);
    assert.deepEqual(reviewSummary(id, { root }).silenced, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the range summary lists silenced moves between two commits, all unwaived (T-2.4)", () => {
  const root = testedRepo();
  try {
    const base = git(root, "rev-parse", "HEAD");
    commitFile(root, "test/fee.test.ts", `${focus}\n`, "focus");
    git(root, "rm", "-q", "test/old.test.ts");
    git(root, "commit", "-q", "-m", "drop");
    const head = git(root, "rev-parse", "HEAD");
    writeFileSync(join(root, "test", "fee.test.ts"), "it.skip(\"working tree only\", () => {});\n");
    assert.deepEqual(reviewSummaryRange(root, base, head).silenced, [
      { path: "test/fee.test.ts", kind: "focused-test", text: focus, waived: false },
      { path: "test/old.test.ts", kind: "deleted-test", text: null, waived: false },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
