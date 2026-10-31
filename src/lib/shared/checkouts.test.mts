import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { locate, planPathOf, recordBranch, recordNone, testRuns, ticketKey, touchedRepos, workingCheckout, worktreeDirName } from "./checkouts.mts";
import { Refused } from "./action.mts";
import { readBases, readLayout, writeLayout, type ItemLayout } from "./repos.mts";
import { readState } from "./work/state.mts";
import type { WorkId } from "./work/files.mts";
import { gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import { openItem, withProject, writeArtifact, writeConfig } from "#test/project.mts";

const WORKTREE = "src/Orders/.worktrees/RMS-12";
const RECORDED: ItemLayout = { nested: ["src/Orders", "src/Billing"], worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: WORKTREE }] };
const UNRECORDED: ItemLayout = { nested: ["src/Orders", "src/Billing"], worktrees: null, repos: [] };

const DESIGN = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [src/Orders/pricing.cs, README.md]",
  "---",
  "# Design",
  "",
  "## Phase 1: Pricing",
  "",
  "**Touch set:**",
  "- `src/Orders/pricing.cs`: why",
  "",
].join("\n");

function nestedRepo(root: string, name: string): string {
  const dir = join(root, "src", name);
  mkdirSync(dir, { recursive: true });
  gitIn(dir, "init", "-q", "-b", "main");
  writeIn(dir, "pricing.cs", `class ${name} {}\n`);
  gitIn(dir, "add", "-A");
  gitIn(dir, "commit", "-q", "-m", name);
  return dir;
}

function umbrellaItem(t: TestContext): { root: string; id: WorkId } {
  const root = gitRepo(t, { host: true, branch: "trunk", files: { "README.md": "umbrella\n" }, message: "root" });
  nestedRepo(root, "Orders");
  nestedRepo(root, "Billing");
  const { id } = openItem(root, { lane: "design", title: "Orders pricing" });
  writeArtifact(root, id, "design.md", DESIGN);
  return { root, id };
}

const itemFiles = (root: string, id: WorkId) => ["state.yaml", "repos.yaml"].map((name) => readFileSync(join(root, "work", id, name), "utf8"));

test("workingCheckout names the nested repository or worktree that holds the folder, and nothing for the root", (t) => {
  const root = gitRepo(t, { host: true, files: { "README.md": "shop\n" } });
  const app = join(root, "app");
  mkdirSync(join(app, "src"), { recursive: true });
  gitIn(app, "init", "-q", "-b", "main");
  writeIn(app, "src/orders.ts", "export const orders = [];\n");
  gitIn(app, "add", "-A");
  gitIn(app, "commit", "-q", "-m", "app");
  gitIn(app, "worktree", "add", "-q", "-b", "x", join(app, ".worktrees", "x"));
  assert.equal(workingCheckout(root, root), "");
  assert.equal(workingCheckout(root, app), "app");
  assert.equal(workingCheckout(root, join(app, "src")), "app");
  assert.equal(workingCheckout(root, join(app, ".worktrees", "x")), "app/.worktrees/x");
});

test("workingCheckout gives nothing for a repository outside the root or a folder in no repository", (t) => {
  const root = gitRepo(t, { host: true, files: { "README.md": "shop\n" } });
  const elsewhere = gitRepo(t, { host: true, files: { "README.md": "other\n" } });
  const bare = withProject(t, { host: true, picket: false });
  assert.equal(workingCheckout(root, elsewhere), "");
  assert.equal(workingCheckout(root, bare), "");
});

test("locate maps a plan path and a worktree path of a repo with a recorded worktree to that worktree (T-1.1)", () => {
  const inWorktree = { dir: WORKTREE, rel: "pricing.cs", repo: "src/Orders" };
  assert.deepEqual(locate(RECORDED, "src/Orders/pricing.cs"), inWorktree);
  assert.deepEqual(locate(RECORDED, `${WORKTREE}/pricing.cs`), inWorktree);
  assert.deepEqual(locate(RECORDED, "README.md"), { dir: "", rel: "README.md", repo: null });
});

test("locate maps a nested path with no worktree to the main checkout, and planPathOf drops a worktree folder (T-1.2)", () => {
  assert.deepEqual(locate(UNRECORDED, "src/Orders/pricing.cs"), { dir: "src/Orders", rel: "pricing.cs", repo: "src/Orders" });
  assert.equal(planPathOf(UNRECORDED, `${WORKTREE}/pricing.cs`), "src/Orders/pricing.cs");
  assert.equal(planPathOf(RECORDED, `${WORKTREE}/pricing.cs`), "src/Orders/pricing.cs");
  assert.equal(planPathOf(RECORDED, "src/Billing/fees.cs"), "src/Billing/fees.cs");
  assert.equal(planPathOf(RECORDED, "README.md"), "README.md");
});

