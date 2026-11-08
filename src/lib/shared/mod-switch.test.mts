import { test } from "node:test";
import assert from "node:assert/strict";
import { modEnabled } from "./mod-switch.mts";

test("a mod is on with no config, a config without mods, or its switch set to true (T-4.4)", () => {
  assert.equal(modEnabled(undefined, "markdown"), true);
  assert.equal(modEnabled({}, "markdown"), true);
  assert.equal(modEnabled({ version: 1 }, "markdown"), true);
  assert.equal(modEnabled({ mods: { markdown: true } }, "markdown"), true);
});

test("a mod is off only when its switch is exactly false (T-4.4)", () => {
  assert.equal(modEnabled({ mods: { markdown: false } }, "markdown"), false);
  assert.equal(modEnabled({ mods: { markdown: "no" } }, "markdown"), true);
  assert.equal(modEnabled({ mods: { markdown: 0 } }, "markdown"), true);
});

test("a switch for one mod leaves another mod on", () => {
  assert.equal(modEnabled({ mods: { markdown: false } }, "status"), true);
});

test("a mods value that is not an object leaves every mod on", () => {
  assert.equal(modEnabled({ mods: false }, "markdown"), true);
  assert.equal(modEnabled({ mods: ["markdown"] }, "markdown"), true);
  assert.equal(modEnabled(null, "markdown"), true);
});
