import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { appendVerdict } from "../../src/lib/shared/work/verdict-log.mts";
import { setMarker } from "../../src/lib/shared/work/markers.mts";
import { readState, writeState } from "../../src/lib/shared/work/state.mts";
import { writeLayout } from "../../src/lib/shared/repos.mts";
import { appendLedger } from "../../src/lib/shared/ledger.mts";
import { runCli } from "#test/cli.mts";
import { openItem, withProject } from "#test/project.mts";

const IDENTITY = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" };

function gitIn(dir) {
  return (...args) => execFileSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" }).trim();
}

function repoWithOpenItem(t, lane = "fast", title = "Csv export") {
  const root = withProject(t);
  const git = gitIn(root);
  git("init", "-q");
  writeFileSync(join(root, "README.md"), "base\n");
  const { id } = openItem(root, { lane, title });
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  return { root, id, git };
}

function picket(root, ...args) {
  const r = runCli(root, [...args, "--root", root], { env: { ...process.env, ...IDENTITY, CLAUDE_PROJECT_DIR: root } });
  const stdout = r.stdout.trim();
  return { code: r.status, stdout, json: stdout.startsWith("{") ? r.json : null };
}

function verdict(root, id, entry) {
  appendVerdict(root, id, entry, new Date());
}

function mark(root, id, n, kind) {
  setMarker(root, id, n, kind, new Date());
}

function stateText(root, id) {
  return readFileSync(join(root, "work", id, "state.yaml"), "utf8");
}

function stageSource(root, git) {
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n");
  git("add", "--", "src/a.ts");
}

function acceptRows(root) {
  const path = join(root, ".picket", "state", "ledger.jsonl");
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "accept") : [];
}

test("close of a fast item appends an accept row with the commit's product lines and no phase (T-3.3)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "a.ts"), Array.from({ length: 5 }, (_, i) => `export const a${i} = ${i};\n`).join(""));
  git("add", "--", "src/a.ts");
  const r = picket(root, "close", id, "--message", "fix: a", "--touched", "src/a.ts");
  assert.equal(r.code, 0, r.stdout);
  const rows = acceptRows(root);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].work_id, rows[0].phase, rows[0].lines_added, rows[0].commit], [id, null, 5, git("rev-parse", "--short", "HEAD")]);
});

test("close outside a git repository commits nothing and appends no accept row (T-3.3)", (t) => {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "fast", title: "No repo" });
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.commit, null);
  assert.deepEqual(acceptRows(root), []);
});

test("close commits the closing state with the untracked review marker under chore: close <title>", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  mkdirSync(join(root, "work", id, "phases"), { recursive: true });
  writeFileSync(join(root, "work", id, "phases", "1.reviewed"), "2026-10-08T00:00:00Z\n");
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "chore: close csv export");
  const files = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(files.includes(`work/${id}/state.yaml`), files.join(", "));
  assert.ok(files.includes(`work/${id}/phases/1.reviewed`), files.join(", "));
  assert.equal(git("status", "--porcelain", "--", `work/${id}`), "");
  assert.equal(r.json.status, "done");
  assert.equal(r.json.commit, git("rev-parse", "--short", "HEAD"));
  assert.deepEqual(r.json.committed.sort(), files.filter(Boolean).sort());
});

test("close writes the audit line to audit.txt, commits it, and prints it after the lane line (T-2.3, T-2.4)", (t) => {
  const { root, id } = repoWithOpenItem(t);
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  const audit = readFileSync(join(root, "work", id, "audit.txt"), "utf8");
  assert.equal(audit, `${r.json.closing.audit}\n`);
  assert.match(audit, /^fast · phases 0 · tokens none · bounces 0 · blocks 0 · wall -\n$/);
  assert.ok(r.json.committed.includes(`work/${id}/audit.txt`), r.json.committed.join(", "));
  const human = picket(root, "close", id, "--human");
  assert.equal(human.stdout.split("\n")[2], `Audit: ${audit.trimEnd()}`);
});

