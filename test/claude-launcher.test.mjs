import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { checkoutEnv } from "../scripts/claude.mjs";

const PACKAGE = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

test("checkoutEnv puts the checkout's dist/bin first on PATH once and names the checkout (T-4.1)", () => {
  const bin = join("/r", "dist", "bin");
  const env = checkoutEnv({ PATH: "/usr/bin", HOME: "/home/u" }, "/r");
  assert.equal(env.PATH, `${bin}${delimiter}/usr/bin`);
  assert.equal(env.PICKET_CHECKOUT, "/r");
  assert.equal(env.HOME, "/home/u");
  assert.equal(checkoutEnv(env, "/r").PATH, env.PATH, "a second call does not add dist/bin again");
  const windows = checkoutEnv({ Path: "C:\\Windows" }, "/r");
  assert.equal(windows.Path, `${bin}${delimiter}C:\\Windows`);
  assert.equal("PATH" in windows, false, "the existing Path key is used, not a second one");
});

test("checkoutEnv leaves its input untouched and starts nothing on import", () => {
  const input = { PATH: "/usr/bin" };
  checkoutEnv(input, "/r");
  assert.deepEqual(input, { PATH: "/usr/bin" });
});

test("npm run claude builds, then runs the launcher, and the published files still leave scripts/ out (T-4.2)", () => {
  assert.equal(PACKAGE.scripts.claude, "npm run build && node scripts/claude.mjs");
  assert.equal(PACKAGE.files.some((entry) => entry.startsWith("scripts")), false);
});
