import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, workDir } from "./work/work.mjs";

export function readMutation(id, root = projectRoot()) {
  const file = join(workDir(id, root), "mutation.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
