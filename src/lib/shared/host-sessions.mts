import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "../util/io.mts";
import { HOST_DIR } from "./paths.mts";

export function hostConfigDir(env: NodeJS.ProcessEnv, home: string): string {
  return env.CLAUDE_CONFIG_DIR || join(home, HOST_DIR);
}

function registryFiles(folder: string): string[] {
  try {
    return readdirSync(folder).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
}

function sessionIdIn(file: string): string | null {
  try {
    const row = readJson<{ sessionId?: unknown }>(file);
    return typeof row?.sessionId === "string" && row.sessionId !== "" ? row.sessionId : null;
  } catch {
    return null;
  }
}

export function liveSessionIds(configDir: string): Set<string> {
  const folder = join(configDir, "sessions");
  return new Set(registryFiles(folder).flatMap((name) => sessionIdIn(join(folder, name)) ?? []));
}
