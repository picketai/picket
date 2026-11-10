import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { picketVersion } from "./picket-version.mts";

test("picketVersion is the version field of the plugin manifest (T-2.5)", () => {
  const manifest = JSON.parse(readFileSync(resolve("src/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(picketVersion(), manifest.version);
});
