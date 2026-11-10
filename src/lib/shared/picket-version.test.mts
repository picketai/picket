import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isNewerVersion, picketVersion } from "./picket-version.mts";

test("picketVersion is the version field of the plugin manifest (T-2.5)", () => {
  const manifest = JSON.parse(readFileSync(resolve("src/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(picketVersion(), manifest.version);
});

test("isNewerVersion follows SemVer precedence, numeric prerelease parts as numbers, and an unparsable record counts as older (T-3.1)", () => {
  const newer: [string, string][] = [["1.0.0-alpha.10", "1.0.0-alpha.9"], ["1.0.0", "1.0.0-alpha.5"], ["1.0.0-alpha.5", "not-a-version"], ["1.0.0-beta", "1.0.0-alpha.5"], ["1.0.0-alpha.5.1", "1.0.0-alpha.5"], ["2.0.0", "1.9.9"]];
  const notNewer: [string, string][] = [["1.0.0-alpha.5", "1.0.0-alpha.5"], ["1.0.0-alpha.5", "1.0.0-alpha.6"], ["1.0.0-alpha.5", "1.0.0"], ["1.0.0-alpha.5", "99.0.0"], ["not-a-version", "1.0.0"]];
  for (const [candidate, recorded] of newer) assert.equal(isNewerVersion(candidate, recorded), true, `${candidate} > ${recorded}`);
  for (const [candidate, recorded] of notNewer) assert.equal(isNewerVersion(candidate, recorded), false, `${candidate} <= ${recorded}`);
});
