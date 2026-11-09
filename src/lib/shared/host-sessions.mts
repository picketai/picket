import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "../util/io.mts";
import { isProjectSession } from "./live-session.mts";
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

type RegistryRow = { sessionId: string; cwd: unknown };

function registryRow(file: string): RegistryRow | null {
  try {
    const row = readJson<{ sessionId?: unknown; cwd?: unknown }>(file);
    return typeof row?.sessionId === "string" && row.sessionId !== "" ? { sessionId: row.sessionId, cwd: row.cwd } : null;
  } catch {
    return null;
  }
}

export function liveSessionIds(configDir: string, root: string): Set<string> {
  const folder = join(configDir, "sessions");
  const rows = registryFiles(folder).flatMap((name) => registryRow(join(folder, name)) ?? []);
  return new Set(rows.filter(({ cwd }) => isProjectSession(cwd, root)).map(({ sessionId }) => sessionId));
}