test("leave records a command for the user, close lists it, and a closed item refuses another", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  const left = picket(root, "leave", id, "--command", "git worktree remove .worktrees/x", "--why", "cleanup");
  assert.equal(left.code, 0, left.stdout);
  const rows = readFileSync(join(root, "work", id, "left.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(rows.map(({ command, why }) => ({ command, why })), [{ command: "git worktree remove .worktrees/x", why: "cleanup" }]);
  assert.equal(picket(root, "leave", id, "--command", "").code, 1);
  assert.equal(picket(root, "leave", id).code, 1);
  assert.equal(picket(root, "leave", id, "--command", "x".repeat(301)).code, 2);

  const closed = picket(root, "close", id, "--human");
  assert.equal(closed.code, 0, closed.stdout);
  assert.match(closed.stdout, /^Left for you: git worktree remove \.worktrees\/x \(cleanup\)$/m);
  assert.ok(git("show", "--name-only", "--format=", "HEAD").split("\n").includes(`work/${id}/left.jsonl`));
  assert.equal(picket(root, "leave", id, "--command", "git push origin v1").code, 2);
});

test("an order item titled Orders closes under chore: close orders (T-3.3)", (t) => {
  const { root, id, git } = orderAwaitingCumulativeReview(t, "Orders");
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "chore: close orders");
  assert.equal(r.json.message, "chore: close orders");
});

test("a --message keeps its capital: chore: close Orders commits as given (T-3.3)", (t) => {
  const { root, id, git } = orderAwaitingCumulativeReview(t, "Orders");
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  const r = picket(root, "close", id, "--message", "chore: close Orders");
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "chore: close Orders");
  assert.equal(r.json.message, "chore: close Orders");
});

test("a fast close commits a wrapped --message under its cleaned subject (T-3.3)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  const r = picket(root, "close", id, "--message", "`fix: a.`");
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "fix: a");
  assert.equal(r.json.message, "fix: a");
});

test("a close whose --message is not a Conventional Commits subject is refused and changes nothing (T-3.4)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  const before = git("rev-parse", "HEAD");
  const r = picket(root, "close", id, "--message", "update stuff");
  assert.equal(r.code, 2, r.stdout);
  assert.match(r.json.error, /the commit subject "update stuff" is not /);
  assert.match(r.json.error, new RegExp(`${id} stays open`));
  assert.equal(git("rev-parse", "HEAD"), before);
  assert.match(stateText(root, id), /status: open/);
});

test("close with nothing left prints no left line and returns an empty list", (t) => {
  const { root, id } = repoWithOpenItem(t);
  const closed = picket(root, "close", id, "--human");
  assert.equal(closed.code, 0, closed.stdout);
  assert.doesNotMatch(closed.stdout, /Left for you/);
});

test("close --human names the branch and every recorded worktree on the remove line (T-9.2)", (t) => {
  const { root, id } = repoWithOpenItem(t);
  writeState(root, { ...readState(root, id), branch: "RMS-12" }, new Date());
  writeLayout(root, id, {
    worktrees: null,
    repos: [
      { path: "src/Billing", base: null, worktree: "src/Billing/.worktrees/RMS-12" },
      { path: "src/Orders", base: null, worktree: "src/Orders/.worktrees/RMS-12" },
      { path: "src/Shipping", base: null },
    ],
  });
  const closed = picket(root, "close", id, "--human");
  assert.equal(closed.code, 0, closed.stdout);
  assert.match(closed.stdout, /^Left for you: \/picket:branching --remove RMS-12 \(worktrees: src\/Billing\/\.worktrees\/RMS-12, src\/Orders\/\.worktrees\/RMS-12\)$/m);
});

const changesRequired = (classes) => ({ agent: "reviewer", verdict: "CHANGES REQUIRED", phase: 1, classes });

