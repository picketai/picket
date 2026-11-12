import { readFileSync } from "node:fs";
import { join, posix, win32 } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { configRel, HOST_DIR, hostRel, pluginRoot, stateRel } from "./paths.mts";

export type BlockSpan = { start: number; end: number };

export const MARKETPLACE = "picketai";

export const STATUSLINE_FILE = "statusline.mjs";

export function pluginId(plugin: string): string {
  return `${plugin}@${MARKETPLACE}`;
}

export const INSTALL = {
  claudeMd: { file: "CLAUDE.md", start: "# Picket", template: "templates/claude-block.md", projectFacts: "## Project facts" },
  config: { file: configRel(), initial: { version: 1 } },
  gitignore: { file: ".gitignore", line: `${stateRel("")}/` },
  settings: {
    file: hostRel("settings.json"),
    env: { CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1" },
    allow: ["Bash(picket *)", "PowerShell(picket *)", `Read(~/${HOST_DIR}/plugins/cache/${MARKETPLACE}/**)`],
    ask: ["PowerShell(picket drive *)", "PowerShell(picket check *)"],
    statusLine: { type: "command", command: `node "\${CLAUDE_PROJECT_DIR}/${stateRel(STATUSLINE_FILE)}"` },
  },
  plugin: pluginId("picket"),
  marketplace: {
    source: {
      source: "settings",
      name: MARKETPLACE,
      owner: { name: "Vlad Apetre" },
      plugins: [{ name: "picket", source: { source: "npm", package: "@picketai/picket", version: "alpha" } }],
    },
    autoUpdate: true,
  },
} as const;

export const DATA_FOLDER_STATUS_LINE = { type: "command", command: `node "$HOME/${HOST_DIR}/plugins/data/picket-picketai/${STATUSLINE_FILE}"` } as const;

export const LEGACY_STATUS_LINE = { type: "command", command: "picket statusline" } as const;

const PICKET_STATUS_LINES: readonly unknown[] = [INSTALL.settings.statusLine, DATA_FOLDER_STATUS_LINE, LEGACY_STATUS_LINE];

export function isPicketStatusLine(value: unknown): boolean {
  return PICKET_STATUS_LINES.some((statusLine) => isDeepStrictEqual(value, statusLine));
}

export function userSettingsPath(home: string): string {
  return join(home, HOST_DIR, "settings.json");
}

export type SettingsFile = "local" | "user";

export function isStyleStatusLine(value: unknown, file: SettingsFile): boolean {
  return file === "user" && isDeepStrictEqual(value, DATA_FOLDER_STATUS_LINE);
}

export function isOldPicketStatusLine(value: unknown, file: SettingsFile): boolean {
  return isPicketStatusLine(value) && !isStyleStatusLine(value, file);
}

function statusLineIn(path: string): unknown {
  try {
    const settings: unknown = JSON.parse(readFileSync(path, "utf8"));
    return settings !== null && typeof settings === "object" ? (settings as { statusLine?: unknown }).statusLine : undefined;
  } catch {
    return undefined;
  }
}

export function holdsPicketStatusLine(path: string, file: SettingsFile): boolean {
  return isOldPicketStatusLine(statusLineIn(path), file);
}

export function oldStatusLineNote(path: string): string {
  return `remove the statusLine entry from ${path}: it holds an old Picket status line`;
}

const HEADING = /^#{1,6} /;
const { claudeMd } = INSTALL;

function lf(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function readTemplate(): string {
  return lf(readFileSync(join(pluginRoot(), claudeMd.template), "utf8"));
}

function templateHeadings(template: string): Set<string> {
  return new Set(template.split("\n").filter((line) => HEADING.test(line)));
}

export function claudeBlockSpan(lines: readonly string[], template: string): BlockSpan | null {
  const start = lines.indexOf(claudeMd.start);
  if (start === -1) return null;
  const own = templateHeadings(template);
  let end = start + 1;
  while (end < lines.length && !(HEADING.test(lines[end]) && !own.has(lines[end]))) end++;
  return { start, end };
}

function comparable(path: string, platform: NodeJS.Platform): string {
  const resolved = (platform === "win32" ? win32 : posix).resolve(path).replaceAll("\\", "/").replace(/\/$/, "");
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isHomeFolder(root: string, home: string, platform: NodeJS.Platform): boolean {
  return comparable(root, platform) === comparable(home, platform);
}
