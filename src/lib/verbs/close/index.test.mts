import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, UsageError } from "../../util/args.mts";
import type { WorkId } from "../../shared/work/files.mts";
import type { Lane } from "../../shared/work/state.mts";
import { closingBlock } from "./block.mts";
import { defaultCloseMessage, type CloseResult, type Closing } from "./close.mts";
import { checkCommitMessage } from "../../shared/commit-message.mts";
import { verb } from "./index.mts";

const ID = "20261023-x";
const parse = (argv: string[]) => verb.parse(parseArgs(argv));

const NO_FACTS: Closing = { phases: 0, commits: null, decisions: null, review: null, questions: null, deferred: [], report: null, strategic: [] };

function closed(lane: Lane, closing: Partial<Closing> = {}, rest: Partial<CloseResult> = {}): CloseResult {
  return {
    id: ID as WorkId,
    lane,
    title: "X",
    status: "done",
    created: "2026-10-29T10:00:00.000Z",
    commit: null,
    message: "chore: close X",
    committed: [],
    left_staged: [],
    warnings: [],
    dirty: [],
    left: [],
    repeats: [],
    closing: { ...NO_FACTS, ...closing },
    worktrees: [],
    ...rest,
  };
}

test("the default close message is the title after chore: close, its first letter lowercased (T-3.1)", () => {
  assert.equal(defaultCloseMessage("Orders"), "chore: close orders");
  assert.equal(defaultCloseMessage("Commit messages share one checked shape"), "chore: close commit messages share one checked shape");
  assert.equal(defaultCloseMessage("A note"), "chore: close a note");
});

test("a title whose first word is an acronym keeps it as given (T-3.1)", () => {
  for (const title of ["PR reviews read the linked ticket", "PRs read tickets", "API keys", "iOS build", "RMS-12 pricing"]) {
    assert.equal(defaultCloseMessage(title), `chore: close ${title}`);
  }
});

test("a long title is cut at its last whole word so the default stays a valid subject (T-3.2)", () => {
  const title = "Commit messages share one checked shape across every repository, today";
  assert.equal(title.length, 70);
  const message = defaultCloseMessage(title);
  assert.equal(message, "chore: close commit messages share one checked shape across every");
  assert.ok(message.length <= 72, message);
  assert.deepEqual(checkCommitMessage(message), { message });
});

test("a long title without a space is cut at 59 characters", () => {
  assert.equal(defaultCloseMessage("x".repeat(70)), `chore: close ${"x".repeat(59)}`);
});

test("close reads the message and the touched paths", () => {
  assert.deepEqual(parse([ID, "--message", "chore: done", "--touched", "a.ts,b.ts"]), { id: ID, message: "chore: done", touched: ["a.ts", "b.ts"] });
  assert.deepEqual(parse([ID]), { id: ID, message: undefined, touched: [] });
  assert.throws(() => parse([]), UsageError);
});

test("a fast close names its commit, or that nothing was committed", () => {
  assert.equal(closingBlock(closed("fast", {}, { commit: "abc1234", message: "fix: a" })), `## Expedited closed: ${ID}\nCommit: abc1234 fix: a`);
  assert.equal(closingBlock(closed("fast")), `## Expedited closed: ${ID}\nCommit: nothing to commit`);
});

test("an order close gives the phases, the commit range and the cumulative verdict", () => {
  const block = closingBlock(closed("order", { phases: 2, commits: { first: "aaa1111", last: "bbb2222" }, review: "APPROVED" }));
  assert.equal(block, `## Order closed: ${ID}\nPhases: 2 · commits aaa1111..bbb2222 · review: APPROVED`);
});

test("a design close counts its decisions and the amended ones", () => {
  const block = closingBlock(closed("design", { phases: 3, decisions: { count: 3, amended: 1 }, commits: { first: "aaa1111", last: "bbb2222" }, review: "APPROVED" }));
  assert.equal(block.split("\n")[1], "Phases: 3 · decisions: 3 (1 amended) · commits aaa1111..bbb2222 · review: APPROVED");
  assert.equal(closingBlock(closed("design", { phases: 1, decisions: { count: 2, amended: 0 } })).split("\n")[1], "Phases: 1 · decisions: 2");
});

test("a research close names the report, its findings and the ones for architect review", () => {
  const flagged = closingBlock(closed("research", { report: { findings: 2, architect_review: ["R-002"], strategic_review: [] } }));
  assert.equal(flagged, `## Research closed: ${ID}\nReport: work/${ID}/research.md · findings: 2 · architect review: R-002`);
  assert.match(closingBlock(closed("research", { report: { findings: 0, architect_review: [], strategic_review: [] } })), /architect review: no$/);
});

test("ids flagged for strategic review close the research Report line and the design Phases line", () => {
  const report = closingBlock(closed("research", { report: { findings: 2, architect_review: [], strategic_review: ["R-002"] }, strategic: ["R-002"] }));
  assert.equal(report.split("\n")[1], `Report: work/${ID}/research.md · findings: 2 · architect review: no · strategic review: R-002`);
  const design = closingBlock(closed("design", { phases: 2, decisions: { count: 2, amended: 0 }, review: "APPROVED", strategic: ["D-002"] }));
  assert.equal(design.split("\n")[1], "Phases: 2 · decisions: 2 · review: APPROVED · strategic review: D-002");
});

test("Questions shows only when the cumulative review asked some", () => {
  assert.match(closingBlock(closed("order", { phases: 1, questions: "S-4 header row" })), /^Questions: S-4 header row$/m);
  assert.doesNotMatch(closingBlock(closed("order", { phases: 1 })), /^Questions:/m);
});

test("each deferred criterion gets a Deferred line right after Questions", () => {
  const deferred = [{ id: "T-5.4", owner: "QA", gate: "before go-live" }];
  const lines = closingBlock(closed("design", { phases: 5, decisions: { count: 2, amended: 0 }, questions: "S-4 header row", deferred })).split("\n");
  assert.deepEqual(lines.slice(2), ["Questions: S-4 header row", "Deferred: T-5.4 QA, before go-live"]);
});

test("a close with no deferred criteria prints no Deferred line", () => {
  assert.doesNotMatch(closingBlock(closed("fast")), /^Deferred:/m);
  assert.doesNotMatch(closingBlock(closed("research", { report: { findings: 0, architect_review: [], strategic_review: [] } })), /^Deferred:/m);
});

test("each repeat gets a Repeats line and a Follow-up line, after what is left and the warnings", () => {
  const repeats = [
    { class: "Sl1", items: ["20261020-a", "20261021-b"] as WorkId[] },
    { class: "Ts4", items: ["20261022-c"] as WorkId[] },
  ];
  const left = [{ ts: "t", command: "git worktree remove .worktrees/x", why: "cleanup" }];
  const lines = closingBlock(closed("fast", {}, { repeats, left, left_staged: ["README.md"], warnings: ["HEAD moved"], dirty: ["src/a.ts"] })).split("\n");
  assert.deepEqual(lines.slice(2), [
    "Repeats: Sl1 (20261020-a, 20261021-b)",
    "Repeats: Ts4 (20261022-c)",
    "Left for you: git worktree remove .worktrees/x (cleanup)",
    "Left staged: README.md",
    "WARNING: HEAD moved",
    "WARNING: uncommitted changes: src/a.ts (commit them or `git checkout -- <path>`)",
    "Follow-up: Fix the Sl1 mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in 20261020-a, 20261021-b rejected.",
    "Follow-up: Fix the Ts4 mistake class at the highest level that works (type, lint rule, test, docs last); the new check must fail on the code the reviews in 20261022-c rejected.",
  ]);
});
