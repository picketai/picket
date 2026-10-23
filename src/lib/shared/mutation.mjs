import { existsSync, readFileSync } from "node:fs";
import { projectRoot } from "./paths.mjs";
import { workFile } from "./work/files.mjs";

export function readMutation(id, root = projectRoot()) {
  const file = workFile(root, id, "mutation.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
