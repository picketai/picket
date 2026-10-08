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
const PROSE_STEP = "If this conversation has no `tether admit` answer for the request yet, run `tether admit --request - --human` with the request on stdin through a quoted heredoc.";
const OLD_INLINE = 'tether admit --text "$ARGUMENTS" --human';
const BIN_DIR = resolve("core/bin");

function skillText(lane) {
  return readFileSync(resolve("core/skills", lane, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
}

function heredocAdmit(request) {
  return `${ADMIT} <<'TETHER_REQUEST_END'\n${request}\nTETHER_REQUEST_END`;
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
  return command.replace(/tether admit (--\S+ ?)*--human/, (m) => `${m} --root "${root.replaceAll("\\", "/")}"`);
}

for (const lane of LANES) {
  test(`${lane}: the lane check is a prose step, not an injected command`, () => {
    const text = skillText(lane);
    assert.equal(text.includes("```!"), false);
    assert.equal(text.includes("!`"), false);
    assert.equal(text.includes(OLD_INLINE), false);
    assert.ok(text.includes(PROSE_STEP), `${lane}: the prose lane check is missing`);
  });
}

test("the heredoc admit the lane skills name survives backticks, quotes and dollar signs", () => {
  const root = mkdtempSync(join(tmpdir(), "tether-lane-check-"));
  try {
    const hostile = bash(withRoot(heredocAdmit(HOSTILE), root), root);
    assert.equal(hostile.code, 0, hostile.stderr);
    assert.match(hostile.stdout, /^lane: order \(/);

    const carried = bash(heredocAdmit(HOSTILE).replace(ADMIT, "cat"), root);
    assert.equal(carried.stdout, `${HOSTILE}\n`);

    const unbalanced = bash(withRoot(heredocAdmit(UNBALANCED), root), root);
    assert.equal(unbalanced.code, 0, unbalanced.stderr);
    assert.match(unbalanced.stdout, /^lane: /);

    const empty = bash(withRoot(heredocAdmit(""), root), root);
    assert.equal(empty.code, 0, empty.stderr);
    assert.match(empty.stdout, /^lane: \(none\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the old inline form breaks on an unbalanced quote and expands the request", () => {
  const root = mkdtempSync(join(tmpdir(), "tether-lane-check-"));
  try {
    const unbalanced = bash(withRoot(OLD_INLINE.replaceAll("$ARGUMENTS", UNBALANCED), root), root);
    assert.notEqual(unbalanced.code, 0);
    assert.match(unbalanced.stderr, /unexpected EOF/);

    const expanded = bash(`printf '%s\\n' "${HOSTILE}"`, root);
    assert.notEqual(expanded.stdout, `${HOSTILE}\n`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
