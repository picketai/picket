import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BLOCK_FIELDS, blockField, blockFiles, COMMENT_SEPARATOR, commentProposal, detectBlock, fixesFiles, parseBlock, proposals, proposedCommit, readBlock, readHeading, saveBlock, WAIVER_SEPARATOR, waiverProposal } from "./block.mts";
import { setMarker } from "./markers.mts";
import { checkCommitMessage } from "../commit-message.mts";
import { openItem, withProject } from "#test/project.mts";

test("detectBlock names each contract heading and nothing for plain text", () => {
  assert.equal(detectBlock("## Phase 2 of a-b: Title\n\nPHASE DONE"), "phase");
  assert.equal(detectBlock("## Review: a-b\n\nAPPROVED"), "review");
  assert.equal(detectBlock("## Design: a-b"), "artifact");
  assert.equal(detectBlock("## Report: a-b"), "report");
  assert.equal(detectBlock("## Expedited: a-b"), "expedited");
  assert.equal(detectBlock("Phase 2 of a-b is done."), null);
  assert.equal(detectBlock(null), null);
});

test("detectBlock is exported only by shared/work/block.mts", () => {
  const src = resolve("src");
  const exporters = readdirSync(src, { recursive: true, encoding: "utf8" })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => /\.m[jt]s$/.test(file) && !file.includes(".test.") && /export function detectBlock\b/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(exporters, ["lib/shared/work/block.mts"]);
});

const pick = (text: string) => {
  const heading = readHeading(text);
  return heading && { kind: heading.kind, id: heading.id, phase: heading.phase, scope: heading.scope };
};

test("readHeading reads a developer heading's id and phase (T-2.1)", () => {
  assert.deepEqual(pick("## Phase 3 of 20261023-x: Title\n\nPHASE DONE"), { kind: "phase", id: "20261023-x", phase: 3, scope: null });
});