test("close returns the repeats of the closing item's own reviews, across items or within it (T-9.4, T-1.3, T-1.6)", (t) => {
  const { root, id } = repoWithOpenItem(t);
  const other = openItem(root, { lane: "order", title: "Older item" }).id;
  verdict(root, other, changesRequired(["Ts4", "Cm1"]));
  verdict(root, other, changesRequired(["Cm1"]));
  verdict(root, id, changesRequired(["Sl1"]));
  verdict(root, id, changesRequired(["Sl1"]));
  verdict(root, id, changesRequired(["Ts4"]));
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", phase: 1, classes: ["Cm1"] });
  const closed = picket(root, "close", id);
  assert.equal(closed.code, 0, closed.stdout);
  const byClass = Object.fromEntries(closed.json.repeats.map((r) => [r.class, r.items.sort()]));
  assert.deepEqual(byClass, { Sl1: [id], Ts4: [id, other].sort() });
  const human = picket(root, "close", id, "--human").stdout;
  assert.match(human, /^Repeats: Sl1 \(/m);
  assert.match(human, /^Follow-up: Fix the Sl1 mistake class /m);
});

function projectSharingRf2(t) {
  const { root, id: alpha, git } = repoWithOpenItem(t, "fast", "Alpha");
  const beta = openItem(root, { lane: "fast", title: "Beta" }).id;
  verdict(root, alpha, changesRequired(["Rf2"]));
  verdict(root, beta, changesRequired(["Rf2"]));
  return { root, alpha, beta, git };
}

function repeatRows(root) {
  const path = join(root, ".picket", "state", "ledger.jsonl");
  return readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.event === "repeat");
}

test("two items sharing a class each report it, whichever closes first (T-1.1)", (t) => {
  const forward = projectSharingRf2(t);
  const shared = [{ class: "Rf2", items: [forward.alpha, forward.beta] }];
  assert.deepEqual(picket(forward.root, "close", forward.alpha).json.repeats, shared);
  assert.deepEqual(picket(forward.root, "close", forward.beta).json.repeats, shared);

  const backward = projectSharingRf2(t);
  const sharedBack = [{ class: "Rf2", items: [backward.alpha, backward.beta] }];
  assert.deepEqual(picket(backward.root, "close", backward.beta).json.repeats, sharedBack);
  assert.deepEqual(picket(backward.root, "close", backward.alpha).json.repeats, sharedBack);
});

test("an item without reviews reports no repeat, and a third item naming the class joins it (T-1.2)", (t) => {
  const { root, alpha, beta } = projectSharingRf2(t);
  const quiet = openItem(root, { lane: "fast", title: "Delta quiet" }).id;
  assert.deepEqual(picket(root, "close", quiet).json.repeats, []);
  const third = openItem(root, { lane: "fast", title: "Gamma" }).id;
  verdict(root, third, changesRequired(["Rf2"]));
  assert.deepEqual(picket(root, "close", third).json.repeats, [{ class: "Rf2", items: [alpha, beta, third] }]);
});

test("a repeat row another close wrote does not hide the repeat, and a re-close reports it again (T-1.4)", (t) => {
  const { root, alpha, beta } = projectSharingRf2(t);
  appendLedger(root, { event: "repeat", session: null, agent: null, work_id: beta, class: "Rf2", items: [alpha, beta] }, new Date());
  const shared = [{ class: "Rf2", items: [alpha, beta] }];
  assert.deepEqual(picket(root, "close", alpha).json.repeats, shared);
  assert.deepEqual(picket(root, "close", alpha).json.repeats, shared);
});

test("each returned repeat appends one ledger row under the closing item's id (T-1.5)", (t) => {
  const { root, alpha, beta } = projectSharingRf2(t);
  verdict(root, alpha, changesRequired(["Ts4"]));
  verdict(root, beta, changesRequired(["Ts4"]));
  const closed = picket(root, "close", alpha);
  assert.equal(closed.code, 0, closed.stdout);
  const rows = repeatRows(root).map(({ event, work_id, class: cls, items }) => ({ event, work_id, class: cls, items }));
  assert.deepEqual(rows, [
    { event: "repeat", work_id: alpha, class: "Rf2", items: [alpha, beta] },
    { event: "repeat", work_id: alpha, class: "Ts4", items: [alpha, beta] },
  ]);
});

test("close returns no repeats when no class was named twice (T-9.4)", (t) => {
  const { root, id } = repoWithOpenItem(t);
  verdict(root, id, changesRequired(["Ts4"]));
  assert.deepEqual(picket(root, "close", id).json.repeats, []);
});

