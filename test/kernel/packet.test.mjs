import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWork, setMarker } from "../../.claude/lib/work.mjs";
import { packet, parseBlock, saveBlock, cut, WIDTH } from "../../.claude/lib/packet.mjs";
import { writeConfig } from "./config-fixture.mjs";

// The block the user's screenshot came from, in the developer's contract shape.
const BLOCK = `## Phase 1 of X: Stop the poll write

The telematics poll can no longer write WAGENS.TANKINHOUD on either cycle: the column left the evaluator, the diff record and the applier, so no diff the poll can produce reaches Car.TankSize.

Files: CarTelematicsColumnEvaluator.cs, CarTelematicsColumnChanges.cs, RunTelematicsPollCommandHandler.cs, ICarRepository.cs (+6 more)
Tests: passed (374/374 Rent.Fleet.Tests)
Lint: none detected
Verified: no drivable surface (background poll worker, no HTTP or CLI entry point); behaviour driven through HandleAsync against a real EF InMemory RentDbContext
Decisions: followed the Changes paragraph over T-1.1's grep list where they contradict (a third TankSize hit at RunTelematicsPollCommandHandler.cs:422, removed by Phase 2); re-seeded three LowFuel tests that computed expected litres from the deleted write; turned the applier commit-boundary test into a regression guard
Commit: 3f9c2a1

PHASE DONE`;

function setup() {
  const root = mkdtempSync(join(tmpdir(), "harness-packet-"));
  mkdirSync(join(root, ".claude"));
  const s = createWork({ lane: "order", title: "Stop poll write", root });
  writeFileSync(join(root, "work", s.id, "order.md"), "---\nlane: order\n---\n# O\n\n## Phase 1: Stop the write\n\nt\n\n## Phase 2: Remove the column\n\nt\n");
  return { root, id: s.id };
}

test("parseBlock reads the developer block into fields", () => {
  const b = parseBlock(BLOCK);
  assert.equal(b.title, "Phase 1 of X: Stop the poll write");
  assert.match(b.headline, /^The telematics poll can no longer write/);
  assert.equal(b.fields.tests, "passed (374/374 Rent.Fleet.Tests)");
  assert.equal(b.fields.commit, "3f9c2a1");
  assert.equal(b.verdict, "PHASE DONE");
});

test("the gate packet is fixed-shape, width-capped, and ends with the options", () => {
  const { root, id } = setup();
  setMarker(id, 1, "done", root);
  saveBlock(id, 1, BLOCK, root);
  const { lines, text } = packet(id, root);
  assert.equal(lines[0], `▶ phase 1/2 done · ${id}`);
  assert.equal(lines[1], "  The telematics poll can no longer write WAGENS.TANKINHOUD on either cycle…", "the claim survives, the explanation after the colon goes");
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
  assert.match(text, /^  tests {5}passed \(374\/374 Rent\.Fleet\.Tests\)$/m);
  assert.match(text, /^  files {5}CarTelematicsColumnEvaluator\.cs, CarTelematicsColumnChanges\.cs, \+8 more$/m, "whole paths only, the rest counted");
  assert.equal(lines.filter((l) => /^ {12}· /.test(l) || /^  decisions/.test(l)).length, 3, "three decisions, one per line");
  assert.match(text, /^  commit {4}3f9c2a1 \(staged; approval commits it\)$/m);
  assert.equal(lines.at(-1), "[a] approve   [r] run through 2   [x] reject: <why>");
  assert.equal(lines.at(-2), "");
  rmSync(root, { recursive: true, force: true });
});

function gatedSetup({ entry, touchSet = "", config }) {
  const root = mkdtempSync(join(tmpdir(), "harness-packet-"));
  mkdirSync(join(root, ".claude"));
  if (config) writeConfig(root, config);
  const s = createWork({ lane: "design", title: "Gated", root });
  writeFileSync(
    join(root, "work", s.id, "design.md"),
    `---\nlane: design\nphases:\n  - n: 1\n${entry}  - n: 2\n    files: [lib/b.mjs]\n    security: false\n---\n# D\n\n## Phase 1: Gated\n\n${touchSet}t\n\n## Phase 2: Next\n\nt\n`,
  );
  setMarker(s.id, 1, "done", root);
  saveBlock(s.id, 1, BLOCK, root);
  return { root, id: s.id };
}

