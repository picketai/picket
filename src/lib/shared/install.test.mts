import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeBlockSpan, DATA_FOLDER_STATUS_LINE, INSTALL, isHomeFolder, isPicketStatusLine, LEGACY_STATUS_LINE, pluginId, readTemplate } from "./install.mts";

const TEMPLATE = "# Picket\n\nFour lanes.\n\n## Every request\n\n1. Admit.\n\n## Rules\n\nProse.\n";

test("claudeBlockSpan runs from # Picket to the line before the first heading the template does not own", () => {
  const lines = ["# My project", "", "# Picket", "", "## Every request", "1. Admit.", "## Rules", "Prose.", "## Project facts", "- a fact"];
  assert.deepEqual(claudeBlockSpan(lines, TEMPLATE), { start: 2, end: 8 });
  assert.equal(lines[8], INSTALL.claudeMd.projectFacts);
});

test("claudeBlockSpan runs to the end when no foreign heading follows, and is null without # Picket", () => {
  assert.deepEqual(claudeBlockSpan(["# Picket", "## Rules", "Prose."], TEMPLATE), { start: 0, end: 3 });
  assert.equal(claudeBlockSpan(["# My project", "## Project facts"], TEMPLATE), null);
});

test("the shipped template starts with the block start line", () => {
  assert.equal(readTemplate().split("\n")[0], INSTALL.claudeMd.start);
});

test("isHomeFolder ignores case and a trailing separator on win32 only", () => {
  assert.equal(isHomeFolder("C:\\Users\\Ana\\", "c:\\users\\ana", "win32"), true);
  assert.equal(isHomeFolder("C:\\Users\\Ana\\project", "C:\\Users\\Ana", "win32"), false);
  assert.equal(isHomeFolder("/home/Ana", "/home/ana", "linux"), false);
  assert.equal(isHomeFolder("/home/ana/", "/home/ana", "linux"), true);
});

test("the init status line runs the project copy through the braced CLAUDE_PROJECT_DIR (T-2.2)", () => {
  assert.deepEqual(INSTALL.settings.statusLine, { type: "command", command: 'node "${CLAUDE_PROJECT_DIR}/.picket/state/statusline.mjs"' });
});

test("the data folder status line stays the copy in the plugin data folder under $HOME", () => {
  assert.deepEqual(DATA_FOLDER_STATUS_LINE, { type: "command", command: 'node "$HOME/.claude/plugins/data/picket-picketai/statusline.mjs"' });
});

test("isPicketStatusLine is true for the init, the data folder and the legacy value and false for any other (T-2.2)", () => {
  assert.equal(isPicketStatusLine({ ...INSTALL.settings.statusLine }), true);
  assert.equal(isPicketStatusLine({ type: "command", command: 'node "$HOME/.claude/plugins/data/picket-picketai/statusline.mjs"' }), true);
  assert.equal(isPicketStatusLine({ type: "command", command: "picket statusline" }), true);
  assert.deepEqual(LEGACY_STATUS_LINE, { type: "command", command: "picket statusline" });
  for (const other of [{ type: "command", command: "local-line" }, undefined, null, "picket statusline"]) assert.equal(isPicketStatusLine(other), false, JSON.stringify(other));
});

test("plugin ids name the picketai marketplace", () => {
  assert.equal(pluginId("picket-status"), "picket-status@picketai");
  assert.equal(INSTALL.plugin, "picket@picketai");
  assert.equal(INSTALL.gitignore.line, ".picket/state/");
  assert.equal(INSTALL.settings.file, ".claude/settings.json");
});