test("a fast close without --touched refuses a staged path outside the work item and writes nothing (T-1.5)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  stageSource(root, git);
  const before = git("rev-parse", "HEAD");
  for (const extra of [[], ["--message", "fix: a"]]) {
    const r = picket(root, "close", id, ...extra);
    assert.equal(r.code, 2);
    assert.match(r.json.error, /src\/a\.ts/);
    assert.match(stateText(root, id), /status: open/);
    assert.equal(git("rev-parse", "HEAD"), before);
  }
});

test("close --touched commits those paths and the closing state as one commit and leaves a foreign staged path (T-1.5)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  stageSource(root, git);
  writeFileSync(join(root, "README.md"), "foreign\n");
  git("add", "--", "README.md");
  const before = git("rev-parse", "HEAD");
  const r = picket(root, "close", id, "--message", "fix: a", "--touched", "src/a.ts");
  assert.equal(r.code, 0, r.stdout);
  assert.equal(git("rev-list", "--count", `${before}..HEAD`), "1");
  assert.equal(git("log", "-1", "--format=%s"), "fix: a");
  const files = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(files.includes("src/a.ts"), files.join(", "));
  assert.ok(files.includes(`work/${id}/state.yaml`), files.join(", "));
  assert.ok(!files.includes("README.md"), files.join(", "));
  assert.deepEqual(r.json.left_staged, ["README.md"]);
  assert.equal(git("diff", "--cached", "--name-only"), "README.md");
});

test("close --human names the paths it left staged", (t) => {
  const { root, id, git } = repoWithOpenItem(t, "order");
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# Order\n\n## Phase 1: Module\n\ntext\n");
  mark(root, id, 1, "done");
  mark(root, id, 1, "approved");
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  stageSource(root, git);
  writeFileSync(join(root, "README.md"), "foreign\n");
  git("add", "--", "README.md");
  const r = picket(root, "close", id, "--human");
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /^Left staged: README\.md$/m);
  assert.ok(git("show", "--name-only", "--format=", "HEAD").split("\n").includes("src/a.ts"));
});

test("an order close commits a test file a phase block lists and leaves an unlisted staged test file", (t) => {
  const { root, id, git } = repoWithOpenItem(t, "order");
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# Order\n\n## Phase 1: Module\n\ntext\n");
  mkdirSync(join(root, "work", id, "phases"), { recursive: true });
  writeFileSync(join(root, "work", id, "phases", "1.block.md"), "## Phase 1 of x: Module\n\nDone.\n\nFiles: src/a.ts, test/a.test.ts\n\nPHASE DONE\n");
  mark(root, id, 1, "done");
  mark(root, id, 1, "approved");
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  mkdirSync(join(root, "test"));
  writeFileSync(join(root, "test", "a.test.ts"), "t\n");
  writeFileSync(join(root, "test", "foreign.test.ts"), "t\n");
  git("add", "--", "test/a.test.ts", "test/foreign.test.ts");
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  const files = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(files.includes("test/a.test.ts") && !files.includes("test/foreign.test.ts"), files.join(", "));
  assert.deepEqual(r.json.left_staged, ["test/foreign.test.ts"]);
});

test("a second close commits nothing, and an abandoned item is refused", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  assert.equal(picket(root, "close", id).code, 0);
  const before = git("rev-parse", "HEAD");
  const again = picket(root, "close", id);
  assert.equal(again.code, 0, again.stdout);
  assert.equal(again.json.commit, null);
  assert.equal(git("rev-parse", "HEAD"), before);

  const other = openItem(root, { lane: "order", title: "Dropped" });
  assert.equal(picket(root, "set", other.id, "status=abandoned").code, 0);
  const refused = picket(root, "close", other.id);
  assert.equal(refused.code, 2);
  assert.match(refused.json.error, /abandoned/);
});

