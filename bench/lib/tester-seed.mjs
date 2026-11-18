import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixedDateGit } from "./fixture.mjs";

const IMPLEMENTED_AT = "2026-01-01T00:00:00Z";
const BASE_PLACEHOLDER = "{{BASE}}";

function commitImplementation(repo, seedDir, task) {
  cpSync(join(seedDir, "repo"), repo, { recursive: true });
  const git = fixedDateGit(repo, IMPLEMENTED_AT);
  git("add", "-A");
  git("commit", "-q", "-m", `feat: ${task.title}`);
  return git("rev-parse", "HEAD");
}

function placeItem(repo, seedDir, task, base) {
  const item = join(repo, "work", task.item);
  cpSync(join(seedDir, "item"), item, { recursive: true });
  const statePath = join(item, "state.yaml");
  writeFileSync(statePath, readFileSync(statePath, "utf8").replaceAll(BASE_PLACEHOLDER, base));
}

export function seedTesterTask({ repo, task, seedDir, base }) {
  const sha = commitImplementation(repo, seedDir, task);
  placeItem(repo, seedDir, task, base);
  return sha;
}
