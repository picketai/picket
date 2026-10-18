import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { commitOwned, dirtyPaths, head, isRepo, isTestPath, productLinesAdded, workingState } from "../../core/lib/git.mjs";
import { liveProbe } from "../../core/lib/statusline.mjs";

function gitIn(root, ...args) {
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { stdio: "ignore" });
}

function writeIn(root, rel, text) {
  const path = join(root, ...rel.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function withModifiedRepo(rel, fn) {
  const root = mkdtempSync(join(tmpdir(), "harness-git-"));
  try {
    gitIn(root, "init", "-q");
    writeIn(root, rel, "one\n");
    gitIn(root, "add", "-A");
    gitIn(root, "commit", "-q", "-m", "init");
    writeIn(root, rel, "two\n");
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const numbered = (n) => Array.from({ length: n }, (_, i) => `line ${i}\n`).join("");

test("productLinesAdded counts a commit's added product lines and leaves bookkeeping and binaries out (T-3.1)", () => {
  withModifiedRepo("src/base.txt", (root) => {
    writeIn(root, "src/a.ts", numbered(12));
    writeIn(root, "work/x/order.md", numbered(30));
    writeIn(root, "artifacts/r.md", numbered(4));
    writeFileSync(join(root, "src", "logo.bin"), Buffer.from([0, 1, 2, 0, 255]));
    gitIn(root, "add", "-A", "--", "src/a.ts", "work", "artifacts", "src/logo.bin");
    gitIn(root, "commit", "-q", "-m", "add");
    assert.equal(productLinesAdded(root, head(root)), 12);
    assert.equal(productLinesAdded(root, "no-such-rev"), 0);
  });
});

test("dirtyPaths keeps the first character of a path whose status column starts with a space (T-3.1)", () => {
  withModifiedRepo("src/a.txt", (root) => assert.deepEqual(dirtyPaths(root), ["src/a.txt"]));
});

test("dirtyPaths leaves a modified file under the host folder out (T-3.2)", () => {
  withModifiedRepo(".claude/x.mjs", (root) => assert.deepEqual(dirtyPaths(root), []));
});

test("isRepo and head still read a trimmed answer (T-3.3)", () => {
  withModifiedRepo("src/a.txt", (root) => {
    assert.equal(isRepo(root), true);
    assert.match(head(root), /^[0-9a-f]{7,}$/);
  });
});

function withTempDir(prefix, fn) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function commitIn(root, text, message) {
  writeIn(root, "a.txt", text);
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", message);
}

function withCommittedRepo(fn) {
  withTempDir("picket-state-", (root) => {
    gitIn(root, "init", "-q", "-b", "main");
    commitIn(root, "one\n", "init");
    fn(root);
  });
}

test("workingState reads clean, unstaged and staged trees on the current branch (T-1.7)", () => {
  withCommittedRepo((root) => {
    assert.deepEqual(workingState(root), { branch: "main", state: "clean" });
    writeIn(root, "a.txt", "two\n");
    assert.deepEqual(workingState(root), { branch: "main", state: "unstaged" });
    gitIn(root, "add", "-A");
    assert.deepEqual(workingState(root), { branch: "main", state: "staged" });
  });
});

test("workingState reads a merge conflict (T-1.7)", () => {
  withCommittedRepo((root) => {
    gitIn(root, "checkout", "-q", "-b", "other");
    commitIn(root, "other\n", "other");
    gitIn(root, "checkout", "-q", "main");
    commitIn(root, "mine\n", "mine");
    assert.throws(() => gitIn(root, "merge", "other"));
    assert.deepEqual(workingState(root), { branch: "main", state: "conflict" });
  });
});

test("workingState names a detached head by 7 hex characters and is null outside a repo (T-1.7)", () => {
  withCommittedRepo((root) => {
    gitIn(root, "checkout", "-q", "--detach");
    assert.match(workingState(root).branch, /^[0-9a-f]{7}$/);
  });
  withTempDir("picket-norepo-", (root) => assert.equal(workingState(root), null));
});

test("isTestPath knows test folders and test file names across languages (T-1.7)", () => {
  for (const path of ["test/kernel/cost.test.mjs", "src/Fee.Tests/RoundingTests.cs", "pkg/fee_test.go", "app/__tests__/a.js", "lib/test_fee.py", "src/a.spec.ts"]) {
    assert.equal(isTestPath(path), true, path);
  }
  for (const path of ["src/latest.mjs", "docs/testing.md", "src/contest.js", "src/Tests.md"]) {
    assert.equal(isTestPath(path), false, path);
  }
});

const IDENTITY_ENV = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function withIdentity(fn) {
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

function gitOut(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

const stagedNames = (root) => gitOut(root, "diff", "--cached", "--name-only").split("\n").filter(Boolean).sort();
const committedNames = (root) => gitOut(root, "show", "--name-only", "--format=", "HEAD").split("\n").filter(Boolean).sort();
const ownsSrc = (path) => path.startsWith("src/");

test("commitOwned commits the owned staged paths and leaves every other staged path staged (T-1.1)", () => {
  withCommittedRepo((root) => {
    writeIn(root, "src/a.js", "a\n");
    writeIn(root, "README.md", "foreign\n");
    gitIn(root, "add", "-A");
    const r = withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc }));
    assert.deepEqual([r.committed, r.left_staged, r.warnings], [["src/a.js"], ["README.md"], []]);
    assert.equal(r.sha, head(root));
    assert.deepEqual(committedNames(root), ["src/a.js"]);
    assert.deepEqual(stagedNames(root), ["README.md"]);
  });
});

test("commitOwned commits the staged content, not a later working tree edit (T-1.2)", () => {
  withCommittedRepo((root) => {
    writeIn(root, "src/a.js", "A\n");
    gitIn(root, "add", "-A");
    writeIn(root, "src/a.js", "B\n");
    withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc }));
    assert.equal(gitOut(root, "show", "HEAD:src/a.js"), "A");
    assert.equal(readFileSync(join(root, "src", "a.js"), "utf8"), "B\n");
    assert.deepEqual(stagedNames(root), []);
    assert.equal(gitOut(root, "status", "--porcelain", "--", "src/a.js"), "M src/a.js");
  });
});

