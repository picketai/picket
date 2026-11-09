import { test } from "node:test";
import assert from "node:assert/strict";
import fs, { writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, join } from "node:path";
import { cut, packet, WIDTH } from "../../dist/lib/verbs/packet/packet.mjs";
import { blockFiles, parseBlock, saveBlock } from "../../dist/lib/shared/work/block.mjs";
import { setMarker } from "../../dist/lib/shared/work/markers.mjs";
import { appendCheckRow } from "../../dist/lib/shared/check-log.mjs";
import { writeLayout } from "../../dist/lib/shared/repos.mjs";
import { openItem, withProject, writeConfig } from "#test/project.mts";
import { gitOut, umbrella } from "#test/git.mts";

// The block the user's screenshot came from, in the developer's contract shape.
const BLOCK = `## Phase 1 of X: Stop the sync write

The nightly stock sync can no longer write STOCK.RESERVED_QTY on either cycle: the column left the evaluator, the diff record and the applier, so no diff the sync can produce reaches Product.ReservedQty.

Files: StockSyncColumnEvaluator.cs, StockSyncColumnChanges.cs, RunStockSyncCommandHandler.cs, IProductRepository.cs (+6 more)
Tests: passed (374/374 Shop.Inventory.Tests)
Lint: none detected
Verified: no drivable surface (background sync worker, no HTTP or CLI entry point); behaviour driven through HandleAsync against a real EF InMemory ShopDbContext
Decisions: followed the Changes paragraph over T-1.1's grep list where they contradict (a third ReservedQty hit at RunStockSyncCommandHandler.cs:422, removed by Phase 2); re-seeded three LowStock tests that computed expected units from the deleted write; turned the applier commit-boundary test into a regression guard
Commit: fix(sync): stop the reserved quantity write

PHASE DONE`;

const phaseDone = (root, id) => setMarker(root, id, 1, "done", new Date());

function setup(t) {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "order", title: "Stop sync write" });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: Stop the write\n\nt\n\n## Phase 2: Remove the column\n\nt\n");
  return { root, id: s.id };
}

test("parseBlock reads the developer block into fields", () => {
  const b = parseBlock(BLOCK);
  assert.equal(b.title, "Phase 1 of X: Stop the sync write");
  assert.match(b.headline, /^The nightly stock sync can no longer write/);
  assert.equal(b.fields.tests, "passed (374/374 Shop.Inventory.Tests)");
  assert.equal(b.fields.commit, "fix(sync): stop the reserved quantity write");
  assert.equal(b.verdict, "PHASE DONE");
});

test("blockFiles reads dot-files with or without folders and skips words without a dot (B11, T-3.3)", (t) => {
  const { root, id } = setup(t);
  saveBlock(root, id, 1, BLOCK.replace(/^Files: .*$/m, "Files: .gitattributes, src/.npmrc, src/a.mjs (phase 1)"));
  assert.deepEqual(blockFiles(root, id, 1), [".gitattributes", "src/.npmrc", "src/a.mjs"]);
});

test("the gate packet is fixed-shape, width-capped, and ends with the options", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, BLOCK);
  const { lines, text } = packet(id, root);
  assert.equal(lines[0], `▶ phase 1/2 done · ${id}`);
  assert.equal(lines[1], "  The nightly stock sync can no longer write STOCK.RESERVED_QTY on either cycle…", "the claim survives, the explanation after the colon goes");
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
  assert.match(text, /^  tests {5}passed \(374\/374 Shop\.Inventory\.Tests\)$/m);
  assert.match(text, /^  files {5}StockSyncColumnEvaluator\.cs, StockSyncColumnChanges\.cs, \+8 more$/m, "whole paths only, the rest counted");
  assert.equal(lines.filter((l) => /^ {12}· /.test(l) || /^  decisions/.test(l)).length, 3, "three decisions, one per line");
  assert.match(text, /^  commit {4}fix\(sync\): stop the reserved quantity write$/m);
  assert.equal(lines.at(-1), "[a] approve   [r] run through 2   [x] reject: <why>");
  assert.equal(lines.at(-2), "");
});

