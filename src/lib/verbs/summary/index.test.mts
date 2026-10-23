import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { itemSummary, rangeSummary, verb, type RepoReport } from "./index.mts";
import { branchingManifestPath } from "../../shared/paths.mts";
import { nestedRepos, readBases } from "../../shared/repos.mts";
import { readState, writeState } from "../../shared/work/state.mts";
import { appendWaiver } from "../../shared/work/approvals.mts";
import type { WorkId } from "../../shared/work/files.mts";
import { mutate } from "../mutate/index.mts";
import { parseArgs, UsageError } from "../../util/args.mts";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import { openItem, withProject, writeConfig } from "#test/project.mts";

const ITEM = { base: undefined, env: process.env, platform: process.platform };

function diffed(report: RepoReport) {
  assert.ok("files" in report, JSON.stringify(report));
  return report;
}

function commitFile(dir: string, file: string, text: string, message: string) {
  writeIn(dir, file, text);
  gitIn(dir, "add", "-A");
  gitIn(dir, "commit", "-q", "-m", message);
}

function umbrella(t: TestContext) {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "README.md": "umbrella\n" }, message: "root" });
  const orders = join(root, "src", "Orders");
  mkdirSync(orders, { recursive: true });
  gitIn(orders, "init", "-q", "-b", "main");
  commitFile(orders, "pricing.cs", "class Pricing {}\n", "orders");
  return { root, orders };
}

const open = (root: string, lane: string, title: string) => openItem(root, { lane, title }).id;
const waive = (root: string, id: WorkId, entry: { path: string; text?: string; deleted?: boolean }) => appendWaiver(root, id, entry, { cwd: process.cwd(), now: new Date() });

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

test("summary reads an id with an optional base, or a range, and refuses a malformed range", () => {
  assert.deepEqual(parse([ID, "--base", "HEAD"]), { id: ID, base: "HEAD" });
  assert.deepEqual(parse(["--range", "HEAD~1..HEAD"]), { range: { base: "HEAD~1", head: "HEAD" } });
  assert.deepEqual(parse(["--range", "a...b"]), { range: { base: "a", head: "b" } });
  assert.throws(() => parse(["--range", "nope"]), UsageError);
  assert.throws(() => parse([]), UsageError);
});

test("a modified file in a nested repo is listed by its path, not as the repo directory (T-1.1)", (t) => {
  const { root, orders } = umbrella(t);
  const id = open(root, "order", "Orders pricing");
  writeFileSync(join(orders, "pricing.cs"), "class Pricing { int Rate; }\n");
  const r = itemSummary(root, id, ITEM);
  assert.ok(r.changed_files.includes("src/Orders/pricing.cs"), r.changed_files.join(","));
  assert.ok(!r.changed_files.includes("src/Orders/"));
  assert.equal(r.lines_added, 1);
});

test("a commit in the nested repo after createWork is diffed from the recorded base (T-1.2)", (t) => {
  const { root, orders } = umbrella(t);
  const id = open(root, "order", "Orders pricing");
  const recorded = readBases(root, id)["src/Orders"];
  assert.equal(recorded, gitOut(orders, "rev-parse", "HEAD"));
  commitFile(orders, "fees.cs", "class Fees {}\n", "fees");
  const r = itemSummary(root, id, ITEM);
  assert.ok(r.changed_files.includes("src/Orders/fees.cs"));
  assert.equal(r.repos.length, 1);
  const repo = diffed(r.repos[0]);
  assert.deepEqual({ path: repo.path, base: repo.base, base_from: repo.base_from, files: repo.files }, { path: "src/Orders", base: recorded, base_from: "recorded", files: 1 });
});

