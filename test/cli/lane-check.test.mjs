import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { withProject } from "#test/project.mts";

const LANES = ["designing", "expediting", "ordering", "researching"];
const HOSTILE = 'Add a `picket close <id>` verb, say "done", keep $HOME and $(whoami) literal, it\'s fine';
const UNBALANCED = 'Add a `picket close <id>` verb that prints "done';
const ADMIT = "picket admit --request - --human";
const OLD_INLINE = 'picket admit --text "$ARGUMENTS" --human';
const BIN_DIR = resolve("dist/bin");

function skillText(lane) {
  return readFileSync(resolve("src/skills", lane, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
}

function heredocAdmit(request) {
  return `${ADMIT} <<'PICKET_REQUEST_END'\n${request}\nPICKET_REQUEST_END`;
}

function envWithPicketOnPath() {
  const env = { ...process.env };
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[key] = `${BIN_DIR}${delimiter}${env[key] ?? ""}`;
  delete env.CLAUDE_PROJECT_DIR;
  return env;
}

function bash(script, root) {
  const r = spawnSync("bash", ["-c", script], { cwd: root, env: envWithPicketOnPath(), encoding: "utf8" });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function withRoot(command, root) {
  return command.replace(/picket admit (--\S+ ?)*--human/, (m) => `${m} --root "${root.replaceAll("\\", "/")}"`);
}

for (const lane of LANES) {
  test(`${lane}: the skill injects no admit command`, () => {
    const text = skillText(lane);
    assert.equal(text.includes("```!"), false);
    assert.equal(text.includes("!`"), false);
    assert.equal(text.includes(OLD_INLINE), false);
  });
}

const OPEN_STEPS = { expediting: ["SKILL.md", "fast"], ordering: ["steps/open.md", "order"], designing: ["steps/open.md", "design"], researching: ["steps/outline.md", "research"] };

for (const [lane, [file, laneArg]] of Object.entries(OPEN_STEPS)) {
  test(`${lane}: picket open carries the request, so open checks the lane against admit`, () => {
    const text = readFileSync(resolve("src/skills", lane, file), "utf8");
    assert.match(text, new RegExp(`picket open --lane ${laneArg} --title "<six-word title>" --request - <<'PICKET_REQUEST_END'`));
  });
}

test("the heredoc admit the lane skills name survives backticks, quotes and dollar signs", (t) => {
  const root = withProject(t, { picket: false });
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
});