test("a refused commit leaves the item done and the shared index as it was, and the next close commits it (T-1.6)", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  const hook = join(root, ".git", "hooks", "commit-msg");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  writeFileSync(join(root, "README.md"), "foreign\n");
  git("add", "--", "README.md");
  const before = git("rev-parse", "HEAD");
  const failed = picket(root, "close", id, "--touched", "README.md");
  assert.equal(failed.code, 2, failed.stdout);
  assert.match(failed.json.error, /git commit failed/);
  assert.match(stateText(root, id), /status: done/);
  assert.equal(git("diff", "--cached", "--name-only"), "README.md");
  assert.equal(git("rev-parse", "HEAD"), before);
  assert.equal(existsSync(join(root, ".git", "picket-commit.index")), false);
  git("reset", "-q", "--", "README.md");

  rmSync(hook);
  const retried = picket(root, "close", id);
  assert.equal(retried.code, 0, retried.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "chore: close csv export");
});

test("outside a git repository close marks the item done and commits nothing", (t) => {
  const root = withProject(t);
  const { id } = openItem(root, { lane: "fast", title: "No repo" });
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.json.commit, null);
  assert.match(stateText(root, id), /status: done/);
});

test("with the picket root in a repo subfolder, a retry after a refused commit closes the item", (t) => {
  const repo = withProject(t, { picket: false });
  const root = join(repo, "sub");
  mkdirSync(join(root, ".picket"), { recursive: true });
  const git = gitIn(repo);
  git("init", "-q");
  const { id } = openItem(root, { lane: "fast", title: "Sub root" });
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const hook = join(repo, ".git", "hooks", "commit-msg");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
  assert.equal(picket(root, "close", id).code, 2);
  rmSync(hook);
  const retried = picket(root, "close", id);
  assert.equal(retried.code, 0, retried.stdout);
  assert.equal(git("log", "-1", "--format=%s"), "chore: close sub root");
  assert.ok(retried.json.committed.includes(`sub/work/${id}/state.yaml`), retried.json.committed.join(", "));
});

test("close --human prints the commit and warns about a dirty path outside work/", (t) => {
  const { root, id, git } = repoWithOpenItem(t);
  writeFileSync(join(root, "README.md"), "changed\n");
  const r = picket(root, "close", id, "--human");
  assert.equal(r.code, 0, r.stdout);
  const [heading, commit, , warning] = r.stdout.split("\n");
  assert.equal(heading, `## Expedited closed: ${id}`);
  assert.equal(commit, `Commit: ${git("rev-parse", "--short", "HEAD")} chore: close csv export`);
  assert.match(warning, /^WARNING: uncommitted changes: README\.md/);
});

test("close --human on an order item gives the phase commit range up to the close commit", (t) => {
  const { root, id, git } = orderAwaitingCumulativeReview(t);
  git("add", "-A");
  git("commit", "-q", "-m", "phase 1");
  const first = git("rev-parse", "--short", "HEAD");
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  const r = picket(root, "close", id, "--human");
  assert.equal(r.code, 0, r.stdout);
  assert.equal(r.stdout.split("\n")[1], `Phases: 1 · commits ${first}..${git("rev-parse", "--short", "HEAD")} · review: APPROVED`);
});

const DEFERRING_DESIGN = [
  "---",
  "lane: design",
  "phases:",
  "  - n: 1",
  "    files: [src/mail.ts]",
  "    security: false",
  "---",
  "# Design: Order mail",
  "",
  "## Phase 1: Mail",
  "",
  "- **T-1.1** the confirmation is queued",
  "- **T-1.2** the queue retries once",
  "- **T-1.3** [DEFERRED: QA, before go-live] the mail renders in a real client",
  "",
].join("\n");

test("a design close lists each deferred criterion of its record, after the Phases line", (t) => {
  const { root, id } = repoWithOpenItem(t, "design");
  writeFileSync(join(root, "work", id, "design.md"), DEFERRING_DESIGN);
  writeState(root, { ...readState(root, id), status: "done" }, new Date());
  assert.deepEqual(picket(root, "close", id).json.closing.deferred, [{ id: "T-1.3", owner: "QA", gate: "before go-live" }]);
  const human = picket(root, "close", id, "--human");
  assert.equal(human.code, 0, human.stdout);
  assert.equal(human.stdout.split("\n")[3], "Deferred: T-1.3 QA, before go-live");
});

