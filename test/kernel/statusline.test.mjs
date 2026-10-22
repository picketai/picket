import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { cacheLeft, compactTokens, contextColor, displayWidth, factsOf, iconsMode, lastSkill, recordSessionCost, renderStatusline } from "../../dist/lib/statusline.mjs";
import { rgb } from "../../dist/lib/shared/styling/palette.mjs";
import { sessionCostPath, statePath, STATE_FILES } from "../../dist/lib/shared/paths.mjs";

const BIN = resolve("dist/bin/picket.mjs");

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;
const TRANSCRIPT = "test/kernel/statusline-transcript.jsonl";
const ESCAPE = /\x1b\[[0-9;]*m/g;
const CLEAN = { branch: "trunk", state: "clean" };

function normal() {
  const input = JSON.parse(readFileSync("test/kernel/statusline-input.json", "utf8"));
  input.workspace = { current_dir: "D:/work/AISpec" };
  input.rate_limits.five_hour.resets_at = (NOW + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (NOW + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (NOW + 52 * MINUTE) / 1000;
  return input;
}

function busy() {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 74;
  input.rate_limits.seven_day.used_percentage = 71;
  input.context_window.total_input_tokens = 120_000;
  input.context_window.used_percentage = 60;
  input.prompt_cache.expires_at = (NOW + 3 * MINUTE) / 1000;
  return input;
}

function hot() {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 93;
  input.rate_limits.seven_day.used_percentage = 91;
  input.context_window.total_input_tokens = 150_000;
  input.context_window.used_percentage = 75;
  input.prompt_cache.warm = false;
  return input;
}

function probeOf(git = CLEAN, skill = "picket:ordering") {
  return { git: () => git, skill: () => skill };
}

function painted(input, columns, { icons = "plain", git = CLEAN, skill = "picket:ordering" } = {}) {
  return renderStatusline(input, { now: NOW, columns, icons, probe: probeOf(git, skill) });
}

function rows(input, columns, options) {
  return painted(input, columns, options).replace(ESCAPE, "").split("\n");
}

function cachePiece(promptCache) {
  return cacheLeft(factsOf({ prompt_cache: promptCache }, { now: NOW, skill: null }).cache, NOW);
}

const WIDE_RIGHT = "5h 42% (2h14m)   7d 71% (3d6h)    62k/200.0k 31%    cache 48k ◷ 52m   $4.12";

test("the normal state at 150 columns prints two rows ending at column 148 (T-1.1)", () => {
  const printed = rows(normal(), 150);
  assert.equal(printed.length, 2);
  assert.match(printed[0], /^  PICKETAI >_ +AISpec · ⎇ trunk$/);
  assert.ok(printed[1].startsWith("  Opus 5.5 · high · picket:ordering   "), printed[1]);
  assert.ok(printed[1].endsWith(WIDE_RIGHT), printed[1]);
  for (const row of printed) assert.equal(displayWidth(row), 148, row);
});

test("the wide layout needs 113 cells: 115 columns prints 2 rows, 114 and 80 print 3 (T-1.2)", () => {
  assert.equal(rows(normal(), 115).length, 2);
  assert.equal(rows(normal(), 114).length, 3);
  const narrow = rows(normal(), 80);
  assert.equal(narrow.length, 3);
  assert.ok(narrow[1].endsWith("5h 42% (2h14m)   7d 71% (3d6h)"), narrow[1]);
  assert.match(narrow[2], /^   62k\/200\.0k 31%  +cache 48k ◷ 52m   \$4\.12$/);
});

test("columns that are not a positive integer print the narrow layout at 78 columns (T-1.2)", () => {
  for (const columns of [NaN, 0, -5, 12.5, undefined]) {
    const printed = rows(normal(), columns);
    assert.equal(printed.length, 3, String(columns));
    for (const row of printed) assert.equal(displayWidth(row), 78, `${columns}: ${row}`);
  }
});

test("nerd icons replace labels, brackets and clocks (T-1.3)", () => {
  const printed = rows(normal(), 150, { icons: "nerd" });
  assert.ok(printed[0].endsWith("\u{F07B} AISpec · \u{F418} trunk"), printed[0]);
  for (const part of ["\u{F250} 5h 42% \u{F0450} 2h14m", "\u{F0A33} 7d 71% \u{F0450} 3d6h", "\u{E0B6} 62k/200.0k 31% \u{E0B4}", "\u{F01BC} 48k \u{F0150} 52m"]) {
    assert.ok(printed[1].includes(part), part);
  }
  assert.ok(!printed[1].includes("("), printed[1]);
  assert.ok(rows(hot(), 150, { icons: "nerd" }).join("\n").includes("\u{F0717} cold"));
});

test("every row with a right group ends at columns - 2 in both icon modes, wide folder names included (T-1.3)", () => {
  const wideFolder = normal();
  wideFolder.workspace.current_dir = "D:/work/数据";
  for (const input of [normal(), wideFolder]) {
    for (const icons of ["plain", "nerd"]) {
      for (const columns of [150, 80]) {
        for (const row of rows(input, columns, { icons })) assert.equal(displayWidth(row), columns - 2, `${icons} ${columns}: ${row}`);
      }
    }
  }
});

test("paint writes the brand, model, effort, skill, separator and reset colours (T-1.4)", () => {
  const out = painted(normal(), 150);
  for (const expected of [
    "\x1b[1;38;2;253;239;212mPICKET\x1b[0m",
    "\x1b[1;38;2;249;120;43mAI\x1b[0m",
    "\x1b[1;38;2;249;120;43mOpus 5.5\x1b[0m",
    "\x1b[38;2;253;239;212mhigh\x1b[0m",
    "\x1b[38;2;249;120;43mpicket:ordering\x1b[0m",
    "\x1b[38;2;107;97;88m · \x1b[0m",
    "\x1b[38;2;107;97;88m(2h14m)\x1b[0m",
  ]) {
    assert.ok(out.includes(expected), JSON.stringify(expected));
  }
});

test("the branch takes the colour of its git state and the limit percent its level (T-1.4)", () => {
  const states = { clean: "249;120;43", unstaged: "245;192;74", staged: "156;196;106", conflict: "229;72;77" };
  for (const [state, color] of Object.entries(states)) {
    assert.ok(painted(normal(), 150, { git: { branch: "trunk", state } }).includes(`\x1b[38;2;${color}m⎇ trunk\x1b[0m`), state);
  }
  assert.ok(painted(normal(), 150).includes("\x1b[38;2;156;196;106m42%\x1b[0m"));
  assert.ok(painted(busy(), 150).includes("\x1b[38;2;245;192;74m74%\x1b[0m"));
  assert.ok(painted(hot(), 150).includes("\x1b[38;2;229;72;77m93%\x1b[0m"));
});

test("the context bar fills its share of characters with the context colour (T-1.5)", () => {
  assert.ok(painted(normal(), 150).includes("\x1b[38;2;13;10;8;48;2;156;196;106m 62k/\x1b[0m\x1b[38;2;233;201;160;48;2;46;38;32m200.0k 31% \x1b[0m"));
  const busyOut = painted(busy(), 150);
  assert.ok(busyOut.includes("\x1b[38;2;13;10;8;48;2;245;192;74m"));
  assert.ok(busyOut.includes("\x1b[38;2;245;192;74m◷ 3m\x1b[0m"));
  const hotOut = painted(hot(), 150);
  assert.ok(hotOut.includes("\x1b[1;38;2;13;10;8;48;2;229;72;77m"));
  assert.ok(hotOut.includes("\x1b[1;38;2;229;72;77mcold\x1b[0m"));
});

test("compactTokens reads whole k below 100k, one decimal k below a million, one decimal M from it (T-1.5)", () => {
  const cases = [[999, "999"], [46_000, "46k"], [99_400, "99k"], [99_600, "99.6k"], [200_000, "200.0k"], [999_960, "1.0M"], [1_500_000, "1.5M"]];
  for (const [tokens, text] of cases) assert.equal(compactTokens(tokens), text, String(tokens));
});

test("missing facts drop their field or group instead of printing placeholders (T-1.6)", () => {
  assert.deepEqual(rows({}, undefined, { git: null, skill: null }), ["  PICKETAI >_", "  default · none"]);
  const sparse = rows({ model: { id: "claude-opus-5-5" }, cost: { total_cost_usd: 1.5 } }, 150, { git: null, skill: null }).join("\n");
  for (const absent of ["5h", "7d", "cache", "/"]) assert.ok(!sparse.includes(absent), absent);
  assert.ok(sparse.includes("Opus 5.5 · default · none"), sparse);
  for (const input of [{}, normal(), busy(), hot()]) {
    const text = rows(input, 80, { git: null, skill: null }).join("\n");
    for (const placeholder of ["n/a", "?", "..."]) assert.ok(!text.includes(placeholder), `${placeholder} in ${text}`);
  }
});

test("displayWidth counts wide, emoji and zero-width code points by display column", () => {
  assert.equal(displayWidth("数据"), 4);
  assert.equal(displayWidth("⎇ ◷"), 3);
  assert.equal(displayWidth("\u{F0450}\u{E0B6}"), 2);
  assert.equal(displayWidth("e\u0301"), 1);
  assert.equal(displayWidth("\u{1F44D}"), 2);
  assert.equal(displayWidth("a\u200Db\uFE0F"), 2);
});

test("contextColor measures tokens against the compaction point of the window", () => {
  const compactAt = 0.83 * 200_000;
  assert.equal(contextColor(100_000, compactAt), "success");
  assert.equal(contextColor(120_000, compactAt), "warning");
  assert.equal(contextColor(145_000, compactAt), "error");
});

test("cacheLeft follows prompt_cache", () => {
  const warm = { warm: true, caching_observed: true };
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), { minutes: "2m", color: "warning" });
  assert.deepEqual(cachePiece({ ...warm, expires_at: (NOW + 3 * MINUTE) / 1000 }), { minutes: "~3m", color: "warning" });
  assert.deepEqual(cachePiece({ ...warm, ttl: "1h", expires_at: (NOW + 52 * MINUTE) / 1000 }), { minutes: "52m", color: "dim" });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", warm: false, expires_at: (NOW + 2 * MINUTE) / 1000 }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: null }), { cold: true });
  assert.deepEqual(cachePiece({ ...warm, ttl: "5m", expires_at: (NOW - MINUTE) / 1000 }), { cold: true });
  assert.equal(cachePiece({ ...warm, caching_observed: false, ttl: "5m", expires_at: (NOW + 2 * MINUTE) / 1000 }), null);
  assert.equal(cachePiece(undefined), null);
});

test("lastSkill reads the last Skill call of an assistant entry", () => {
  assert.equal(lastSkill(TRANSCRIPT), "picket:ordering");
  assert.equal(lastSkill("test/kernel/no-such-transcript.jsonl"), null);
  const lines = readFileSync(TRANSCRIPT, "utf8").trimEnd().split("\n");
  assert.equal(lastSkill(TRANSCRIPT, Buffer.byteLength(lines.at(-1)) + 2), null);
});

test("iconsMode is nerd only for that exact value in the user's Picket config", () => {
  const home = mkdtempSync(join(tmpdir(), "picket-icons-"));
  try {
    assert.equal(iconsMode(home), "plain");
    mkdirSync(join(home, ".picketai"));
    const config = join(home, ".picketai", "config.json");
    for (const [text, mode] of [['{"statusline":{"icons":"nerd"}}', "nerd"], ['{"statusline":{"icons":"Nerd"}}', "plain"], ["{broken", "plain"], ["null", "plain"]]) {
      writeFileSync(config, text);
      assert.equal(iconsMode(home), mode, text);
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

function withTempRoot({ picket }, fn) {
  const root = mkdtempSync(join(tmpdir(), "picket-statusline-root-"));
  try {
    if (picket) mkdirSync(join(root, ".picket"));
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function spawnStatusline(input, root) {
  return spawnSync("node", [BIN, "statusline"], { input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, COLUMNS: "150", CLAUDE_PROJECT_DIR: root } });
}

function fixture() {
  return JSON.parse(readFileSync("test/kernel/statusline-input.json", "utf8"));
}

function sessionFiles(root) {
  const dir = statePath(root, STATE_FILES.sessions);
  return existsSync(dir) ? readdirSync(dir) : [];
}

test("picket statusline writes the session cost snapshot under the project root and prints as before (T-1.1)", () => {
  withTempRoot({ picket: true }, (root) => {
    const printed = spawnStatusline(fixture(), root);
    withTempRoot({ picket: false }, (bare) => {
      assert.equal(printed.stdout, spawnStatusline(fixture(), bare).stdout);
    });
    assert.equal(printed.status, 0);
    assert.equal(printed.stderr, "");
    const snapshot = JSON.parse(readFileSync(join(root, ".picket", "state", "sessions", "statusline-fixture.json"), "utf8"));
    assert.equal(snapshot.session, "statusline-fixture");
    assert.equal(snapshot.cost_usd, 4.12);
    assert.match(snapshot.ts, /^\d{4}-\d{2}-\d{2}T/);
  });
});

test("picket statusline prints and writes nothing without .picket, with an unsafe session id or without a cost (T-1.2)", () => {
  const noCost = fixture();
  delete noCost.cost;
  const cases = [
    [{ picket: false }, fixture()],
    [{ picket: true }, { ...fixture(), session_id: "../x" }],
    [{ picket: true }, noCost],
  ];
  for (const [options, input] of cases) {
    withTempRoot(options, (root) => {
      const printed = spawnStatusline(input, root);
      assert.equal(printed.status, 0);
      assert.match(printed.stdout.replace(ESCAPE, ""), /PICKETAI/);
      assert.deepEqual(sessionFiles(root), [], JSON.stringify(input.session_id));
      assert.equal(existsSync(statePath(root, "x.json")), false);
    });
  }
});

test("sessionCostPath refuses ids that are not a plain file name", () => {
  for (const id of ["../x", "a/b", "a.b", "", "x".repeat(129), undefined, 42]) assert.equal(sessionCostPath("/r", id), null, String(id));
  assert.ok(sessionCostPath("/r", "abc-DEF_1").endsWith(join("sessions", "abc-DEF_1.json")));
});

test("recordSessionCost swallows a write error", () => {
  withTempRoot({ picket: true }, (root) => {
    writeFileSync(join(root, ".picket", "state"), "a file where the state folder should be");
    assert.doesNotThrow(() => recordSessionCost(fixture(), { root }));
  });
});

test("rgb splits a palette hex into its channels", () => {
  assert.deepEqual(rgb("#F9782B"), [249, 120, 43]);
  assert.deepEqual(rgb("#0D0A08"), [13, 10, 8]);
});
