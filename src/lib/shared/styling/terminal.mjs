import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { userConfigPath } from "../paths.mts";
import { detectFont, readPin } from "./font.mjs";
import { writeTracked } from "./manifest.mts";
import { detectTerminal } from "./terminals.mts";
import { writer as gnomeTerminal } from "./terminals/gnome-terminal/index.mts";
import { writer as konsole } from "./terminals/konsole/index.mts";
import { writer as manual } from "./terminals/manual/index.mts";
import { writer as ptyxis } from "./terminals/ptyxis/index.mts";
import { writer as terminalApp } from "./terminals/terminal-app/index.mts";
import { writer as windowsTerminal } from "./terminals/windows-terminal/index.mts";

export { detectTerminal };

const NAME = "terminal";
const ICONS_ID = "statusline-icons";
const WRITERS = { "windows-terminal": windowsTerminal, "terminal-app": terminalApp, konsole, "gnome-terminal": gnomeTerminal, ptyxis, other: manual };

function readConfig(path) {
  if (!existsSync(path)) return { text: null, config: {} };
  const text = readFileSync(path, "utf8");
  try {
    return { text, config: JSON.parse(text) ?? {} };
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${err.message}`);
  }
}

function configText(config) {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function writeConfig(path, config) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, configText(config));
}

function fontApplied(manifest, applied) {
  return [...manifest.items, ...applied].some((item) => item.setsFont);
}

function iconsChange(host, manifest, { pin, changes, earlier }) {
  const path = userConfigPath(host.home);
  if (readConfig(path).config.statusline?.icons === "nerd") return [];
  if (!fontApplied(manifest, []) && !changes.some((change) => change.setsFont)) return [];
  const fontComing = earlier.some((change) => change.id === "font");
  if (!fontComing && !detectFont(host, pin).present) return [];
  return [
    {
      id: ICONS_ID,
      summary: `switch the status line to Nerd Font icons in ${path}`,
      restart: null,
      apply(host, { backup, applied }) {
        if (!fontApplied(manifest, applied) || !detectFont(host, pin).present) return null;
        const { config } = readConfig(path);
        const statusline = config.statusline ?? {};
        return {
          ...writeTracked(path, configText({ ...config, statusline: { ...statusline, icons: "nerd" } }), backup),
          previous: { ...("icons" in statusline ? { icons: statusline.icons } : {}), hadStatusline: config.statusline !== undefined },
        };
      },
    },
  ];
}

function unapplyIcons(item) {
  const { config } = readConfig(item.path);
  if (config.statusline?.icons !== "nerd") return { result: "kept", detail: "statusline.icons was changed after setup" };
  const statusline = { ...config.statusline };
  if ("icons" in item.previous) statusline.icons = item.previous.icons;
  else delete statusline.icons;
  const next = { ...config, statusline };
  if (!item.previous.hadStatusline && Object.keys(statusline).length === 0) delete next.statusline;
  writeConfig(item.path, next);
  return { result: "removed" };
}

export function terminalComponent(pin = readPin()) {
  return {
    name: NAME,
    plan(host, manifest, earlier = []) {
      const writer = WRITERS[detectTerminal(host.env)];
      const changes = writer.plan(host, manifest, { family: pin.family });
      return [...changes, ...iconsChange(host, manifest, { pin, changes, earlier })];
    },
    unapply(item, host) {
      if (item.id === ICONS_ID) return unapplyIcons(item);
      const writer = WRITERS[item.data?.writer];
      if (!writer) throw new Error(`no terminal writer named ${item.data?.writer}`);
      return writer.unapply(item, host);
    },
  };
}