test("the commit line shows the checked message, or why the block's message cannot be committed", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  const commitRow = (commit) => {
    saveBlock(root, id, 1, BLOCK.replace(/^Commit: .*$/m, commit));
    return packet(id, root).lines.find((l) => l.startsWith("  commit"));
  };
  assert.equal(commitRow("Commit: `fix: a.` (staged; approval commits it)"), "  commit    fix: a");
  assert.match(commitRow("Commit: 3f9c2a1"), /^  commit {4}not committable: the commit subject "3f9c2a1" is not /);
  assert.match(commitRow("Commit: update stuff"), /^  commit {4}not committable: /);
  assert.match(commitRow(""), /^  commit {4}not committable: the block has no "Commit:" line/);
  assert.doesNotMatch(packet(id, root).text, /\(staged/);
});

test("the create_worktrees packet lists every touched repo with its start, an 8-character base and its worktree (T-6.5)", (t) => {
  const { root, repos } = umbrella(t, { repos: ["Billing", "Orders"] });
  const { id } = openItem(root, { lane: "order", title: "Prices", source: "RMS-12" });
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/Orders/pricing.cs, src/Billing/pricing.cs]\n---\n# O\n\n## Phase 1: Prices\n\nt\n");
  const { lines } = packet(id, root);
  const base = (dir) => gitOut(dir, "rev-parse", "HEAD").slice(0, 8);
  assert.deepEqual(lines, [
    `▶ worktrees before phase 1 · ${id}`,
    "  the plan touches src/Billing, src/Orders; name the branch for their worktrees before phase 1",
    "",
    `  src/Billing from main @${base(repos.Billing)} -> src/Billing/.worktrees/RMS-12`,
    `  src/Orders from main @${base(repos.Orders)} -> src/Orders/.worktrees/RMS-12`,
    "",
    "[y] create RMS-12   reply: <name> [from <ref>]   [n] use the main checkouts",
  ]);
});

function nestedOrdersItem(t, subject = "fix(pricing): a") {
  const root = withProject(t, { host: true, picket: false });
  const { id } = openItem(root, { lane: "order", title: "Orders" });
  writeFileSync(join(root, "work", id, "order.md"), "---\nlane: order\nphases:\n  - n: 1\n    files: [src/Orders/pricing.cs]\n  - n: 2\n    files: [README.md]\n---\n# O\n\n## Phase 1: Pricing\n\nt\n\n## Phase 2: Readme\n\nt\n");
  writeLayout(root, id, { worktrees: null, repos: [{ path: "src/Orders", base: null, worktree: "src/Orders/.worktrees/RMS-12" }] });
  const block = (n) => `## Phase ${n} of ${id}: P\n\nDone.\n\nFiles: ${n === 1 ? "src/Orders/pricing.cs" : "README.md"}\nCommit: ${subject}\n\n    Rate comes from the tariff.\n    - one line per tier\n\nPHASE DONE`;
  phaseDone(root, id);
  saveBlock(root, id, 1, block(1));
  const toPhaseTwo = () => {
    setMarker(root, id, 1, "approved", new Date());
    setMarker(root, id, 2, "done", new Date());
    saveBlock(root, id, 2, block(2));
  };
  return { root, id, toPhaseTwo };
}

const commitRows = (lines) => lines.slice(lines.findIndex((l) => l.startsWith("  commit")), lines.indexOf("", 3));

const SUBJECT_AT_72 = `fix(pricing): ${"a".repeat(58)}`;

test("the commit lines name each repo the approval commits in, its subject below it, then the body; one repo shows the subject alone (T-2.1, T-2.4)", (t) => {
  const { root, id, toPhaseTwo } = nestedOrdersItem(t);
  assert.deepEqual(commitRows(packet(id, root).lines), [
    "  commit    src/Orders/.worktrees/RMS-12",
    "              fix(pricing): a",
    "            main repo",
    "              fix(pricing): a",
    "            Rate comes from the tariff.",
    "            - one line per tier",
  ]);

  toPhaseTwo();
  assert.deepEqual(commitRows(packet(id, root).lines), ["  commit    fix(pricing): a", "            Rate comes from the tariff.", "            - one line per tier"]);
});

test("a 72-character subject shows whole under each repo (T-2.2)", (t) => {
  assert.equal([...SUBJECT_AT_72].length, 72);
  const { root, id } = nestedOrdersItem(t, SUBJECT_AT_72);
  const lines = packet(id, root).lines;
  assert.equal(lines.filter((l) => l === `${" ".repeat(14)}${SUBJECT_AT_72}`).length, 2);
});

