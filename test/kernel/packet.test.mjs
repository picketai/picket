import { test } from "node:test";
import assert from "node:assert/strict";
import fs, { writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { basename, join } from "node:path";
import { cut, packet, WIDTH } from "../../dist/lib/verbs/packet/packet.mjs";
import { blockFiles, parseBlock, saveBlock } from "../../dist/lib/shared/work/block.mjs";
import { setMarker } from "../../dist/lib/shared/work/markers.mjs";
import { openItem, withProject, writeConfig } from "#test/project.mts";

// The block the user's screenshot came from, in the developer's contract shape.
const BLOCK = `## Phase 1 of X: Stop the sync write

The nightly stock sync can no longer write STOCK.RESERVED_QTY on either cycle: the column left the evaluator, the diff record and the applier, so no diff the sync can produce reaches Product.ReservedQty.

Files: StockSyncColumnEvaluator.cs, StockSyncColumnChanges.cs, RunStockSyncCommandHandler.cs, IProductRepository.cs (+6 more)
Tests: passed (374/374 Shop.Inventory.Tests)
Lint: none detected
Verified: no drivable surface (background sync worker, no HTTP or CLI entry point); behaviour driven through HandleAsync against a real EF InMemory ShopDbContext
Decisions: followed the Changes paragraph over T-1.1's grep list where they contradict (a third ReservedQty hit at RunStockSyncCommandHandler.cs:422, removed by Phase 2); re-seeded three LowStock tests that computed expected units from the deleted write; turned the applier commit-boundary test into a regression guard
Commit: 3f9c2a1

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
  assert.equal(b.fields.commit, "3f9c2a1");
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
  assert.match(text, /^  commit {4}3f9c2a1 \(staged; approval commits it\)$/m);
  assert.equal(lines.at(-1), "[a] approve   [r] run through 2   [x] reject: <why>");
  assert.equal(lines.at(-2), "");
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

const withComments = (value) => BLOCK.replace("Commit: 3f9c2a1", `Comments: ${value}\nCommit: 3f9c2a1`);

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

const withProof = (red, cause) => BLOCK.replace("Commit: 3f9c2a1", `Red: ${red}\nRoot cause: ${cause}\nCommit: 3f9c2a1`);

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

const withWaivers =(value) => BLOCK.replace("Commit: 3f9c2a1", `Waivers: ${value}\nCommit: 3f9c2a1`);

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
