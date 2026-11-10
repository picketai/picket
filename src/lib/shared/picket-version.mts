import { readFileSync } from "node:fs";
import { pluginManifestPath } from "./paths.mts";

export function picketVersion(): string {
  return JSON.parse(readFileSync(pluginManifestPath(), "utf8")).version;
}
