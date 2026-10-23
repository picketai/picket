import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { HOST_DIR } from "../../../paths.mts";
import type { Change, Component } from "../../change.mts";
import type { Host } from "../../host.mts";
import { writeTracked, type ManifestItem, type Unapplied } from "../../manifest.mts";

type Settings = Record<string, unknown> & { statusLine?: unknown };

export const STATUS_LINE = { type: "command", command: "picket statusline" };

const NAME = "statusline";

function settingsPath(host: Host): string {
  return join(host.home, HOST_DIR, "settings.json");
}

function readSettings(path: string): Settings {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${(err as Error).message}`);
  }
}

function settingsText(settings: Settings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}

function writeSettings(path: string, settings: Settings): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, settingsText(settings));
}

function describe(statusLine: unknown): string {
  const command = (statusLine as { command?: unknown } | null)?.command;
  return typeof command === "string" ? command : JSON.stringify(statusLine);
}

function plan(host: Host): Change[] {
  const path = settingsPath(host);
  const current = readSettings(path).statusLine;
  if (isDeepStrictEqual(current, STATUS_LINE)) return [];
  const replacing = current !== undefined;
  return [
    {
      id: NAME,
      summary: `set statusLine to "${STATUS_LINE.command}" in ${path}`,
      ...(replacing ? { question: `Replace your status line "${describe(current)}" with Picket's?` } : {}),
      restart: null,
      apply(_host, { backup }) {
        const settings = readSettings(path);
        return {
          ...writeTracked(path, settingsText({ ...settings, statusLine: STATUS_LINE }), backup),
          previous: replacing ? { statusLine: current } : {},
        };
      },
    },
  ];
}

function unapply(item: ManifestItem): Unapplied {
  const path = item.path as string;
  const previous = item.previous ?? {};
  const settings = readSettings(path);
  if (!isDeepStrictEqual(settings.statusLine, STATUS_LINE)) {
    return { result: "kept", detail: "statusLine was changed after setup", manual: `check statusLine in ${path}` };
  }
  const restored = { ...settings };
  if ("statusLine" in previous) restored.statusLine = previous.statusLine;
  else delete restored.statusLine;
  writeSettings(path, restored);
  return { result: "removed" };
}

export const component: Component = { name: NAME, plan, unapply };
