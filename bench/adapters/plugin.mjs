import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as rework from "./rework.mjs";

export const name = "plugin";

export const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "spike", "tether-full");

export function install(repo, harnessRoot) {
  if (!existsSync(join(pluginDir, ".claude-plugin", "plugin.json"))) throw new Error(`plugin not built: ${pluginDir}`);
  if (!existsSync(join(harnessRoot, ".claude", "bin", "harness.mjs"))) throw new Error(`not a harness root: ${harnessRoot}`);
  cpSync(join(harnessRoot, "CLAUDE.md"), join(repo, "CLAUDE.md"));
  const hostDir = join(harnessRoot, ".claude");
  cpSync(join(hostDir, "rules"), join(repo, ".claude", "rules"), { recursive: true, filter: (src) => !rework.isRepositoryOnly(src, hostDir) });
  cpSync(join(harnessRoot, ".claude", "harness.json"), join(repo, ".claude", "harness.json"));
  mkdirSync(join(repo, "work"), { recursive: true });
  const settings = JSON.parse(readFileSync(join(harnessRoot, ".claude", "settings.json"), "utf8"));
  delete settings.hooks;
  delete settings.outputStyle;
  writeFileSync(join(repo, ".claude", "settings.json"), JSON.stringify(settings, null, 2));
  rmSync(join(repo, ".claude", "settings.local.json"), { force: true });
}

export const gate = rework.gate;
export const signals = rework.signals;
export const reportFiles = rework.reportFiles;
export const allowedTools = rework.allowedTools;