test("an item with a branch is diffed in the nested repo's linked worktree on that branch (T-1.3)", (t) => {
  const { root, orders } = umbrella(t);
  const id = open(root, "order", "Orders pricing");
  writeState(root, { ...readState(root, id), branch: "feat-x" }, new Date());
  const wt = join(withProject(t, { picket: false }), "orders-feat");
  gitIn(orders, "worktree", "add", "-q", "-b", "feat-x", wt);
  writeFileSync(join(wt, "pricing.cs"), "class Pricing { int Fee; }\n");
  const r = itemSummary(root, id, ITEM);
  assert.match(r.repos[0].worktree ?? "", /\/orders-feat$/);
  assert.ok(r.changed_files.includes("src/Orders/pricing.cs"));
  assert.equal(r.lines_added, 1);
});

test("without repos.yaml the nested repo is diffed from merge-base with its default branch (T-1.4)", (t) => {
  const { root, orders } = umbrella(t);
  gitIn(orders, "checkout", "-q", "-b", "feature");
  commitFile(orders, "fees.cs", "class Fees {}\n", "fees");
  const id = open(root, "order", "Orders pricing");
  rmSync(join(root, "work", id, "repos.yaml"));
  const r = itemSummary(root, id, ITEM);
  assert.equal(diffed(r.repos[0]).base_from, "merge-base");
  assert.equal(r.repos[0].base, gitOut(orders, "rev-parse", "main"));
  assert.ok(r.changed_files.includes("src/Orders/fees.cs"));
});

test("the manifest's nested entries win over the src/ scan, inline comments stripped", (t) => {
  const { root } = umbrella(t);
  mkdirSync(dirname(branchingManifestPath(root)), { recursive: true });
  writeFileSync(branchingManifestPath(root), "version: 1\nscan_root: src   # nested clones\nrepos:\n  - name: Umbrella\n    path: .\n    default_branch: trunk\n  - name: Orders\n    path: src/Orders   # the product\n    default_branch: main\n");
  assert.deepEqual(nestedRepos(root), [{ path: "src/Orders", default_branch: "main" }]);
});

test("this repository has no nested repos, so the summary has the same shape as before (T-1.6)", () => {
  const here = resolve(".");
  assert.deepEqual(nestedRepos(here), []);
});

test("a project without nested repos writes no repos.yaml and reports repos []", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "a.ts": "a\n" }, message: "a" });
  const id = open(root, "order", "Plain");
  assert.equal(existsSync(join(root, "work", id, "repos.yaml")), false);
  writeFileSync(join(root, "a.ts"), "b\n");
  const r = itemSummary(root, id, ITEM);
  assert.deepEqual(r.changed_files, ["a.ts"]);
  assert.deepEqual(r.repos, []);
  assert.equal(r.request, null);
  assert.deepEqual(r.sources, [], "no sources.yaml, no drift entries (T-5.5)");
});

type Steps = Record<string, [string, string][]>;

function extensionRepo(t: TestContext, stepsByExtension: Steps): string {
  const root = withProject(t, { picket: false });
  gitIn(root, "init", "-q", "-b", "trunk");
  mkdirSync(join(root, ".picket", "extensions"), { recursive: true });
  writeConfig(root, { version: 1, extensions: Object.keys(stepsByExtension) });
  for (const [name, steps] of Object.entries(stepsByExtension)) {
    const dir = join(root, ".picket", "extensions", name);
    mkdirSync(join(dir, "review"), { recursive: true });
    for (const [file] of steps) writeFileSync(join(dir, "review", file), `| ${file} | check |\n`);
    writeFileSync(join(dir, "extension.json"), JSON.stringify({ name, version: "0.1.0", schema: 1, review_steps: steps.map(([file, min_size]) => ({ path: `review/${file}`, min_size })) }));
  }
  commitFile(root, "README.md", "base\n", "base");
  return root;
}

function changeFiles(root: string, count: number, dir = "src") {
  mkdirSync(join(root, dir), { recursive: true });
  for (let i = 0; i < count; i++) writeFileSync(join(root, dir, `f${i}.ts`), "export const x = 1;\n");
}

