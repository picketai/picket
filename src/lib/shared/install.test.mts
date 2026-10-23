import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeBlockSpan, INSTALL, isHomeFolder, pluginId, readTemplate } from "./install.mts";

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

test("plugin ids name the picketai marketplace", () => {
  assert.equal(pluginId("picket-status"), "picket-status@picketai");
  assert.equal(INSTALL.plugin, "picket@picketai");
  assert.equal(INSTALL.gitignore.line, ".picket/state/");
  assert.equal(INSTALL.settings.file, ".claude/settings.json");
});
