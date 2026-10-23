import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { recordSessionCost, renderStatusline, verb } from "./index.mts";
import type { StatuslineInput } from "./facts.mts";
import type { WorkingState } from "../../shared/git.mts";
import { displayWidth } from "../../util/text-width.mts";
import { rgb } from "../../shared/styling/palette.mjs";
import { parseArgs } from "../../util/args.mts";
import { withProject } from "#test/project.mts";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;
const ESCAPE = /\x1b\[[0-9;]*m/g;
const CLEAN: WorkingState = { branch: "trunk", state: "clean" };
const FIXTURE = new URL("./statusline-input.test.json", import.meta.url);

function fixture(): any {
  return JSON.parse(readFileSync(FIXTURE, "utf8"));
}

function normal(): any {
  const input = fixture();
  input.workspace = { current_dir: "D:/work/AISpec" };
  input.rate_limits.five_hour.resets_at = (NOW + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (NOW + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (NOW + 52 * MINUTE) / 1000;
  return input;
}

function busy(): any {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 74;
  input.rate_limits.seven_day.used_percentage = 71;
  input.context_window.total_input_tokens = 120_000;
  input.context_window.used_percentage = 60;
  input.prompt_cache.expires_at = (NOW + 3 * MINUTE) / 1000;
  return input;
}

function hot(): any {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 93;
  input.rate_limits.seven_day.used_percentage = 91;
  input.context_window.total_input_tokens = 150_000;
  input.context_window.used_percentage = 75;
  input.prompt_cache.warm = false;
  return input;
}

type PaintOptions = { icons?: string; git?: WorkingState | null; skill?: string | null };

function painted(input: StatuslineInput, columns: number | undefined, { icons = "plain", git = CLEAN, skill = "picket:ordering" }: PaintOptions = {}): string {
  return renderStatusline(input, { now: NOW, columns, icons, probe: { git: () => git, skill: () => skill } });
}

function rows(input: StatuslineInput, columns: number | undefined, options?: PaintOptions): string[] {
  return painted(input, columns, options).replace(ESCAPE, "").split("\n");
}

const WIDE_RIGHT = "5h 42% (2h14m)   7d 71% (3d6h)    62k/200.0k 31%    cache 48k ◷ 52m   $4.12";

test("mutate needs an id, and statusline reads its input from standard input", () => {
  const parse = (stdin: string) => verb.parse(parseArgs([], () => stdin));
  assert.deepEqual(parse('{"cwd":"/p"}'), { cwd: "/p" });
  assert.deepEqual(parse("not json"), {});
  assert.deepEqual(parse(""), {});
});

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
  const states: Record<string, string> = { clean: "249;120;43", unstaged: "245;192;74", staged: "156;196;106", conflict: "229;72;77" };
  for (const [state, color] of Object.entries(states)) {
    assert.ok(painted(normal(), 150, { git: { branch: "trunk", state } as WorkingState }).includes(`\x1b[38;2;${color}m⎇ trunk\x1b[0m`), state);
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

test("recordSessionCost swallows a write error", (t) => {
  const root = withProject(t);
  writeFileSync(join(root, ".picket", "state"), "a file where the state folder should be");
  assert.doesNotThrow(() => recordSessionCost(root, fixture(), new Date()));
});

test("rgb splits a palette hex into its channels", () => {
  assert.deepEqual(rgb("#F9782B"), [249, 120, 43]);
  assert.deepEqual(rgb("#0D0A08"), [13, 10, 8]);
});
