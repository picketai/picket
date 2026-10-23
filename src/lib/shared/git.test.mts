import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { commitOwned, dirtyPaths, head, isRepo, productLinesAdded, workingState } from "./git.mts";
import { commitIn, gitIn, gitOut, gitRepo, writeIn } from "#test/git.mts";
import { withProject } from "#test/project.mts";

function modifiedRepo(t: TestContext, rel: string): string {
  const root = withProject(t, { picket: false });
  gitIn(root, "init", "-q");
  writeIn(root, rel, "one\n");
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "init");
  writeIn(root, rel, "two\n");
  return root;
}

const numbered = (n: number) => Array.from({ length: n }, (_, i) => `line ${i}\n`).join("");

test("productLinesAdded counts a commit's added product lines and leaves bookkeeping and binaries out (T-3.1)", (t) => {
  const root = modifiedRepo(t, "src/base.txt");
  writeIn(root, "src/a.ts", numbered(12));
  writeIn(root, "work/x/order.md", numbered(30));
  writeIn(root, "artifacts/r.md", numbered(4));
  writeFileSync(join(root, "src", "logo.bin"), Buffer.from([0, 1, 2, 0, 255]));
  gitIn(root, "add", "-A", "--", "src/a.ts", "work", "artifacts", "src/logo.bin");
  gitIn(root, "commit", "-q", "-m", "add");
  const sha = head(root);
  assert.ok(sha);
  assert.equal(productLinesAdded(root, sha), 12);
  assert.equal(productLinesAdded(root, "no-such-rev"), 0);
});

test("dirtyPaths keeps the first character of a path whose status column starts with a space (T-3.1)", (t) => {
  assert.deepEqual(dirtyPaths(modifiedRepo(t, "src/a.txt")), ["src/a.txt"]);
});

test("dirtyPaths leaves a modified file under the host folder out (T-3.2)", (t) => {
  assert.deepEqual(dirtyPaths(modifiedRepo(t, ".claude/x.mjs")), []);
});

test("isRepo and head still read a trimmed answer (T-3.3)", (t) => {
  const root = modifiedRepo(t, "src/a.txt");
  assert.equal(isRepo(root), true);
  assert.match(head(root) ?? "", /^[0-9a-f]{7,}$/);
});

test("workingState reads clean, unstaged and staged trees on the current branch (T-1.7)", (t) => {
  const root = gitRepo(t);
  assert.deepEqual(workingState(root), { branch: "main", state: "clean" });
  writeIn(root, "a.txt", "two\n");
  assert.deepEqual(workingState(root), { branch: "main", state: "unstaged" });
  gitIn(root, "add", "-A");
  assert.deepEqual(workingState(root), { branch: "main", state: "staged" });
});

test("workingState reads a merge conflict (T-1.7)", (t) => {
  const root = gitRepo(t);
  gitIn(root, "checkout", "-q", "-b", "other");
  commitIn(root, "other\n", "other");
  gitIn(root, "checkout", "-q", "main");
  commitIn(root, "mine\n", "mine");
  assert.throws(() => gitIn(root, "merge", "other"));
  assert.deepEqual(workingState(root), { branch: "main", state: "conflict" });
});

test("workingState names a detached head by 7 hex characters and is null outside a repo (T-1.7)", (t) => {
  const root = gitRepo(t);
  gitIn(root, "checkout", "-q", "--detach");
  assert.match(workingState(root)?.branch ?? "", /^[0-9a-f]{7}$/);
  assert.equal(workingState(withProject(t, { picket: false })), null);
});

const IDENTITY_ENV = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function withIdentity<T>(fn: () => T): T {
  const saved = Object.fromEntries(Object.keys(IDENTITY_ENV).map((k) => [k, process.env[k]]));
  Object.assign(process.env, IDENTITY_ENV);
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const stagedNames = (root: string) => gitOut(root, "diff", "--cached", "--name-only").split("\n").filter(Boolean).sort();
const committedNames = (root: string) => gitOut(root, "show", "--name-only", "--format=", "HEAD").split("\n").filter(Boolean).sort();
const ownsSrc = (path: string) => path.startsWith("src/");

test("commitOwned commits the owned staged paths and leaves every other staged path staged (T-1.1)", (t) => {
  const root = gitRepo(t);
  writeIn(root, "src/a.js", "a\n");
  writeIn(root, "README.md", "foreign\n");
  gitIn(root, "add", "-A");
  const r = withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc, env: process.env }));
  assert.deepEqual([r.committed, r.left_staged, r.warnings], [["src/a.js"], ["README.md"], []]);
  assert.equal(r.sha, head(root));
  assert.deepEqual(committedNames(root), ["src/a.js"]);
  assert.deepEqual(stagedNames(root), ["README.md"]);
});

test("commitOwned commits the staged content, not a later working tree edit (T-1.2)", (t) => {
  const root = gitRepo(t);
  writeIn(root, "src/a.js", "A\n");
  gitIn(root, "add", "-A");
  writeIn(root, "src/a.js", "B\n");
  withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc, env: process.env }));
  assert.equal(gitOut(root, "show", "HEAD:src/a.js"), "A");
  assert.equal(readFileSync(join(root, "src", "a.js"), "utf8"), "B\n");
  assert.deepEqual(stagedNames(root), []);
  assert.equal(gitOut(root, "status", "--porcelain", "--", "src/a.js"), "M src/a.js");
});

test("commitOwned commits a staged deletion and treats a bracketed name as a literal path (T-1.3)", (t) => {
  const root = gitRepo(t);
  writeIn(root, "src/old.js", "old\n");
  writeIn(root, "src/[id]/page.tsx", "page\n");
  writeIn(root, "src/i/page.tsx", "other\n");
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "files");
  gitIn(root, "rm", "-q", "--", "src/old.js");
  writeIn(root, "src/[id]/page.tsx", "page 2\n");
  writeIn(root, "src/i/page.tsx", "other 2\n");
  gitIn(root, "add", "-A");
  const owns = (path: string) => path === "src/old.js" || path === "src/[id]/page.tsx";
  withIdentity(() => commitOwned(root, "feat: pages", { owns, env: process.env }));
  assert.deepEqual(committedNames(root), ["src/[id]/page.tsx", "src/old.js"]);
  assert.throws(() => gitOut(root, "cat-file", "-e", "HEAD:src/old.js"));
  assert.deepEqual(stagedNames(root), ["src/i/page.tsx"]);
});

test("commitOwned with nothing owned commits nothing and reports what stays staged", (t) => {
  const root = gitRepo(t);
  const before = head(root);
  writeIn(root, "README.md", "foreign\n");
  gitIn(root, "add", "-A");
  assert.deepEqual(commitOwned(root, "feat: none", { owns: ownsSrc, env: process.env }), { sha: null, committed: [], left_staged: ["README.md"], warnings: [] });
  assert.equal(head(root), before);
});

test("a failed commit leaves HEAD and the real index as they were and removes the temporary index (T-1.6)", (t) => {
  const root = gitRepo(t);
  const hook = join(root, ".git", "hooks", "commit-msg");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  const before = head(root);
  writeIn(root, "src/a.js", "a\n");
  writeIn(root, "README.md", "foreign\n");
  gitIn(root, "add", "-A");
  assert.throws(() => withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc, env: process.env })), /git commit failed/);
  assert.equal(head(root), before);
  assert.deepEqual(stagedNames(root), ["README.md", "src/a.js"]);
  assert.equal(existsSync(join(root, ".git", "picket-commit.index")), false);
});