const STEPS: Steps = { acme: [["small.md", "small"], ["medium.md", "medium"]], local: [["large.md", "large"]] };
const stepPaths = (summary: { extension_steps: { extension: string; path: string }[] }) => summary.extension_steps.map((s) => `${s.extension}:${s.path}`);

test("extension review steps load from their min_size up, in config order across extensions", (t) => {
  const root = extensionRepo(t, STEPS);
  const id = open(root, "order", "Steps");
  changeFiles(root, 1);
  assert.equal(itemSummary(root, id, ITEM).size, "small");
  assert.deepEqual(stepPaths(itemSummary(root, id, ITEM)), ["acme:.picket/extensions/acme/review/small.md"]);
  changeFiles(root, 6);
  assert.equal(itemSummary(root, id, ITEM).size, "medium");
  assert.deepEqual(stepPaths(itemSummary(root, id, ITEM)), ["acme:.picket/extensions/acme/review/small.md", "acme:.picket/extensions/acme/review/medium.md"]);
  changeFiles(root, 12);
  assert.equal(itemSummary(root, id, ITEM).size, "large");
  assert.deepEqual(stepPaths(itemSummary(root, id, ITEM)), ["acme:.picket/extensions/acme/review/small.md", "acme:.picket/extensions/acme/review/medium.md", "local:.picket/extensions/local/review/large.md"]);
});

test("a small change on a security path loads every extension review step", (t) => {
  const root = extensionRepo(t, STEPS);
  const id = open(root, "design", "Auth");
  changeFiles(root, 1, "src/auth");
  const summary = itemSummary(root, id, ITEM);
  assert.equal(summary.size, "small");
  assert.equal(summary.security_path, true);
  assert.equal(summary.extension_steps.length, 3);
});

test("with no extension enabled, extension_steps is empty and the summary keeps every other field", (t) => {
  const root = extensionRepo(t, {});
  const id = open(root, "order", "Plain");
  changeFiles(root, 2);
  const summary = itemSummary(root, id, ITEM);
  assert.deepEqual(summary.extension_steps, []);
  assert.deepEqual(Object.keys(summary), ["work_id", "base", "request", "size", "changed_files", "lines_added", "lines_removed", "frameworks", "concerns", "security_path", "extension_steps", "phases", "repos", "sources", "silenced", "mutation"]);
  assert.equal(summary.mutation, null, "no mutation.json, no mutation");
});

function testedRepo(t: TestContext): string {
  const root = withProject(t, { host: true, picket: false });
  mkdirSync(join(root, "test"));
  gitIn(root, "init", "-q", "-b", "trunk");
  writeFileSync(join(root, "test", "old.test.ts"), 'it("keeps", () => {});\n');
  commitFile(root, "test/fee.test.ts", 'it("rounds", () => {});\n', "base");
  return root;
}

const focus = 'it.only("rounds", () => {});';

test("a focus added since base is listed unwaived, however the file was written (T-2.1, T-2.3)", (t) => {
  const root = testedRepo(t);
  const id = open(root, "order", "Fees");
  writeFileSync(join(root, "test", "fee.test.ts"), `${focus}\nit("rounds", () => {});\n`);
  assert.deepEqual(itemSummary(root, id, ITEM).silenced, [{ path: "test/fee.test.ts", kind: "focused-test", text: focus, waived: false }]);
});

test("a waived line is listed with waived: true", (t) => {
  const root = testedRepo(t);
  const id = open(root, "order", "Fees");
  writeFileSync(join(root, "test", "fee.test.ts"), `${focus}\n`);
  waive(root, id, { path: "test/fee.test.ts", text: focus });
  assert.deepEqual(itemSummary(root, id, ITEM).silenced.map((m) => m.waived), [true]);
});

