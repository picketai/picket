import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { STATUS_LINE } from "../init.mjs";
import { HOST_DIR } from "../paths.mjs";
import { installedAt, sha256File } from "./manifest.mjs";

const NAME = "statusline";

function settingsPath(host) {
  return join(host.home, HOST_DIR, "settings.json");
}

function readSettings(path) {
  const text = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (text === null) return { text, settings: {} };
  try {
    return { text, settings: JSON.parse(text) };
  } catch (err) {
    throw new Error(`${path} is not valid JSON, left as is: ${err.message}`);
  }
}

function writeSettings(path, settings) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

function describe(statusLine) {
  return typeof statusLine?.command === "string" ? statusLine.command : JSON.stringify(statusLine);
}

function plan(host) {
  const path = settingsPath(host);
  const current = readSettings(path).settings.statusLine;
  if (isDeepStrictEqual(current, STATUS_LINE)) return [];
  const replacing = current !== undefined;
  return [
    {
      id: NAME,
      summary: `set statusLine to "${STATUS_LINE.command}" in ${path}`,
      ...(replacing ? { question: `Replace your status line "${describe(current)}" with Picket's?` } : {}),
      restart: null,
      apply(host, backup) {
        const { text, settings } = readSettings(path);
        const backupPath = text === null ? undefined : backup(path);
        writeSettings(path, { ...settings, statusLine: STATUS_LINE });
        return {
          id: NAME,
          component: NAME,
          kind: text === null ? "created" : "edited",
          path,
          ...(backupPath ? { backup: backupPath } : {}),
          sha256: sha256File(path),
          previous: replacing ? { statusLine: current } : {},
          installedAt: installedAt(host),
        };
      },
    },
  ];
}

function unapply(item, host) {
  const { settings } = readSettings(item.path);
  if (!isDeepStrictEqual(settings.statusLine, STATUS_LINE)) {
    return { result: "kept", detail: "statusLine was changed after setup", manual: `check statusLine in ${item.path}` };
  }
  const restored = { ...settings };
  if ("statusLine" in item.previous) restored.statusLine = item.previous.statusLine;
  else delete restored.statusLine;
  writeSettings(item.path, restored);
  return { result: "removed" };
}

export const statuslineSetting = { name: NAME, plan, unapply };
