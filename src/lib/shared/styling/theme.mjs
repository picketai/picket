import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HOST_DIR, pluginRoot } from "../paths.mts";
import { writeTracked } from "./manifest.mts";

const NAME = "theme";
const THEME_VALUE = "custom:picketai";
const THEME_SOURCE = join(pluginRoot(), "themes", "picketai.json");
const PICK_BY_HAND = "run /theme in Claude Code and pick PicketAI";
const PROJECT_WINS = "a theme setting in a project's own settings outranks this user setting";

function themeCopyPath(host) {
  return join(host.home, HOST_DIR, "themes", "picketai.json");
}

function settingsPath(host) {
  return join(host.home, HOST_DIR, "settings.json");
}

function readText(path) {
  return existsSync(path) ? readFileSync(path) : null;
}

function readJson(path, text) {
  try {
    return text === null ? {} : JSON.parse(text.toString("utf8"));
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${err.message}`);
  }
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, jsonText(value));
}

function globalTheme(host) {
  try {
    const global = JSON.parse(readFileSync(join(host.home, `${HOST_DIR}.json`), "utf8"));
    return typeof global?.theme === "string" ? global.theme : null;
  } catch {
    return null;
  }
}

function themeInEffect(host, settings) {
  if (typeof settings.theme === "string") return settings.theme;
  return globalTheme(host) ?? "dark";
}

function fileChange(host) {
  const path = themeCopyPath(host);
  const source = readFileSync(THEME_SOURCE);
  const current = readText(path);
  if (current !== null && current.equals(source)) return [];
  return [
    {
      id: "theme-file",
      summary: `copy the PicketAI theme to ${path}`,
      ...(current === null ? {} : { question: `Replace ${path}?` }),
      restart: null,
      apply(host, { backup }) {
        return writeTracked(path, source, backup);
      },
    },
  ];
}

function settingChange(host) {
  const path = settingsPath(host);
  const settings = readJson(path, readText(path));
  if (settings.theme === THEME_VALUE) return [];
  return [
    {
      id: "theme-setting",
      summary: `set theme to "${THEME_VALUE}" in ${path} (now ${themeInEffect(host, settings)})`,
      question: "Make PicketAI your Claude Code theme?",
      restart: null,
      manual: PROJECT_WINS,
      manualIfSkipped: PICK_BY_HAND,
      apply(host, { backup }) {
        const before = readJson(path, readText(path));
        return {
          ...writeTracked(path, jsonText({ ...before, theme: THEME_VALUE }), backup),
          previous: "theme" in before ? { theme: before.theme } : {},
        };
      },
    },
  ];
}

function plan(host) {
  return [...fileChange(host), ...settingChange(host)];
}

function unapplySetting(item) {
  const settings = readJson(item.path, readText(item.path));
  if (settings.theme !== THEME_VALUE) return { result: "kept", detail: "theme was changed after setup" };
  const restored = { ...settings };
  if ("theme" in item.previous) restored.theme = item.previous.theme;
  else delete restored.theme;
  writeJson(item.path, restored);
  return { result: "removed" };
}

function unapply(item) {
  if (item.id === "theme-setting") return unapplySetting(item);
  return { result: "kept", detail: "changed after setup", manual: `remove ${item.path} by hand if you no longer want it` };
}

function activeSetting(host) {
  try {
    return readJson(settingsPath(host), readText(settingsPath(host))).theme;
  } catch {
    return undefined;
  }
}

function blocks(item, host) {
  if (item.id !== "theme-file") return null;
  const global = globalTheme(host);
  if (activeSetting(host) !== THEME_VALUE && global !== THEME_VALUE) return null;
  const fallback = global !== null && global !== THEME_VALUE ? global : "dark";
  return `PicketAI is still your Claude Code theme: run /theme, pick ${fallback}, then remove the theme again`;
}

export const theme = { name: NAME, plan, unapply, blocks };
