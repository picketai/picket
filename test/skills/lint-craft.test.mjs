import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = fileURLToPath(new URL("../../dist/skills/reviewing/scripts/lint.craft.mjs", import.meta.url));

function lintAdded(source) {
  const root = mkdtempSync(join(tmpdir(), "picket-craft-"));
  const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8" });
  try {
    git("init", "-q");
    writeFileSync(join(root, "a.ts"), "export const a = 1;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "base");
    writeFileSync(join(root, "a.ts"), source);
    git("add", "-A");
    const r = spawnSync(process.execPath, [script, "--staged", "--json", "-C", root], { encoding: "utf8" });
    return { code: r.status, ...JSON.parse(r.stdout) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const marker = "//";

test("every added comment is a candidate, a why-sounding one and a doc comment included", () => {
  const source = [
    `${marker} loop over the orders`,
    `${marker} rounds half up because the tariff table says so`,
    "/** Returns the fee. */",
    "export const a = 1;",
    "",
  ].join("\n");
  const r = lintAdded(source);
  assert.deepEqual(r.candidates.map((c) => [c.rule, c.line]), [["CD2", 1], ["CD2", 2], ["CD2", 3]]);
  assert.match(r.candidates[2].message, /new doc comment/);
  assert.equal(r.errors.length, 0);
  assert.equal(r.code, 0);
});

test("a machine directive is exempt and commented-out code is an error", () => {
  const source = [`${marker} eslint-disable-next-line no-console`, `${marker} return Money.zero(c);`, "export const a = 1;", ""].join("\n");
  const r = lintAdded(source);
  assert.deepEqual(r.candidates, []);
  assert.deepEqual(r.errors.map((e) => [e.rule, e.line]), [["CD1", 2]]);
  assert.equal(r.code, 1);
});

test("craft-lint-allow no longer silences a comment", () => {
  const r = lintAdded([`${marker} craft-lint-allow: CD2 keep this note`, "export const a = 1;", ""].join("\n"));
  assert.deepEqual(r.candidates.map((c) => c.rule), ["CD2"]);
});
