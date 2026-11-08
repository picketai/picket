import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pluginRoot } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";

export const STATUSLINE_FILE = "statusline.mjs";

function sameBytes(source: Buffer, target: string): boolean {
  return existsSync(target) && readFileSync(target).equals(source);
}

export function copyStatusline(source: string, dataDir: string, pid: number = process.pid): void {
  if (!existsSync(source)) return;
  const bytes = readFileSync(source);
  const target = join(dataDir, STATUSLINE_FILE);
  if (sameBytes(bytes, target)) return;
  mkdirSync(dataDir, { recursive: true });
  const temporary = join(dataDir, `${STATUSLINE_FILE}.${pid}.tmp`);
  try {
    writeFileSync(temporary, bytes);
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function emitStatusline(_event: PayloadOf<"SessionStart">, { env }: HookContext, source: () => string = () => join(pluginRoot(), STATUSLINE_FILE)): null {
  const dataDir = env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) return null;
  try {
    copyStatusline(source(), dataDir);
  } catch {}
  return null;
}

export const hook: HookSpec<"SessionStart"> = {
  handler: async (event, ctx) => emitStatusline(event, ctx),
};
