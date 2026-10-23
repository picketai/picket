import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { userConfigPath } from "../../../paths.mts";
import type { Change, Component } from "../../change.mts";
import type { Host } from "../../host.mts";
import { writeTracked, type Manifest, type ManifestItem, type Unapplied } from "../../manifest.mts";
import { detectTerminal, type TerminalId, type TerminalWriter } from "../../terminals.mts";
import { writer as gnomeTerminal } from "../../terminals/gnome-terminal/index.mts";
import { writer as konsole } from "../../terminals/konsole/index.mts";
import { writer as manual } from "../../terminals/manual/index.mts";
import { writer as ptyxis } from "../../terminals/ptyxis/index.mts";
import { writer as terminalApp } from "../../terminals/terminal-app/index.mts";
import { writer as windowsTerminal } from "../../terminals/windows-terminal/index.mts";
import { detectFont, readPin, type Pin } from "../font/index.mts";

type StatuslineConfig = Record<string, unknown> & { icons?: unknown };
type UserConfig = Record<string, unknown> & { statusline?: StatuslineConfig };
type IconsPlan = { pin: Pin; changes: readonly Change[]; earlier: readonly Change[] };

const NAME = "terminal";
const ICONS_ID = "statusline-icons";
const WRITERS = {
  "windows-terminal": windowsTerminal,
  "terminal-app": terminalApp,
  konsole,
  ptyxis,
  "gnome-terminal": gnomeTerminal,
} satisfies Record<TerminalId, TerminalWriter>;

function writerFor(id: string | undefined): TerminalWriter | undefined {
  if (id === "other") return manual;
  return id !== undefined && Object.hasOwn(WRITERS, id) ? WRITERS[id as TerminalId] : undefined;
}

function readConfig(path: string): UserConfig {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) ?? {};
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${(err as Error).message}`);
  }
}

function configText(config: UserConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function writeConfig(path: string, config: UserConfig): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, configText(config));
}

function fontApplied(manifest: Manifest, applied: readonly ManifestItem[]): boolean {
  return [...manifest.items, ...applied].some((item) => item.setsFont);
}

function iconsChange(host: Host, manifest: Manifest, { pin, changes, earlier }: IconsPlan): Change[] {
  const path = userConfigPath(host.home);
  if (readConfig(path).statusline?.icons === "nerd") return [];
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
        const config = readConfig(path);
        const statusline = config.statusline ?? {};
        return {
          ...writeTracked(path, configText({ ...config, statusline: { ...statusline, icons: "nerd" } }), backup),
          previous: { ...("icons" in statusline ? { icons: statusline.icons } : {}), hadStatusline: config.statusline !== undefined },
        };
      },
    },
  ];
}

function unapplyIcons(item: ManifestItem): Unapplied {
  const path = item.path as string;
  const previous = item.previous ?? {};
  const config = readConfig(path);
  if (config.statusline?.icons !== "nerd") return { result: "kept", detail: "statusline.icons was changed after setup" };
  const statusline = { ...config.statusline };
  if ("icons" in previous) statusline.icons = previous.icons;
  else delete statusline.icons;
  const next: UserConfig = { ...config, statusline };
  if (!previous.hadStatusline && Object.keys(statusline).length === 0) delete next.statusline;
  writeConfig(path, next);
  return { result: "removed" };
}

export function terminalComponent(pin: Pin = readPin()): Component {
  return {
    name: NAME,
    plan(host, manifest, earlier) {
      const changes = (writerFor(detectTerminal(host.env)) ?? manual).plan(host, manifest, { family: pin.family });
      return [...changes, ...iconsChange(host, manifest, { pin, changes, earlier })];
    },
    unapply(item, host) {
      if (item.id === ICONS_ID) return unapplyIcons(item);
      const name = item.data?.writer as string | undefined;
      const writer = writerFor(name);
      if (!writer) throw new Error(`no terminal writer named ${name}`);
      return writer.unapply(item, host);
    },
  };
}

export const component = terminalComponent();
