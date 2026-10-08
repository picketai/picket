import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const LANES = ["designing", "expediting", "ordering", "researching"];
const HOSTILE = 'Add a `tether close <id>` verb, say "done", keep $HOME and $(whoami) literal, it\'s fine';
const UNBALANCED = 'Add a `tether close <id>` verb that prints "done';
const ADMIT = "tether admit --request - --human";
const OLD_INLINE = 'tether admit --text "$ARGUMENTS" --human';
const BIN_DIR = resolve("core/bin");

function laneCheckBlock(lane) {
  const text = readFileSync(resolve("core/skills", lane, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const block = text.match(/^```!\n([\s\S]*?)\n```$/m);
  assert.ok(block, `${lane}: no fenced lane check`);
  return block[1];
}

function substitute(command, args) {
  return command.replaceAll("$ARGUMENTS", args);
}

function envWithTetherOnPath() {
  const env = { ...process.env };
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[key] = `${BIN_DIR}${delimiter}${env[key] ?? ""}`;
  delete env.CLAUDE_PROJECT_DIR;
  return env;
}

function bash(script, root) {
  const r = spawnSync("bash", ["-c", script], { cwd: root, env: envWithTetherOnPath(), encoding: "utf8" });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function withRoot(command, root) {
  return command.replace(ADMIT, `${ADMIT} --root "${root.replaceAll("\\", "/")}"`);
}

for (const lane of LANES) {
  test(`${lane}: the lane check survives backticks, quotes and dollar signs in the request`, () => {
    const root = mkdtempSync(join(tmpdir(), "tether-lane-check-"));
    try {
      const block = laneCheckBlock(lane);
      assert.equal(block, `${ADMIT} <<'TETHER_REQUEST_END'\n$ARGUMENTS\nTETHER_REQUEST_END`);

      const fenced = bash(withRoot(substitute(block, HOSTILE), root), root);
      assert.equal(fenced.code, 0, fenced.stderr);
      assert.match(fenced.stdout, /^lane: order \(/);

      const unbalanced = bash(withRoot(substitute(OLD_INLINE, UNBALANCED), root), root);
      assert.notEqual(unbalanced.code, 0, "the old inline form must fail on an unbalanced double quote");
      assert.match(unbalanced.stderr, /unexpected EOF/);
      const fencedUnbalanced = bash(withRoot(substitute(block, UNBALANCED), root), root);
      assert.equal(fencedUnbalanced.code, 0, fencedUnbalanced.stderr);
      assert.match(fencedUnbalanced.stdout, /^lane: /);

      const expanded = bash(substitute(OLD_INLINE, HOSTILE).replace("tether admit --text", "printf '%s\\n'").replace(" --human", ""), root);
      assert.notEqual(expanded.stdout, `${HOSTILE}\n`, "the old inline form must expand the request instead of passing it on");

      const carried = bash(substitute(block, HOSTILE).replace(ADMIT, "cat"), root);
      assert.equal(carried.stdout, `${HOSTILE}\n`);

      const empty = bash(withRoot(substitute(block, ""), root), root);
      assert.equal(empty.code, 0, empty.stderr);
      assert.match(empty.stdout, /^lane: \(none\)/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