test("one repo's 72-character subject shows whole on the commit line, even past a narrow width (T-2.3)", (t) => {
  const { root, id, toPhaseTwo } = nestedOrdersItem(t, SUBJECT_AT_72);
  toPhaseTwo();
  assert.ok(packet(id, root, { width: 60 }).lines.includes(`  commit    ${SUBJECT_AT_72}`));
});

test("a Files: line of twelve paths shows whole paths up to the width, then +k more (T-1.3)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  const paths = Array.from({ length: 12 }, (_, i) => `src/module-${i}/handler-${i}.ts`);
  saveBlock(root, id, 1, BLOCK.replace(/^Files: .*$/m, `Files: ${paths.join(", ")}`));
  const row = packet(id, root).lines.find((l) => l.startsWith("  files"));
  const shown = row.slice("  files     ".length).replace(/, \+\d+ more$/, "").split(", ");
  const more = Number(row.match(/\+(\d+) more$/)?.[1]);
  assert.ok(row.length <= WIDTH, row);
  assert.deepEqual(shown, paths.slice(0, shown.length), "whole paths, in order");
  assert.equal(shown.length + more, 12);
});

function gatedSetup(t, { entry, touchSet = "", config }) {
  const root = withProject(t, { host: true, picket: false });
  if (config) writeConfig(root, config);
  const s = openItem(root, { lane: "design", title: "Gated" });
  writeFileSync(
    join(root, "work", s.id, "design.md"),
    `---\nlane: design\nphases:\n  - n: 1\n${entry}  - n: 2\n    files: [lib/b.mjs]\n    security: false\n---\n# D\n\n## Phase 1: Gated\n\n${touchSet}t\n\n## Phase 2: Next\n\nt\n`,
  );
  phaseDone(root, s.id);
  saveBlock(root, s.id, 1, BLOCK);
  return { root, id: s.id };
}

test("a phase with its own gate shows a gate line directly after files", (t) => {
  const { root, id } = gatedSetup(t, { entry: "    files: [lib/a.mjs]\n    security: true\n" });
  const { lines } = packet(id, root);
  const files = lines.findIndex((l) => l.startsWith("  files"));
  assert.equal(lines[files + 1], "  gate      phase 1 is marked security-sensitive in the record; run grants stop here");
});

test("a gate line naming a long touch-set path stays within the width", (t) => {
  const longPath = `lib/secure/${"x".repeat(105)}.mjs`;
  assert.equal(longPath.length, 120);
  const { root, id } = gatedSetup(t, {
    entry: "    files: [lib/a.mjs]\n    security: false\n",
    touchSet: `**Touch set:**\n- \`${longPath}\`: why\n\n`,
    config: { security_paths: ["lib/secure/"] },
  });
  const { lines } = packet(id, root);
  assert.ok(lines.some((l) => l.startsWith("  gate      phase 1 touches a security path")));
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
});

test("an irreversible phase's packet names the step, drops the gate line and offers confirm or reject", (t) => {
  const { root, id } = gatedSetup(t, { entry: "    files: [lib/a.mjs]\n    security: false\n", touchSet: "Drops the old table. [IRREVERSIBLE]\n\n" });
  const { lines } = packet(id, root);
  const files = lines.findIndex((l) => l.startsWith("  files"));
  assert.equal(lines[files + 1], "  irreversible: phase 1 carries an irreversible step");
  assert.equal(lines.some((l) => l.startsWith("  gate")), false);
  assert.equal(lines.at(-1), "[i] confirm the irreversible step   [x] reject: <why>");
});

test("an irreversible phase on a security path keeps its gate line beside the irreversible line", (t) => {
  const { root, id } = gatedSetup(t, { entry: "    files: [lib/a.mjs]\n    security: true\n", touchSet: "[IRREVERSIBLE]\n\n" });
  const { lines } = packet(id, root);
  assert.ok(lines.includes("  irreversible: phase 1 carries an irreversible step"));
  assert.ok(lines.includes("  gate      phase 1 is marked security-sensitive in the record; run grants stop here"));
});

