import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";
import { HOST_DIR, PICKET_DIR, configPath } from "../../src/lib/shared/paths.mts";
import { recordBases } from "../../src/lib/shared/repos.mts";
import { workDir, type WorkId } from "../../src/lib/shared/work/files.mts";
import { createItem, type NewItem, type WorkState } from "../../src/lib/shared/work/state.mts";

export type ProjectOptions = { host?: boolean; picket?: boolean; base?: string };

export function withProject(t: TestContext, { host = false, picket = true, base = tmpdir() }: ProjectOptions = {}): string {
  const root = mkdtempSync(join(base, "picket-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true, maxRetries: 40, retryDelay: 200 }));
  if (picket) mkdirSync(join(root, PICKET_DIR));
  if (host) mkdirSync(join(root, HOST_DIR));
  return root;
}

export function openItem(root: string, item: NewItem, now: Date = new Date()): WorkState {
  const state = createItem(root, item, now);
  recordBases(root, state.id);
  return state;
}

export function writeArtifact(root: string, id: WorkId, name: string, text: string): string {
  const file = join(workDir(root, id), name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}

export function writeConfig(root: string, config: string | object): void {
  const file = configPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, typeof config === "string" ? config : JSON.stringify(config));
}
