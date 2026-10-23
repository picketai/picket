import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { workingState, type WorkingState } from "../../shared/git.mts";
import { userConfigPath } from "../../shared/paths.mts";
import { toolUses } from "../../shared/transcript/entries.mts";
import { entriesFromEnd, TAIL_WINDOWS } from "../../shared/transcript/tail.mts";
import { readJson } from "../../util/io.mts";
import type { IconMode } from "./layout.mts";

export type Probe = { git(dir: string): WorkingState | null; skill(path: string | undefined): string | null };
export type ProbeOptions = { cacheDir: string; now: number; readGit?: (dir: string) => WorkingState | null; readSkill?: (path: string) => string | null };

type Cached = { value: unknown; at?: number; size?: number };

const GIT_REUSE_MS = 5_000;
const SKILL_CALL = '"name":"Skill"';
const SKILL_BYTES = TAIL_WINDOWS[1];

export function lastSkill(path: string | undefined, maxBytes: number = SKILL_BYTES): string | null {
  for (const entry of entriesFromEnd(path, { maxBytes, contains: SKILL_CALL })) {
    const skill = toolUses(entry).filter((use) => use.name === "Skill").at(-1)?.input?.skill;
    if (skill !== undefined && skill !== null) return skill as string;
  }
  return null;
}

export function iconsMode(home: string): IconMode {
  try {
    const config = readJson<{ statusline?: { icons?: unknown } } | null>(userConfigPath(home));
    return config?.statusline?.icons === "nerd" ? "nerd" : "plain";
  } catch {
    return "plain";
  }
}

function cacheFile(cacheDir: string, kind: string, key: string): string {
  return join(cacheDir, `${kind}-${createHash("sha1").update(key).digest("hex").slice(0, 16)}.json`);
}

function readCache(file: string): Cached | null {
  try {
    const cached = JSON.parse(readFileSync(file, "utf8"));
    return cached !== null && typeof cached === "object" && "value" in cached ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(file: string, cached: Cached): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(cached));
  } catch {}
}

function sizeOf(path: string | undefined): number | null {
  try {
    return typeof path === "string" ? statSync(path).size : null;
  } catch {
    return null;
  }
}

export function liveProbe({ cacheDir, now, readGit = workingState, readSkill = lastSkill }: ProbeOptions): Probe {
  return {
    git(dir) {
      const file = cacheFile(cacheDir, "git", resolve(dir));
      const cached = readCache(file);
      const age = cached === null ? -1 : now - (cached.at as number);
      if (cached !== null && age >= 0 && age < GIT_REUSE_MS) return cached.value as WorkingState | null;
      const value = readGit(dir);
      writeCache(file, { at: now, value });
      return value;
    },
    skill(path) {
      const size = sizeOf(path);
      if (size === null) return null;
      const file = cacheFile(cacheDir, "skill", resolve(path as string));
      const cached = readCache(file);
      if (cached !== null && cached.size === size) return cached.value as string | null;
      const value = readSkill(path as string);
      writeCache(file, { size, value });
      return value;
    },
  };
}

export const directProbe: Probe = { git: workingState, skill: (path) => lastSkill(path) };