test("a mark inside code gives no irreversible line", (t) => {
  const { root, id } = gatedSetup(t, { entry: "    files: [lib/a.mjs]\n    security: false\n", touchSet: "Mentions `[IRREVERSIBLE]` only.\n\n" });
  const { lines } = packet(id, root);
  assert.equal(lines.some((l) => l.includes("irreversible")), false);
  assert.equal(lines.at(-1), "[a] approve   [r] run through 2   [x] reject: <why>");
});

test("an ungated phase's packet has no gate line", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, BLOCK);
  assert.equal(packet(id, root).lines.some((l) => l.startsWith("  gate")), false);
});

const beforeCommit = (lines) => BLOCK.replace(/^Commit: /m, `${lines}\nCommit: `);
const withComments = (value) => beforeCommit(`Comments: ${value}`);

test("comment proposals render numbered and add the keep option (T-3.1)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, withComments('src/fee.ts:42 "half-up: the tariff table is published that way"'));
  const { lines } = packet(id, root);
  assert.ok(lines.includes('  comments  1 src/fee.ts:42 "half-up: the tariff table is published that way"'));
  assert.match(lines.at(-1), /\[k\] keep comment <n>$/);

  saveBlock(root, id, 1, withComments("none"));
  const plain = packet(id, root);
  assert.equal(plain.lines.some((l) => /^ {2}comments/.test(l)), false);
  assert.doesNotMatch(plain.text, /keep comment/);
});

test("four proposals stay within the width and the fourth is counted (T-3.2)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  const long = "x".repeat(120);
  const four = [1, 2, 3, 4].map((n) => `src/f${n}.ts:${n} "why ${n}; ${long}"`).join("; ");
  saveBlock(root, id, 1, withComments(four));
  const { lines } = packet(id, root);
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
  assert.match(lines.find((l) => /^ {2}comments/.test(l)), /^ {2}comments {2}1 src\/f1\.ts:1 "why 1; x+…$/);
  assert.equal(lines.filter((l) => /^ {12}[23] src\/f[23]\.ts/.test(l)).length, 2);
  assert.ok(lines.includes(`  ${"".padEnd(10)}+1 more in the phase block`));
});

const withProof = (red, cause) => beforeCommit(`Red: ${red}\nRoot cause: ${cause}`);

test("parseBlock reads a two-word label, and the packet shows red always and cause only when not none (T-4.3)", (t) => {
  const block = withProof("test/fee.test.ts failed: expected 1.05, got 1.04", "totals were off because the rate was read in percent");
  assert.equal(parseBlock(block).fields["root cause"], "totals were off because the rate was read in percent");
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, block);
  const { lines } = packet(id, root);
  const verified = lines.findIndex((l) => l.startsWith("  verified"));
  assert.equal(lines[verified + 1], "  red       test/fee.test.ts failed: expected 1.05, got 1.04");
  assert.equal(lines[verified + 2], "  cause     totals were off because the rate was read in percent");

  const twoWordHeadline = parseBlock(BLOCK.replace(/^The nightly stock sync.*$/m, "Guard added: it denies skips."));
  assert.equal(twoWordHeadline.headline, "Guard added: it denies skips.", "only Root cause is a two-word label");
  assert.equal(twoWordHeadline.fields["guard added"], undefined);

  saveBlock(root, id, 1, withProof("n/a: docs only", "none"));
  const plain = packet(id, root).lines;
  assert.ok(plain.includes("  red       n/a: docs only"));
  assert.equal(plain.some((l) => l.startsWith("  cause")), false);
});

const withWaivers = (value) => beforeCommit(`Waivers: ${value}`);

test("waiver proposals render numbered and end the options with the waive option (T-1.6)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  const two = 'test/fee.test.ts:12 "it.skip(\'rounds\')" because the rate table ships next week; src/a.ts:3 "// eslint-disable-line" because x; y';
  saveBlock(root, id, 1, withWaivers(two));
  const { lines } = packet(id, root);
  assert.ok(lines.includes(`  waivers   1 test/fee.test.ts:12 "it.skip('rounds')" because the rate table ships next week`));
  assert.ok(lines.includes(`  ${"".padEnd(10)}2 src/a.ts:3 "// eslint-disable-line" because x; y`), "a semicolon inside a why stays in its proposal");
  assert.match(lines.at(-1), /\[w\] waive <n>$/);

  saveBlock(root, id, 1, withComments('src/fee.ts:42 "half-up"').replace("Commit:", `Waivers: ${two}\nCommit:`));
  assert.match(packet(id, root).lines.at(-1), /\[k\] keep comment <n> {3}\[w\] waive <n>$/);

  saveBlock(root, id, 1, withWaivers("none"));
  const plain = packet(id, root);
  assert.equal(plain.lines.some((l) => /^ {2}waivers/.test(l)), false);
  assert.doesNotMatch(plain.text, /waive/);
});

