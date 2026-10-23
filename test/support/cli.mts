import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const PICKET_BIN = resolve("dist/bin/picket.mjs");

export type CliOptions = { env?: NodeJS.ProcessEnv; input?: string };
export type CliResult = { status: number | null; stdout: string; stderr: string; json: any };

function parsedOrNull(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function runCli(root: string, args: string[], { env = { ...process.env, CLAUDE_PROJECT_DIR: root }, input }: CliOptions = {}): CliResult {
  const r = spawnSync(process.execPath, [PICKET_BIN, ...args], { cwd: root, env, input, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json: parsedOrNull(r.stdout) };
}
