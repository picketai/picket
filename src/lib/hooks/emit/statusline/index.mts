import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STATUSLINE_FILE } from "../../../shared/install.mts";
import { configPath, pluginRoot, stateDir } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";

function sameBytes(source: Buffer, target: string): boolean {
  return existsSync(target) && readFileSync(target).equals(source);
}

export function copyStatusline(source: string, folder: string, pid: number = process.pid): void {
  if (!existsSync(source)) return;
  const bytes = readFileSync(source);
  const target = join(folder, STATUSLINE_FILE);
  if (sameBytes(bytes, target)) return;
  mkdirSync(folder, { recursive: true });
  const temporary = join(folder, `${STATUSLINE_FILE}.${pid}.tmp`);
  try {
    writeFileSync(temporary, bytes);
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function copyFolders(root: string, env: HookContext["env"]): string[] {
  const project = existsSync(configPath(root)) ? [stateDir(root)] : [];
  const dataFolder = env.CLAUDE_PLUGIN_DATA;
  return dataFolder ? [...project, dataFolder] : project;
}

export function emitStatusline(_event: PayloadOf<"SessionStart">, { root, env }: HookContext, source: () => string = () => join(pluginRoot(), STATUSLINE_FILE)): null {
  for (const folder of copyFolders(root, env)) {
    try {
      copyStatusline(source(), folder);
    } catch {}
  }
  return null;
}

export const hook: HookSpec<"SessionStart"> = {
  handler: async (event, ctx) => emitStatusline(event, ctx),
};
