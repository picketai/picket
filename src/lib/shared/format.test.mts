import { test } from "node:test";
import assert from "node:assert/strict";
import { clock, compactTokens, elapsed, minutes, prettyModel, roleOf } from "./format.mts";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

function table<T>(format: (value: T) => string, cases: [T, string][]) {
  for (const [value, text] of cases) assert.equal(format(value), text, String(value));
}

test("compactTokens reads the number below 1000, one decimal k below 10k, whole k below a million, one decimal M from it", () => {
  table(compactTokens, [
    [950, "950"],
    [999, "999"],
    [1000, "1.0k"],
    [9500, "9.5k"],
    [9960, "10k"],
    [46_000, "46k"],
    [99_600, "100k"],
    [200_000, "200k"],
    [999_400, "999k"],
    [999_600, "1.0M"],
    [1_500_000, "1.5M"],
  ]);
});

test("elapsed reads seconds, then minutes and padded seconds, then hours and padded minutes", () => {
  table(elapsed, [
    [45 * SECOND, "45s"],
    [42 * SECOND, "42s"],
    [3 * MINUTE + 5 * SECOND, "3m05s"],
    [3 * MINUTE + 12 * SECOND, "3m12s"],
    [HOUR + 2 * MINUTE, "1h02m"],
    [HOUR + 5 * MINUTE, "1h05m"],
    [-SECOND, "0s"],
  ]);
});

test("minutes reads whole minutes, then hours and padded minutes, then days and padded hours", () => {
  table(minutes, [
    [6 * MINUTE, "6m"],
    [12 * MINUTE + 59 * SECOND, "12m"],
    [HOUR + 5 * MINUTE, "1h05m"],
    [134 * MINUTE, "2h14m"],
    [78 * HOUR, "3d06h"],
    [-MINUTE, "0m"],
  ]);
});

test("clock reads minutes and seconds, with hours once there are any", () => {
  table(clock, [
    [16 * SECOND, "0:16"],
    [44_900, "0:44"],
    [HOUR + 2 * MINUTE + 5 * SECOND, "1:02:05"],
  ]);
});

test("prettyModel reads a model id as its family and version, and keeps any other id", () => {
  table(prettyModel, [
    ["claude-opus-5-5", "Opus 5.5"],
    ["claude-sonnet-5-5-20261001", "Sonnet 5.5"],
    ["gpt-x", "gpt-x"],
  ]);
});

test("roleOf drops the picket: prefix of an agent type", () => {
  table(roleOf, [
    ["picket:developer", "developer"],
    ["Explore", "Explore"],
  ]);
});
