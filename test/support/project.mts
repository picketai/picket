import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { HOST_DIR, PICKET_DIR } from "../../src/lib/shared/paths.mts";
import { recordBases } from "../../src/lib/shared/repos.mts";
import { createItem, type NewItem, type WorkState } from "../../src/lib/shared/work/state.mts";

export type ProjectOptions = { host?: boolean; picket?: boolean };

export function withProject(t: TestContext, { host = false, picket = true }: ProjectOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), "picket-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (picket) mkdirSync(join(root, PICKET_DIR));
  if (host) mkdirSync(join(root, HOST_DIR));
  return root;
}

export function openItem(root: string, item: NewItem, now: Date = new Date()): WorkState {
  const state = createItem(root, item, now);
  recordBases(root, state.id);
  return state;
}
