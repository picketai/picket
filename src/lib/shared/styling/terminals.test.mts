import { test } from "node:test";
import assert from "node:assert/strict";
import { detectTerminal } from "./terminals.mts";

test("detectTerminal names each terminal from its environment variable", () => {
  assert.equal(detectTerminal({ WT_SESSION: "abc" }), "windows-terminal");
  assert.equal(detectTerminal({ TERM_PROGRAM: "Apple_Terminal" }), "terminal-app");
  assert.equal(detectTerminal({ KONSOLE_VERSION: "230804" }), "konsole");
  assert.equal(detectTerminal({ PTYXIS_VERSION: "47.0" }), "ptyxis");
  assert.equal(detectTerminal({ GNOME_TERMINAL_SCREEN: "/org/gnome/Terminal/screen/1" }), "gnome-terminal");
  assert.equal(detectTerminal({ GNOME_TERMINAL_SERVICE: ":1.42" }), "gnome-terminal");
});

test("detectTerminal returns other when no terminal variable matches", () => {
  for (const env of [{}, { TERM_PROGRAM: "iTerm.app" }, { TERM_PROGRAM: "WezTerm" }, { KITTY_WINDOW_ID: "1" }]) assert.equal(detectTerminal(env), "other");
});

test("detectTerminal takes the first match in list order", () => {
  assert.equal(detectTerminal({ WT_SESSION: "abc", KONSOLE_VERSION: "230804" }), "windows-terminal");
  assert.equal(detectTerminal({ PTYXIS_VERSION: "47.0", GNOME_TERMINAL_SCREEN: "1" }), "ptyxis");
});