test("a phase with its own gate shows a gate line directly after files", () => {
  const { root, id } = gatedSetup({ entry: "    files: [lib/a.mjs]\n    security: true\n" });
  const { lines } = packet(id, root);
  const files = lines.findIndex((l) => l.startsWith("  files"));
  assert.equal(lines[files + 1], "  gate      phase 1 is marked security-sensitive in the record; run grants stop here");
  rmSync(root, { recursive: true, force: true });
});

test("a gate line naming a long touch-set path stays within the width", () => {
  const longPath = `lib/secure/${"x".repeat(105)}.mjs`;
  assert.equal(longPath.length, 120);
  const { root, id } = gatedSetup({
    entry: "    files: [lib/a.mjs]\n    security: false\n",
    touchSet: `**Touch set:**\n- \`${longPath}\`: why\n\n`,
    config: { security_paths: ["lib/secure/"] },
  });
  const { lines } = packet(id, root);
  assert.ok(lines.some((l) => l.startsWith("  gate      phase 1 touches a security path")));
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
  rmSync(root, { recursive: true, force: true });
});

test("an ungated phase's packet has no gate line", () => {
  const { root, id } = setup();
  setMarker(id, 1, "done", root);
  saveBlock(id, 1, BLOCK, root);
  assert.equal(packet(id, root).lines.some((l) => l.startsWith("  gate")), false);
  rmSync(root, { recursive: true, force: true });
});

const withComments = (value) => BLOCK.replace("Commit: 3f9c2a1", `Comments: ${value}\nCommit: 3f9c2a1`);

test("comment proposals render numbered and add the keep option (T-3.1)", () => {
  const { root, id } = setup();
  setMarker(id, 1, "done", root);
  saveBlock(id, 1, withComments('src/fee.ts:42 "half-up: the tariff table is published that way"'), root);
  const { lines } = packet(id, root);
  assert.ok(lines.includes('  comments  1 src/fee.ts:42 "half-up: the tariff table is published that way"'));
  assert.match(lines.at(-1), /\[k\] keep comment <n>$/);

  saveBlock(id, 1, withComments("none"), root);
  const plain = packet(id, root);
  assert.equal(plain.lines.some((l) => /^ {2}comments/.test(l)), false);
  assert.doesNotMatch(plain.text, /keep comment/);
  rmSync(root, { recursive: true, force: true });
});

test("four proposals stay within the width and the fourth is counted (T-3.2)", () => {
  const { root, id } = setup();
  setMarker(id, 1, "done", root);
  const long = "x".repeat(120);
  const four = [1, 2, 3, 4].map((n) => `src/f${n}.ts:${n} "why ${n}; ${long}"`).join("; ");
  saveBlock(id, 1, withComments(four), root);
  const { lines } = packet(id, root);
  for (const l of lines) assert.ok(l.length <= WIDTH, `line over ${WIDTH} chars: ${l}`);
  assert.match(lines.find((l) => /^ {2}comments/.test(l)), /^ {2}comments {2}1 src\/f1\.ts:1 "why 1; x+…$/);
  assert.equal(lines.filter((l) => /^ {12}[23] src\/f[23]\.ts/.test(l)).length, 2);
  assert.ok(lines.includes(`  ${"".padEnd(10)}+1 more in the phase block`));
  rmSync(root, { recursive: true, force: true });
});

test("a missing block degrades to 'not reported', a blocked item shows the reason", () => {
  const { root, id } = setup();
  setMarker(id, 1, "done", root);
  const p = packet(id, root);
  assert.match(p.text, /tests {5}not reported/);
  assert.match(p.lines[1], /Stop the write/);
  rmSync(root, { recursive: true, force: true });
});

test("a research packet points at work/<id>/research.md", () => {
  const root = mkdtempSync(join(tmpdir(), "harness-packet-"));
  mkdirSync(join(root, ".claude"));
  const s = createWork({ lane: "research", title: "How pricing works", root });
  writeFileSync(join(root, "work", s.id, "research.md"), "---\nkind: report\n---\n# Report\n\n## Summary\n\nPricing is computed per invoice line.\n");
  const { text } = packet(s.id, root);
  assert.match(text, new RegExp(`^  report {4}work/${s.id}/research\\.md$`, "m"));
  rmSync(root, { recursive: true, force: true });
});

test("cut keeps short strings and ends long ones with an ellipsis inside the limit", () => {
  assert.equal(cut("short", 10), "short");
  assert.equal(cut("a".repeat(20), 10).length, 10);
  assert.ok(cut("a".repeat(20), 10).endsWith("…"));
});
