import { readFileSync } from "node:fs";
import { join, posix, win32 } from "node:path";
import { configRel, HOST_DIR, hostRel, pluginRoot, stateRel } from "./paths.mts";

export type BlockSpan = { start: number; end: number };

export const MARKETPLACE = "picketai";

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
    statusLine: { type: "command", command: "picket statusline" },
  },
  plugin: pluginId("picket"),
} as const;

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
