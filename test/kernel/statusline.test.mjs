import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cacheLeft, contextColor, factsOf, lastSkill, paint, renderStatusline, sessionLine } from "../../core/lib/statusline.mjs";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;
const TRANSCRIPT = "test/kernel/statusline-transcript.jsonl";
const ESCAPE = /\x1b\[[0-9;]*m/g;

function fixture() {
  const input = JSON.parse(readFileSync("test/kernel/statusline-input.json", "utf8"));
  input.rate_limits.five_hour.resets_at = (NOW + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (NOW + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (NOW + 52 * MINUTE) / 1000;
  return input;
}

function plainRows(input, columns) {
  return renderStatusline(input, { now: NOW, columns }).replace(ESCAPE, "").split("\n");
}

function textOf(pieces) {
  return pieces.map((piece) => piece.text).join("");
}

function cachePiece(promptCache) {
  return cacheLeft(factsOf({ prompt_cache: promptCache }, { now: NOW, skill: null }).cache, NOW);
}

const LEFT = "◆ Opus 5.5 · high · picket:ordering";
const RIGHT = "5h 42% (2h14m)   7d 71% (3d6h)   ctx [███░░░░░░░] 62k/200.0k (31%)   cache 48k ◷ 52m   $4.12";

test("the fixture at 160 columns prints one row of 158 code points (T-1.1)", () => {
  const rows = plainRows(fixture(), 160);
  assert.equal(rows.length, 1);
  assert.equal([...rows[0]].length, 158);
  assert.ok(rows[0].startsWith(LEFT));
  assert.ok(rows[0].endsWith(RIGHT));
});

test("the fixture at 90 columns prints the left part then the right part (T-1.2)", () => {
  assert.deepEqual(plainRows(fixture(), 90), [LEFT, RIGHT]);
});

test("columns that are not a positive integer lay out at 78 (T-1.2)", () => {
  for (const columns of [NaN, 0, -5, 12.5]) {
    const rows = plainRows({ effort: { level: "max" } }, columns);
    assert.equal(rows.length, 1);
    assert.equal([...rows[0]].length, 78);
  }
});

test("contextColor measures tokens against the compaction point of the window (T-1.3)", () => {
  const compactAt = 0.83 * 200_000;
  assert.equal(contextColor(100_000, compactAt), "success");
  assert.equal(contextColor(120_000, compactAt), "warning");
  assert.equal(contextColor(145_000, compactAt), "error");
});

test("the cache part follows prompt_cache (T-1.4)", () => {
  const warm = { warm: true, caching_observed: true };
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), { text: "◷ 2m", color: "warning" });
  assert.equal(cachePiece({ ...warm, expires_at: (NOW + 3 * MINUTE) / 1000 }).text, "◷ ~3m");
  assert.deepEqual(cachePiece({ ...warm, ttl: "1h", expires_at: (NOW + 52 * MINUTE) / 1000 }), { text: "◷ 52m", dim: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", warm: false, expires_at: (NOW + 2 * MINUTE) / 1000 }), { text: "cold", color: "error", bold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: null }), { text: "cold", color: "error", bold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW - MINUTE) / 1000 }), { text: "cold", color: "error", bold: true });
  assert.equal(cachePiece({ ...warm, caching_observed: false, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), null);
  assert.equal(cachePiece(undefined), null);
});

test("empty input reads placeholders for every figure (T-1.5)", () => {
  const line = sessionLine(factsOf({}, { now: NOW, skill: null }));
  assert.equal(textOf(line.left), "◆ ... · default · none");
  assert.equal(textOf(line.right), "5h n/a   7d n/a   ctx [░░░░░░░░░░] 0/? (0%)   cache n/a");
});

test("lastSkill reads the last Skill call of an assistant entry (T-1.6)", () => {
  assert.equal(lastSkill(TRANSCRIPT), "picket:ordering");
  assert.equal(lastSkill("test/kernel/no-such-transcript.jsonl"), null);
  const lines = readFileSync(TRANSCRIPT, "utf8").trimEnd().split("\n");
  assert.equal(lastSkill(TRANSCRIPT, Buffer.byteLength(lines.at(-1)) + 2), null);
});

test("paint writes 24-bit colours and leaves plain pieces bare (T-1.7)", () => {
  const line = sessionLine(factsOf(fixture(), { now: NOW, skill: "picket:ordering" }));
  assert.equal(paint([line.left[0]]), "\x1b[38;2;215;119;87m◆ \x1b[0m");
  assert.equal(paint([line.left[1]]), "\x1b[1;38;2;215;119;87mOpus 5.5\x1b[0m");
  assert.equal(paint([line.right.at(-1)]), "$4.12");
});