test("a fast close carries no deferred criteria and prints no Deferred line", (t) => {
  const { root, id } = repoWithOpenItem(t);
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.closing.deferred, []);
  assert.doesNotMatch(picket(root, "close", id, "--human").stdout, /^Deferred:/m);
});

test("a research close carries no deferred criteria even when its report quotes a marker", (t) => {
  const { root, id } = repoWithOpenItem(t, "research");
  writeFileSync(join(root, "work", id, "research.md"), "---\nkind: report\n---\n# Report\n\n- **T-1.3** [DEFERRED: QA, before go-live] quoted\n");
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.closing.deferred, []);
});

function orderAwaitingCumulativeReview(t, title) {
  const repo = repoWithOpenItem(t, "order", title);
  writeFileSync(join(repo.root, "work", repo.id, "order.md"), "---\nlane: order\n---\n# Order\n\n## Phase 1: Module\n\ntext\n");
  mark(repo.root, repo.id, 1, "done");
  mark(repo.root, repo.id, 1, "approved");
  return repo;
}

test("close refuses an order item whose cumulative review is pending and names the next action", (t) => {
  const { root, id, git } = orderAwaitingCumulativeReview(t);
  const before = git("rev-parse", "HEAD");
  const r = picket(root, "close", id);
  assert.equal(r.code, 2, r.stdout);
  assert.equal(r.json.next.action, "review_cumulative");
  assert.equal(r.json.next.actor, "reviewer");
  assert.match(stateText(root, id), /status: open/);
  assert.equal(git("rev-parse", "HEAD"), before);

  const human = picket(root, "close", id, "--human");
  assert.equal(human.code, 2);
  assert.equal(human.stdout, "refused: next is review_cumulative, not close");
});

test("close passes an order item once the cumulative review is approved", (t) => {
  const { root, id } = orderAwaitingCumulativeReview(t);
  verdict(root, id, { agent: "reviewer", verdict: "APPROVED", scope: "cumulative" });
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.match(stateText(root, id), /status: done/);
});

test("close refuses a blocked fast item and closes an open one", (t) => {
  const { root, id } = repoWithOpenItem(t);
  const open = openItem(root, { lane: "fast", title: "Open" });
  writeState(root, { ...readState(root, id), status: "blocked", blocked_reason: "tests fail on main" }, new Date());
  const refused = picket(root, "close", id);
  assert.equal(refused.code, 2, refused.stdout);
  assert.equal(refused.json.next.action, "resolve_block");
  assert.match(stateText(root, id), /status: blocked/);
  assert.equal(picket(root, "close", open.id).code, 0);
});

test("close passes a research item with its report and refuses one without it", (t) => {
  const { root, id } = repoWithOpenItem(t, "research");
  const refused = picket(root, "close", id);
  assert.equal(refused.code, 2, refused.stdout);
  assert.equal(refused.json.next.action, "write_artifact");

  writeFileSync(join(root, "work", id, "research.md"), "---\nkind: report\n---\n# Report\n");
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  assert.match(stateText(root, id), /status: done/);
});

test("close after a publish commits the work item and the published report together (T-3.4)", (t) => {
  const { root, id, git } = repoWithOpenItem(t, "research");
  writeFileSync(join(root, "work", id, "research.md"), "---\nkind: report\nconfidence: high\n---\n# Report\n");
  const published = picket(root, "route", id, "--verdict", "approved", "--agent", "user", "--publish");
  assert.equal(published.code, 0, published.stdout);
  const r = picket(root, "close", id);
  assert.equal(r.code, 0, r.stdout);
  const committed = git("show", "--name-only", "--format=", "HEAD").split("\n");
  assert.ok(committed.includes("artifacts/reports/csv-export.md"), committed.join(", "));
  assert.ok(committed.includes(`work/${id}/research.md`), committed.join(", "));
  assert.equal(git("status", "--porcelain", "--", "artifacts", "work"), "");
});
