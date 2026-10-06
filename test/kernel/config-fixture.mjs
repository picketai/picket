import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { configPath } from "../../core/lib/paths.mjs";

export function writeConfig(root, config) {
  const file = configPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof config === "string" ? config : JSON.stringify(config));
}