test("a tracked test file deleted since base is a deleted-test, waived only by a --deleted waiver (T-2.2)", (t) => {
  const root = testedRepo(t);
  const id = open(root, "order", "Fees");
  rmSync(join(root, "test", "old.test.ts"));
  assert.deepEqual(itemSummary(root, id, ITEM).silenced, [{ path: "test/old.test.ts", kind: "deleted-test", text: null, waived: false }]);
  waive(root, id, { path: "test/old.test.ts", text: "it(" });
  assert.equal(itemSummary(root, id, ITEM).silenced[0].waived, false, "a text waiver does not cover a deletion");
  waive(root, id, { path: "test/old.test.ts", deleted: true });
  assert.equal(itemSummary(root, id, ITEM).silenced[0].waived, true);
});

test("a file over a megabyte at base is read whole, so its existing suppression is not new", (t) => {
  const root = testedRepo(t);
  const big = ["// eslint-disable-next-line no-console", ...Array.from({ length: 40000 }, (_, i) => `export const value${i} = ${i};`)].join("\n");
  commitFile(root, "big.ts", `${big}\n`, "big");
  const id = open(root, "order", "Big");
  writeFileSync(join(root, "big.ts"), `${big}\nexport const extra = 1;\n`);
  assert.deepEqual(itemSummary(root, id, ITEM).silenced, []);
});

test("the range summary lists silenced moves between two commits, all unwaived (T-2.4)", (t) => {
  const root = testedRepo(t);
  const base = gitOut(root, "rev-parse", "HEAD");
  commitFile(root, "test/fee.test.ts", `${focus}\n`, "focus");
  gitIn(root, "rm", "-q", "test/old.test.ts");
  gitIn(root, "commit", "-q", "-m", "drop");
  const head = gitOut(root, "rev-parse", "HEAD");
  writeFileSync(join(root, "test", "fee.test.ts"), "it.skip(\"working tree only\", () => {});\n");
  assert.deepEqual(rangeSummary(root, base, head, process.env).silenced, [
    { path: "test/fee.test.ts", kind: "focused-test", text: focus, waived: false },
    { path: "test/old.test.ts", kind: "deleted-test", text: null, waived: false },
  ]);
});

function securityRepo(t: TestContext, securityPaths: string[] | null): string {
  const root = withProject(t);
  if (securityPaths) writeConfig(root, { version: 1, security_paths: securityPaths });
  gitIn(root, "init", "-q", "-b", "trunk");
  commitFile(root, "README.md", "base\n", "base");
  return root;
}

const SECURITY_CASES: [string[] | null, string, boolean][] = [
  [["src/payments/**"], "src/payments/fees.ts", true],
  [null, "src/Api/Authentication/Login.cs", true],
  [null, "src/authx/a.ts", false],
];

for (const [securityPaths, file, expected] of SECURITY_CASES) {
  test(`the item and range summaries mark ${file} security_path ${expected}`, (t) => {
    const root = securityRepo(t, securityPaths);
    const id = open(root, "order", "Security");
    const base = gitOut(root, "rev-parse", "HEAD");
    writeIn(root, file, "export const x = 1;\n");
    assert.equal(itemSummary(root, id, ITEM).security_path, expected, "item");
    gitIn(root, "add", "-A", "--", file);
    gitIn(root, "commit", "-q", "-m", "change");
    assert.equal(rangeSummary(root, base, gitOut(root, "rev-parse", "HEAD"), process.env).security_path, expected, "range");
  });
}

test("the review summary carries the saved mutation (T-6.5)", (t) => {
  const source = "export function same(a, b) {\n  return 0;\n}\n";
  const root = gitRepo(t, { host: true, branch: "trunk", message: "base", files: { "src/same.js": source } });
  writeConfig(root, { version: 1, commands: { test: "node -e 0" } });
  const id = open(root, "order", "Same");
  assert.equal(itemSummary(root, id, ITEM).mutation, null);
  writeIn(root, "src/same.js", "export function same(a, b) {\n  if (a === b) return 1;\n  return 0;\n}\n");
  mutate(root, id, { env: process.env, now: () => new Date() });
  assert.equal((itemSummary(root, id, ITEM).mutation as { outcome?: string } | null)?.outcome, "survived");
});
