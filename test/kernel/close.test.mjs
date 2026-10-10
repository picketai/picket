import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createWork } from "../../core/lib/work.mjs";

const BIN = resolve("core/bin/tether.mjs");
const IDENTITY = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function repoWithOpenItem() {
  const root = mkdtempSync(join(tmpdir(), "tether-close-"));
  mkdirSync(join(root, ".picket"));
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" }).trim();
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  const { id } = createWork({ lane: "order", title: "Csv export", root });
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id, git };
}

function tether(root, ...args) {
  const r = spawnSync("node", [BIN, ...args, "--root", root], { encoding: "utf8", env: { ...process.env, ...IDENTITY, CLAUDE_PROJECT_DIR: root } });
  return { code: r.status, stdout: r.stdout.trim(), json: r.stdout.trim().startsWith("{") ? JSON.parse(r.stdout) : null };
}

function stateText(root, id) {
  return readFileSync(join(root, "work", id, "state.yaml"), "utf8");
}

function stageSource(root, git) {
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n");
  git("add", "--", "src/a.ts");
}

test("close commits the closing state with the untracked review marker under chore: close <id>", () => {
  const { root, id, git } = repoWithOpenItem();
  mkdirSync(join(root, "work", id, "phases"), { recursive: true });
  writeFileSync(join(root, "work", id, "phases", "1.reviewed"), "2026-10-08T00:00:00Z\n");
  const r = tether(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("log", "-1", "--format=%s"), `chore: close ${id}`);
  const files = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(files.includes(`work/${id}/state.yaml`), files.join(", "));
  assert.ok(files.includes(`work/${id}/phases/1.reviewed`), files.join(", "));
  assert.equal(git("status", "--porcelain", "--", `work/${id}`), "");
  assert.equal(r.json.status, "done");
  assert.equal(r.json.commit, git("rev-parse", "--short", "HEAD"));
  assert.deepEqual(r.json.committed.sort(), files.filter(Boolean).sort());
  rmSync(root, { recursive: true, force: true });
});

test("close refuses a staged path outside the work item and writes nothing", () => {
  const { root, id, git } = repoWithOpenItem();
  stageSource(root, git);
  const before = git("rev-parse", "HEAD");
  const r = tether(root, "close", id);
  assert.equal(r.code, 2);
  assert.match(r.json.error, /src\/a\.ts/);
  assert.match(stateText(root, id), /status: open/);
  assert.equal(git("rev-parse", "HEAD"), before);
  rmSync(root, { recursive: true, force: true });
});

test("close --message commits the staged change and the closing state as one commit", () => {
  const { root, id, git } = repoWithOpenItem();
  stageSource(root, git);
  const before = git("rev-parse", "HEAD");
  const r = tether(root, "close", id, "--message", "fix: a");
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("rev-list", "--count", `${before}..HEAD`), "1");
  assert.equal(git("log", "-1", "--format=%s"), "fix: a");
  const files = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(files.includes("src/a.ts"), files.join(", "));
  assert.ok(files.includes(`work/${id}/state.yaml`), files.join(", "));
  rmSync(root, { recursive: true, force: true });
});

test("a second close commits nothing, and an abandoned item is refused", () => {
  const { root, id, git } = repoWithOpenItem();
  assert.equal(tether(root, "close", id).code, 0);
  const before = git("rev-parse", "HEAD");
  const again = tether(root, "close", id);
  assert.equal(again.code, 0, again.stdout);
  assert.equal(again.json.commit, null);
  assert.equal(git("rev-parse", "HEAD"), before);

  const other = createWork({ lane: "order", title: "Dropped", root });
  assert.equal(tether(root, "set", other.id, "status=abandoned").code, 0);
  const refused = tether(root, "close", other.id);
  assert.equal(refused.code, 2);
  assert.match(refused.json.error, /abandoned/);
  rmSync(root, { recursive: true, force: true });
});

test("a refused commit leaves the item done and staged, and the next close commits it", () => {
  const { root, id, git } = repoWithOpenItem();
  const hook = join(root, ".git", "hooks", "commit-msg");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  const before = git("rev-parse", "HEAD");
  const failed = tether(root, "close", id);
  assert.equal(failed.code, 2, failed.stdout);
  assert.match(failed.json.error, /git commit failed/);
  assert.match(stateText(root, id), /status: done/);
  assert.ok(git("diff", "--cached", "--name-only").split("\n").includes(`work/${id}/state.yaml`));
  assert.equal(git("rev-parse", "HEAD"), before);

  rmSync(hook);
  const retried = tether(root, "close", id);
  assert.equal(retried.code, 0, retried.stdout);
  assert.equal(git("log", "-1", "--format=%s"), `chore: close ${id}`);
  rmSync(root, { recursive: true, force: true });
});

test("outside a git repository close marks the item done and commits nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "tether-close-norepo-"));
  mkdirSync(join(root, ".picket"));
  const { id } = createWork({ lane: "order", title: "No repo", root });
  const r = tether(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.commit, null);
  assert.match(stateText(root, id), /status: done/);
  rmSync(root, { recursive: true, force: true });
});

test("with the tether root in a repo subfolder, a retry after a refused commit closes the item", () => {
  const repo = mkdtempSync(join(tmpdir(), "tether-close-sub-"));
  const root = join(repo, "sub");
  mkdirSync(join(root, ".picket"), { recursive: true });
  const git = (...args) => execFileSync("git", ["-C", repo, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" }).trim();
  git("init", "-q");
  const { id } = createWork({ lane: "order", title: "Sub root", root });
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const hook = join(repo, ".git", "hooks", "commit-msg");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  assert.equal(tether(root, "close", id).code, 2);
  rmSync(hook);
  const retried = tether(root, "close", id);
  assert.equal(retried.code, 0, retried.stdout);
  assert.equal(git("log", "-1", "--format=%s"), `chore: close ${id}`);
  assert.ok(retried.json.committed.includes(`sub/work/${id}/state.yaml`), retried.json.committed.join(", "));
  rmSync(repo, { recursive: true, force: true });
});

test("close --human prints the commit and warns about a dirty path outside work/", () => {
  const { root, id, git } = repoWithOpenItem();
  writeFileSync(join(root, "README.md"), "changed\n");
  const r = tether(root, "close", id, "--human");
  assert.equal(r.code, 0, r.stdout);
  const [line, warning] = r.stdout.split("\n");
  assert.equal(line, `${id}: closed · committed ${git("rev-parse", "--short", "HEAD")} chore: close ${id}`);
  assert.match(warning, /^WARNING: uncommitted changes: README\.md/);
  rmSync(root, { recursive: true, force: true });
});