test("a missing block degrades to 'not reported', a blocked item shows the reason", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  const p = packet(id, root);
  assert.match(p.text, /tests {5}not reported/);
  assert.match(p.lines[1], /Stop the write/);
});

const withoutCheckLines = BLOCK.replace(/^Tests: .*\n/m, "").replace(/^Lint: .*\n/m, "");
const loggedCheck = (id, phase, steps) => ({ ts: "2026-11-09T12:00:00.000Z", session: "s1", work_id: id, phase, checkout: "", ok: true, steps });
const PASSED_AND_NO_LINT = [{ name: "test", status: "passed" }, { name: "lint", status: "none detected" }];

test("a block without Tests: and Lint: shows the logged picket check of that phase (T-4.4)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, withoutCheckLines);
  appendCheckRow(root, loggedCheck(id, 1, PASSED_AND_NO_LINT));
  const { text } = packet(id, root);
  assert.match(text, /^  tests {5}passed \(picket check\)$/m);
  assert.match(text, /^  lint {6}none detected \(picket check\)$/m);
});

test("the block's own Tests: and Lint: win over a logged check, and a check of another phase is not shown (T-4.5)", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  appendCheckRow(root, loggedCheck(id, 1, [{ name: "test", status: "failed" }]));
  saveBlock(root, id, 1, BLOCK);
  const own = packet(id, root).text;
  assert.match(own, /^  tests {5}passed \(374\/374 Shop\.Inventory\.Tests\)$/m);
  assert.match(own, /^  lint {6}none detected$/m);
  const { root: other, id: otherId } = setup(t);
  phaseDone(other, otherId);
  saveBlock(other, otherId, 1, withoutCheckLines);
  appendCheckRow(other, loggedCheck(otherId, 2, PASSED_AND_NO_LINT));
  const unlogged = packet(otherId, other).text;
  assert.match(unlogged, /^  tests {5}not reported$/m);
  assert.match(unlogged, /^  lint {6}not reported$/m);
});

test("a research packet points at work/<id>/research.md", (t) => {
  const root = withProject(t, { host: true, picket: false });
  const s = openItem(root, { lane: "research", title: "How pricing works" });
  writeFileSync(join(root, "work", s.id, "research.md"), "---\nkind: report\n---\n# Report\n\n## Summary\n\nPricing is computed per invoice line.\n");
  const { text } = packet(s.id, root);
  assert.match(text, new RegExp(`^  report {4}work/${s.id}/research\\.md$`, "m"));
});

function countingReads(run) {
  const original = fs.readFileSync;
  const counts = {};
  fs.readFileSync = function (path, ...rest) {
    const file = basename(String(path));
    counts[file] = (counts[file] ?? 0) + 1;
    return original.call(this, path, ...rest);
  };
  syncBuiltinESMExports();
  try {
    return { result: run(), counts };
  } finally {
    fs.readFileSync = original;
    syncBuiltinESMExports();
  }
}

test("the packet for a done phase reads state.yaml and order.md once each", (t) => {
  const { root, id } = setup(t);
  phaseDone(root, id);
  saveBlock(root, id, 1, BLOCK);
  const { result, counts } = countingReads(() => packet(id, root));
  assert.equal(result.next.action, "approve_phase");
  assert.equal(counts["state.yaml"], 1);
  assert.equal(counts["order.md"], 1);
});

test("cut keeps short strings and ends long ones with an ellipsis inside the limit", () => {
  assert.equal(cut("short", 10), "short");
  assert.equal(cut("a".repeat(20), 10).length, 10);
  assert.ok(cut("a".repeat(20), 10).endsWith("…"));
});
