import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { withProject } from "#test/project.mts";

const script = fileURLToPath(new URL("../../dist/skills/reviewing/scripts/lint.craft.mjs", import.meta.url));

function lintStaged(t, files, ...flags) {
  const root = withProject(t, { picket: false });
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" });
  git("init", "-q");
  writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), source);
  }
  git("add", "-A");
  return spawnSync(process.execPath, [script, "--staged", ...flags, "-C", root], { encoding: "utf8" });
}

function lintAdded(t, source) {
  const r = lintStaged(t, { "a.ts": source }, "--json");
  return { code: r.status, ...JSON.parse(r.stdout) };
}

const marker = "//";

test("every added comment is a candidate, a why-sounding one and a doc comment included", (t) => {
  const source = [
    `${marker} loop over the orders`,
    `${marker} rounds half up because the tariff table says so`,
    "/** Returns the fee. */",
    "export const a = 1;",
    "",
  ].join("\n");
  const r = lintAdded(t, source);
  assert.deepEqual(r.candidates.map((c) => [c.rule, c.line]), [["CD2", 1], ["CD2", 2], ["CD2", 3]]);
  assert.match(r.candidates[2].message, /new doc comment/);
  assert.equal(r.errors.length, 0);
  assert.equal(r.code, 0);
});

test("a machine directive is exempt and commented-out code is an error", (t) => {
  const source = [`${marker} eslint-disable-next-line no-console`, `${marker} return Money.zero(c);`, "export const a = 1;", ""].join("\n");
  const r = lintAdded(t, source);
  assert.deepEqual(r.candidates, []);
  assert.deepEqual(r.errors.map((e) => [e.rule, e.line]), [["CD1", 2]]);
  assert.equal(r.code, 1);
});

test("craft-lint-allow no longer silences a comment", (t) => {
  const r = lintAdded(t, [`${marker} craft-lint-allow: CD2 keep this note`, "export const a = 1;", ""].join("\n"));
  assert.deepEqual(r.candidates.map((c) => c.rule), ["CD2"]);
});

const DASHES = /[\u{2013}\u{2014}]/u;

test("the printed report holds no en or em dash, with findings of every kind or none", (t) => {
  const flagged = lintStaged(t, {
    "a.ts": [`${marker} a note`, `${marker} return Money.zero(c);`, "export const a = 1;", ""].join("\n"),
    "e2e/checkout.test.ts": ["import { test } from '@playwright/test';", "import 'ArchUnit';", ""].join("\n"),
  });
  assert.match(flagged.stdout, /CD1[\s\S]*TK1[\s\S]*TK2[\s\S]*CD2[\s\S]*TK3/);
  assert.doesNotMatch(flagged.stdout, DASHES);
  const clean = lintStaged(t, { "a.ts": "export const a = 2;\n" });
  assert.match(clean.stdout, /^clean: no comment or test-kind violations/m);
  assert.doesNotMatch(clean.stdout, DASHES);
});
