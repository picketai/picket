import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { userConfigPath } from "../paths.mjs";
import { detectFont, readPin } from "./font.mjs";
import { installedAt, sha256File } from "./manifest.mjs";
import { gnomeTerminal } from "./terminals/gnome-terminal.mjs";
import { konsole } from "./terminals/konsole.mjs";
import { manualWriter } from "./terminals/manual.mjs";
import { ptyxis } from "./terminals/ptyxis.mjs";
import { terminalApp } from "./terminals/terminal-app.mjs";
import { windowsTerminal } from "./terminals/windows-terminal.mjs";

const NAME = "terminal";
const ICONS_ID = "statusline-icons";
const WRITERS = Object.fromEntries([windowsTerminal, terminalApp, konsole, gnomeTerminal, ptyxis].map((writer) => [writer.id, writer]));

export function detectTerminal(env) {
  if (env.WT_SESSION) return "windows-terminal";
  if (env.TERM_PROGRAM === "Apple_Terminal") return "terminal-app";
  if (env.KONSOLE_VERSION) return "konsole";
  if (env.PTYXIS_VERSION) return "ptyxis";
  if (env.GNOME_TERMINAL_SCREEN || env.GNOME_TERMINAL_SERVICE) return "gnome-terminal";
  return "other";
}

function readConfig(path) {
  if (!existsSync(path)) return { text: null, config: {} };
  const text = readFileSync(path, "utf8");
  try {
    return { text, config: JSON.parse(text) ?? {} };
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${err.message}`);
  }
}

function writeConfig(path, config) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}

function iconsChange(host, manifest, { pin, run, changes, earlier }) {
  const path = userConfigPath(host.home);
  if (readConfig(path).config.statusline?.icons === "nerd") return [];
  const fontSetBefore = manifest.items.some((item) => item.data?.setsFont);
  if (!fontSetBefore && !changes.some((change) => change.setsFont)) return [];
  const fontComing = earlier.some((change) => change.id === "font");
  if (!fontComing && !detectFont(host, pin).present) return [];
  return [
    {
      id: ICONS_ID,
      summary: `switch the status line to Nerd Font icons in ${path}`,
      restart: null,
      apply(host, backup) {
        if (!(fontSetBefore || run.fontSet) || !detectFont(host, pin).present) return null;
        const { text, config } = readConfig(path);
        const backupPath = text === null ? undefined : backup(path);
        const statusline = config.statusline ?? {};
        writeConfig(path, { ...config, statusline: { ...statusline, icons: "nerd" } });
        return {
          id: ICONS_ID,
          component: NAME,
          kind: text === null ? "created" : "edited",
          path,
          ...(backupPath ? { backup: backupPath } : {}),
          sha256: sha256File(path),
          previous: { ...("icons" in statusline ? { icons: statusline.icons } : {}), hadStatusline: config.statusline !== undefined },
          installedAt: installedAt(host),
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
  const fallback = manualWriter(pin.family);
  return {
    name: NAME,
    plan(host, manifest, earlier = []) {
      const writer = WRITERS[detectTerminal(host.env)] ?? fallback;
      const run = { fontSet: false };
      const changes = writer.plan(host, manifest, { family: pin.family, run });
      return [...changes, ...iconsChange(host, manifest, { pin, run, changes, earlier })];
    },
    unapply(item, host) {
      if (item.id === ICONS_ID) return unapplyIcons(item);
      const writer = WRITERS[item.data?.writer];
      if (!writer) throw new Error(`no terminal writer named ${item.data?.writer}`);
      return writer.unapply(item, host);
    },
  };
}