test("readHeading reads a review heading's scope and its phase (T-2.1)", () => {
  assert.deepEqual(pick("## Review: 20261023-x · phase 2\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: 2, scope: "phase" });
  assert.deepEqual(pick("## Review: 20261023-x · cumulative\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: null, scope: "cumulative" });
  assert.deepEqual(pick("## Review: 20261023-x\n\nAPPROVED"), { kind: "review", id: "20261023-x", phase: null, scope: null });
});

test("readHeading reads expedited, artifact and report headings (T-2.1)", () => {
  assert.deepEqual(pick("## Expedited: 20261023-x\n\nPHASE DONE"), { kind: "expedited", id: "20261023-x", phase: null, scope: null });
  assert.deepEqual(pick("## Amendment: 20261023-x\n\nAMENDED"), { kind: "artifact", id: "20261023-x", phase: null, scope: null });
  assert.deepEqual(pick("## Report: 20261023-x\n\nREPORT WRITTEN"), { kind: "report", id: "20261023-x", phase: null, scope: null });
});

test("readHeading takes the earliest heading in the text and gives its index (T-2.1)", () => {
  const text = "Intro\n## Review: 20261023-x · phase 2\n\n## Phase 2 of 20261023-x: T\n\nAPPROVED";
  const heading = readHeading(text);
  assert.equal(heading?.kind, "review");
  assert.equal(heading?.index, text.indexOf("## Review"));
});

const commitBlock = (commit: string) => `## Phase 1 of 20261023-x: One\n\nDone.\n\nFiles: a.ts\n${commit}\nPHASE DONE\n`;

test("proposedCommit returns the Commit line as written and is null without a Commit field", () => {
  assert.equal(proposedCommit(parseBlock(commitBlock("Commit: feat(x): y (staged; approval commits it)"))), "feat(x): y (staged; approval commits it)");
  assert.equal(proposedCommit(parseBlock(commitBlock(""))), null);
});

test("parseBlock reads a bold **Commit:** label as the Commit field (T-1.3)", () => {
  const block = parseBlock(commitBlock("**Commit:** feat(x): y"));
  assert.equal(blockField(block, "Commit"), "feat(x): y");
  assert.deepEqual(checkCommitMessage(proposedCommit(block) ?? ""), { message: "feat(x): y" });
});

const TICKET_FILES = [
  "src/lib/verbs/pullrequest/tickets.mts",
  "src/lib/verbs/pullrequest/tickets.test.mts",
  "src/lib/verbs/pullrequest/prepare.mts",
  "src/lib/verbs/pullrequest/remote.test.mts",
  "src/lib/shared/paths.mts",
  "src/lib/shared/paths.test.mts",
  "src/lib/hooks/guard/scope/index.mts",
  "src/lib/hooks/guard/scope/index.test.mts",
];

const VERIFIED = [
  "T-1.1 to T-1.4: the tests in `tickets.test.mts` pass. One extra test pins the branch rule: `SHOP-9.fix` gives a key and `SHOP-9x` gives none.",
  "T-1.5: `remote.test.mts` creates `.picket/state/pr-7/OLD-1.md`, then asserts it is gone after prepare and that `prep.tickets` is `[]`.",
  "T-1.6: in the `guard/scope/index.test.mts` test, the ticket file returns `null` and the four other paths return `deny`.",
  "T-1.7: I built a scratch folder with a bare server publishing `refs/pull/7/merge` and a clone whose remote is named after the Azure DevOps URL, then ran `picket pullrequest prepare https://tfs.corp.local/tfs/DefaultCollection/Shop/_git/Orders/pullrequest/7 --repo <clone> --human` with no PAT. It exited 0 and printed `  tickets: none found` after the meta line, and the planted `.picket/state/pr-7/OLD-1.md` was removed.",
  "T-1.8: `picket check` gives `CHECK OK` (npm test passed).",
  "`picket verify 20261103-pr-reviews-read-the-linked-ticket 1` returns ok, with every file, grep, test and drive check passing.",
];

const DECISIONS = [
  "`paths.test.mts` pins the exact export list of `paths.mts`, so I added `prTicketRel` and `isPrTicketRel` to that list. I also added a test that `prTicketRel(\"pr-412\", \"SHOP-123\")` gives `.picket/state/pr-412/SHOP-123.md`, that `isPrTicketRel` accepts it, and that it rejects a look-alike prefix.",
  "A description key must not run into more letters or digits (`/browse/SHOP-123?x=1` counts). The title rule allows leading whitespace before the optional bracket.",
  "I built the drive's git fixture with plumbing commands (`commit-tree`, and a `fetch` into the bare repo). `guard.bash` denies `push`, `reset`, `checkout` and `merge`.",
  "`src/mods/status/hooks/pane-actions.test.ts` was already staged before this phase and is not part of it. Leave it out of the phase commit.",
];

const bold = (label: string, value = "") => `**${label}:**${value ? ` ${value}` : ""}`;
const listed = (texts: string[]) => texts.map((text) => `- ${text}`);
const isNew = (path: string) => path.includes("/tickets.");

const BOLD_LIST_BLOCK = [
  "## Phase 1 of 20261103-pr-reviews-read-the-linked-ticket: Prepare lists ticket keys and their paths",
  "",
  "`picket pullrequest prepare` now lists the ticket keys it finds and the path for each ticket file. Before it lists them, it clears that PR's ticket folder. `guard.scope` lets a model write only a key-named `.md` file one level inside `.picket/state/pr-<digits>/`.",
  "",
  bold("Red", "n/a: new feature, not a bug fix or refactor"),
  "",
  bold("Root cause", "none"),
  "",
  bold("Files"),
  ...listed(TICKET_FILES.map((path) => (isNew(path) ? `${path} (new)` : path))),
  "",
  bold("Verified"),
  ...listed(VERIFIED),
  "",
  bold("Decisions"),
  ...listed(DECISIONS),
  "",
  bold("Comments", "none"),
  "",
  bold("Waivers", "none"),
  "",
  bold("Commit", "feat(pullrequest): prepare lists linked ticket keys and their paths"),
  "",
  "PHASE DONE",
  "",
].join("\n");

test("parseBlock reads every bold field of a block whose labels carry bulleted lists (T-1.1)", (t) => {
  const block = parseBlock(BOLD_LIST_BLOCK);
  assert.equal(blockField(block, "Red"), "n/a: new feature, not a bug fix or refactor");
  assert.equal(blockField(block, "Root cause"), "none");
  assert.equal(blockField(block, "Files"), TICKET_FILES.map((path) => (isNew(path) ? `${path} (new)` : path)).join("; "));
  assert.equal(blockField(block, "Verified"), VERIFIED.join("; "));
  assert.equal(blockField(block, "Decisions"), DECISIONS.join("; "));
  assert.equal(blockField(block, "Comments"), "none");
  assert.equal(blockField(block, "Waivers"), "none");
  assert.equal(blockField(block, "Commit"), "feat(pullrequest): prepare lists linked ticket keys and their paths");
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Bold" });
  saveBlock(root, id, 1, BOLD_LIST_BLOCK);
  assert.deepEqual(blockFiles(root, id, 1), TICKET_FILES);
});

test("every phase label reads the same value in its plain, bold and bulleted forms (T-1.2)", () => {
  const forms = (label: string) => [`${label}: x`, bold(label, "x"), `**${label}**: x`, `- ${label}: x`, `- ${bold(label, "x")}`];
  for (const label of BLOCK_FIELDS.phase) {
    for (const line of forms(label)) {
      const block = parseBlock(`## Phase 1 of 20261105-x: One\n\nDone.\n\n${line}\n\nPHASE DONE\n`);
      assert.equal(blockField(block, label), "x", line);
    }
  }
});

test("a list item under Verified: that looks like a label stays part of the Verified value (T-1.2)", () => {
  const block = parseBlock("## Phase 1 of 20261105-x: One\n\nDone.\n\nVerified:\n- T-1.4: x\n\n- T-1.5: y\nCommit: feat(x): y\n\nPHASE DONE\n");
  assert.equal(blockField(block, "Verified"), "T-1.4: x; T-1.5: y");
  assert.equal(blockField(block, "Commit"), "feat(x): y");
});

test("a bulleted line with an unknown label is a list item, never a field", () => {
  const block = parseBlock("## Phase 1 of 20261105-x: One\n\nDone.\n\nDecisions: kept a\n- Note: kept b\n\nPHASE DONE\n");
  assert.equal(blockField(block, "Decisions"), "kept a; Note: kept b");
  assert.equal(block.fields.note, undefined);
});

test("readHeading gives null for text without a block heading (T-2.1)", () => {
  assert.equal(readHeading("Done.\n\n## Notes\n\nnothing"), null);
  assert.equal(readHeading(""), null);
});

test("proposedCommit keeps the indented body under the Commit line, dedented, after a blank line", () => {
  const text = "## Phase 1 of 20261023-x: One\n\nDone.\n\nFiles: a.ts\nCommit: test(x): drop two tests\n\n    Dropped:\n    - \"a\": now in b.test\n      and c.test\n\nPHASE DONE\n";
  assert.equal(proposedCommit(parseBlock(text)), 'test(x): drop two tests\n\nDropped:\n- "a": now in b.test\n  and c.test');
});

test("BLOCK_FIELDS lists the labels kernel code reads from each block kind", () => {
  assert.deepEqual(BLOCK_FIELDS, {
    phase: ["Files", "Tests", "Lint", "Verified", "Red", "Root cause", "Decisions", "Comments", "Waivers", "Commit"],
    review: ["Classes"],
    artifact: ["Artifact"],
    report: ["Report"],
    expedited: ["Decisions", "Waivers"],
  });
});

test("blockField reads a listed label's value, Root cause included", () => {
  const block = parseBlock("## Phase 1 of 20261029-x: One\n\nDone.\n\nRed: n/a: docs\nRoot cause: totals were off because the rate was in percent\nPHASE DONE\n");
  assert.equal(blockField(block, "Root cause"), "totals were off because the rate was in percent");
  assert.equal(blockField(block, "Red"), "n/a: docs");
  assert.equal(blockField(block, "Tests"), undefined);
});

test("blockField throws on a label outside BLOCK_FIELDS.phase", () => {
  const block = parseBlock("## Phase 1 of 20261029-x: One\n\nDone.\n\nNope: x\nPHASE DONE\n");
  assert.throws(() => blockField(block, "Nope" as never), /"Nope" is not a phase block field/);
});

test("proposals split a Comments or Waivers line into items, and none or an empty line into nothing", () => {
  assert.deepEqual(proposals('src/a.ts:4 "half-up"; src/b.ts:9 "x; y"', COMMENT_SEPARATOR), ['src/a.ts:4 "half-up"', 'src/b.ts:9 "x; y"']);
  assert.deepEqual(proposals('src/a.ts:4 "skip" because flaky; src/b.test.ts deleted because moved', WAIVER_SEPARATOR), ['src/a.ts:4 "skip" because flaky', "src/b.test.ts deleted because moved"]);
  assert.deepEqual(proposals("none", COMMENT_SEPARATOR), []);
  assert.deepEqual(proposals(undefined, WAIVER_SEPARATOR), []);
});

test("commentProposal reads path, line and text, and null for any other shape", () => {
  assert.deepEqual(commentProposal('src/a.ts:4 "half-up: the tariff"'), { path: "src/a.ts", line: 4, text: "half-up: the tariff" });
  assert.equal(commentProposal("src/a.ts half-up"), null);
});

test("waiverProposal reads a line waiver and a deleted-test waiver, and null for any other shape", () => {
  assert.deepEqual(waiverProposal('src/a.test.ts:12 "it.skip(x)" because flaky upstream'), { path: "src/a.test.ts", text: "it.skip(x)", deleted: false });
  assert.deepEqual(waiverProposal("src/b.test.ts deleted because moved to c.test.ts"), { path: "src/b.test.ts", text: null, deleted: true });
  assert.equal(waiverProposal('src/a.ts:4 "skip"'), null);
});

test("fixesFiles returns the Files paths of every N.fixes.md entry in order (T-3.3)", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Fixes" });
  const entry = (files: string) => `## Phase 2 of x: Two\n\nFix.\n\nFiles: ${files}\n\nPHASE DONE`;
  saveBlock(root, id, 2, entry("src/original.ts"));
  setMarker(root, id, 2, "approved", new Date());
  saveBlock(root, id, 2, entry("src/a.ts, src/b.ts"));
  saveBlock(root, id, 2, entry("src/c.ts"));
  assert.deepEqual(fixesFiles(root, id, 2), ["src/a.ts", "src/b.ts", "src/c.ts"]);
  assert.deepEqual(fixesFiles(root, id, 1), []);
});

test("saveBlock keeps an approved phase's block and appends a later block to N.fixes.md", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Fix" });
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nOriginal.\n\nPHASE DONE");
  setMarker(root, id, 2, "approved", new Date());
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nFirst fix.\n\nPHASE DONE");
  saveBlock(root, id, 2, "## Phase 2 of x: Two\n\nSecond fix.\n\nPHASE DONE");
  assert.match(readBlock(root, id, 2) ?? "", /Original\./);
  const fixes = readFileSync(join(root, "work", id, "phases", "2.fixes.md"), "utf8");
  assert.ok(fixes.indexOf("First fix.") < fixes.indexOf("Second fix."), fixes);
});
