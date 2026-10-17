import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { dirtyPaths, head, isRepo, workingState } from "../../core/lib/git.mjs";
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
