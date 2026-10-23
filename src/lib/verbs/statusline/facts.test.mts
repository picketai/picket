import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderStatusline } from "./index.mts";
import type { StatuslineInput } from "./facts.mts";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60_000;
const ESCAPE = /\x1b\[[0-9;]*m/g;

type RateWindow = NonNullable<NonNullable<StatuslineInput["rate_limits"]>["five_hour"]>;
type Fixture = StatuslineInput & {
  workspace: { current_dir?: string };
  rate_limits: { five_hour: RateWindow; seven_day: RateWindow };
  context_window: NonNullable<StatuslineInput["context_window"]>;
  prompt_cache: NonNullable<StatuslineInput["prompt_cache"]>;
};

function normal(): Fixture {
  const input: Fixture = JSON.parse(readFileSync(new URL("./statusline-input.test.json", import.meta.url), "utf8"));
  input.workspace = { current_dir: "D:/work/AISpec" };
  input.rate_limits.five_hour.resets_at = (NOW + 134 * MINUTE) / 1000;
  input.rate_limits.seven_day.resets_at = (NOW + 78 * 60 * MINUTE) / 1000;
  input.prompt_cache.expires_at = (NOW + 52 * MINUTE) / 1000;
  return input;
}

function busy(): Fixture {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 74;
  input.rate_limits.seven_day.used_percentage = 71;
  input.context_window.total_input_tokens = 120_000;
  input.context_window.used_percentage = 60;
  input.prompt_cache.expires_at = (NOW + 3 * MINUTE) / 1000;
  return input;
}

function hot(): Fixture {
  const input = normal();
  input.rate_limits.five_hour.used_percentage = 93;
  input.rate_limits.seven_day.used_percentage = 91;
  input.context_window.total_input_tokens = 150_000;
  input.context_window.used_percentage = 75;
  input.prompt_cache.warm = false;
  return input;
}

function bareRows(input: StatuslineInput, columns: number | undefined): string[] {
  return renderStatusline(input, { now: NOW, columns, icons: "plain", probe: { git: () => null, skill: () => null } }).replace(ESCAPE, "").split("\n");
}

test("missing facts drop their field or group instead of printing placeholders (T-1.6)", () => {
  assert.deepEqual(bareRows({}, undefined), ["  PICKETAI >_", "  default · none"]);
  const sparse = bareRows({ model: { id: "claude-opus-5-5" }, cost: { total_cost_usd: 1.5 } } as StatuslineInput, 150).join("\n");
  for (const absent of ["5h", "7d", "cache", "/"]) assert.ok(!sparse.includes(absent), absent);
  assert.ok(sparse.includes("Opus 5.5 · default · none"), sparse);
  for (const input of [{}, normal(), busy(), hot()]) {
    const text = bareRows(input, 80).join("\n");
    for (const placeholder of ["n/a", "?", "..."]) assert.ok(!text.includes(placeholder), `${placeholder} in ${text}`);
  }
});