test("commitOwned commits a staged deletion and treats a bracketed name as a literal path (T-1.3)", () => {
  withCommittedRepo((root) => {
    writeIn(root, "src/old.js", "old\n");
    writeIn(root, "src/[id]/page.tsx", "page\n");
    writeIn(root, "src/i/page.tsx", "other\n");
    gitIn(root, "add", "-A");
    gitIn(root, "commit", "-q", "-m", "files");
    gitIn(root, "rm", "-q", "--", "src/old.js");
    writeIn(root, "src/[id]/page.tsx", "page 2\n");
    writeIn(root, "src/i/page.tsx", "other 2\n");
    gitIn(root, "add", "-A");
    const owns = (path) => path === "src/old.js" || path === "src/[id]/page.tsx";
    withIdentity(() => commitOwned(root, "feat: pages", { owns }));
    assert.deepEqual(committedNames(root), ["src/[id]/page.tsx", "src/old.js"]);
    assert.throws(() => gitOut(root, "cat-file", "-e", "HEAD:src/old.js"));
    assert.deepEqual(stagedNames(root), ["src/i/page.tsx"]);
  });
});

test("commitOwned with nothing owned commits nothing and reports what stays staged", () => {
  withCommittedRepo((root) => {
    const before = head(root);
    writeIn(root, "README.md", "foreign\n");
    gitIn(root, "add", "-A");
    assert.deepEqual(commitOwned(root, "feat: none", { owns: ownsSrc }), { sha: null, committed: [], left_staged: ["README.md"], warnings: [] });
    assert.equal(head(root), before);
  });
});

test("a failed commit leaves HEAD and the real index as they were and removes the temporary index (T-1.6)", () => {
  withCommittedRepo((root) => {
    const hook = join(root, ".git", "hooks", "commit-msg");
    writeFileSync(hook, "#!/bin/sh\nexit 1\n");
    chmodSync(hook, 0o755);
    const before = head(root);
    writeIn(root, "src/a.js", "a\n");
    writeIn(root, "README.md", "foreign\n");
    gitIn(root, "add", "-A");
    assert.throws(() => withIdentity(() => commitOwned(root, "feat: a", { owns: ownsSrc })), /git commit failed/);
    assert.equal(head(root), before);
    assert.deepEqual(stagedNames(root), ["README.md", "src/a.js"]);
    assert.equal(existsSync(join(root, ".git", "picket-commit.index")), false);
  });
});

test("liveProbe reuses git state for 5 seconds and the skill while the transcript size holds (T-1.7)", () => {
  withTempDir("picket-probe-", (root) => {
    const cacheDir = join(root, "cache");
    const transcript = join(root, "transcript.jsonl");
    writeFileSync(transcript, "{}\n");
    const calls = { git: 0, skill: 0 };
    const probeAt = (now) =>
      liveProbe({
        cacheDir,
        now,
        readGit: () => {
          calls.git++;
          return { branch: "main", state: "clean" };
        },
        readSkill: () => {
          calls.skill++;
          return "picket:ordering";
        },
      });
    const start = Date.UTC(2026, 9, 17, 12, 0, 0);
    assert.deepEqual(probeAt(start).git(root), { branch: "main", state: "clean" });
    assert.deepEqual(probeAt(start + 4_000).git(root), { branch: "main", state: "clean" });
    assert.equal(calls.git, 1);
    probeAt(start + 6_000).git(root);
    assert.equal(calls.git, 2);
    assert.equal(probeAt(start).skill(transcript), "picket:ordering");
    assert.equal(probeAt(start + 60_000).skill(transcript), "picket:ordering");
    assert.equal(calls.skill, 1);
    appendFileSync(transcript, "{}\n");
    probeAt(start + 61_000).skill(transcript);
    assert.equal(calls.skill, 2);
  });
});