test("touchedRepos lists, sorted and once, the repos holding any of the paths", () => {
  assert.deepEqual(touchedRepos(UNRECORDED, ["src/Orders/a.cs", "README.md", "src/Billing/b.cs", "src/Orders/c.cs"]), ["src/Billing", "src/Orders"]);
  assert.deepEqual(touchedRepos(UNRECORDED, ["src/OrdersOld/a.cs"]), []);
});

test("worktreeDirName turns slashes and spaces into dashes, and ticketKey accepts only a ticket key (T-1.3)", () => {
  assert.equal(worktreeDirName("feature/RMS 12"), "feature-RMS-12");
  assert.equal(ticketKey("RMS-12"), "RMS-12");
  assert.equal(ticketKey("story.md"), null);
  assert.equal(ticketKey(undefined), null);
});

test("recordBranch writes the branch and the start of only the repos the plan touches (T-1.4)", (t) => {
  const { root, id } = umbrellaItem(t);
  const billingBase = readBases(root, id)["src/Billing"];
  const planned = recordBranch(root, id, { name: "RMS-12" }, new Date());
  const ordersHead = gitOut(join(root, "src", "Orders"), "rev-parse", "HEAD");
  assert.deepEqual(planned, [{ repo: "src/Orders", from: "main", base: ordersHead, worktree: WORKTREE }]);
  assert.equal(readState(root, id).branch, "RMS-12");
  assert.deepEqual(readLayout(root, id).repos, [
    { path: "src/Billing", base: billingBase },
    { path: "src/Orders", base: ordersHead, from: "main" },
  ]);
  assert.deepEqual(readBases(root, id), { "src/Billing": billingBase, "src/Orders": ordersHead });
});

test("recordBranch refuses a bad name or an unknown start ref and writes nothing (T-1.5)", (t) => {
  const { root, id } = umbrellaItem(t);
  const before = itemFiles(root, id);
  assert.throws(() => recordBranch(root, id, { name: "bad..name" }, new Date()), (err) => err instanceof Refused && /"bad\.\.name" is not a valid branch name/.test(err.message));
  assert.throws(() => recordBranch(root, id, { name: "RMS-12", from: "nope" }, new Date()), (err) => err instanceof Refused && /src\/Orders has no commit at "nope"/.test(err.message));
  assert.deepEqual(itemFiles(root, id), before);
});

test("recordNone records the main checkouts, and refuses once a worktree is recorded (T-1.6)", (t) => {
  const { root, id } = umbrellaItem(t);
  recordNone(root, id);
  assert.equal(readLayout(root, id).worktrees, "none");
  recordBranch(root, id, { name: "RMS-12" }, new Date());
  assert.equal(readLayout(root, id).worktrees, null);
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: WORKTREE }] });
  assert.throws(() => recordNone(root, id), (err) => err instanceof Refused && err.message.includes(WORKTREE));
});

const TWO_PHASES = [
  "---",
  "lane: order",
  "phases:",
  "  - n: 1",
  "    files: [src/Orders/pricing.cs, README.md]",
  "  - n: 2",
  "    files: [src/Orders/pricing.cs]",
  "  - n: 3",
  "    files: []",
  "---",
  "# O",
  "",
  "## Phase 1: Both",
  "",
  "## Phase 2: Orders",
  "",
  "## Phase 3: Nothing named",
  "",
  "## Phase 4: No entry",
  "",
].join("\n");

function worktreeItem(t: TestContext): { root: string; id: WorkId } {
  const root = withProject(t, { host: true });
  const { id } = openItem(root, { lane: "order", title: "Runs" });
  writeArtifact(root, id, "order.md", TWO_PHASES);
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: WORKTREE }] });
  writeConfig(root, { version: 1, commands: { test: "dotnet test" } });
  writeConfig(join(root, WORKTREE), { version: 1, commands: { test: "node wt.js" } });
  return { root, id };
}

test("testRuns names one test command per checkout the phase touches, the umbrella when it names none", (t) => {
  const { root, id } = worktreeItem(t);
  const runs = (n: number) => testRuns(root, id, n).map(({ dir, command }) => ({ dir, command }));
  assert.deepEqual(runs(1), [
    { dir: "", command: "dotnet test" },
    { dir: WORKTREE, command: "node wt.js" },
  ]);
  assert.deepEqual(runs(2), [{ dir: WORKTREE, command: "node wt.js" }]);
  assert.deepEqual(runs(3), [{ dir: "", command: "dotnet test" }]);
  assert.throws(() => testRuns(root, id, 4), /no phases\[\] entry for n: 4/);
});

test("readLayout of an item with no repos.yaml has no repos and no worktrees choice", (t) => {
  const root = gitRepo(t, { host: true, branch: "trunk" });
  const { id } = openItem(root, { lane: "order", title: "Plain" });
  assert.deepEqual(readLayout(root, id), { nested: [], worktrees: null, repos: [] });
});
