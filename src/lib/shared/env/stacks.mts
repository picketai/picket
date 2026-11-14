import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readJson } from "../../util/io.mts";
import { STATE_FILES, statePath } from "../paths.mts";

export type StackEngine = { name: string; program: string; prefix: string[] };
export type StackEntry = { item: string; session: string | null; files: string[]; engine: StackEngine; started: string };
export type Stacks = Record<string, StackEntry>;

function stacksFile(root: string): string {
  return statePath(root, STATE_FILES.envStacks);
}

function writeStacks(root: string, stacks: Stacks): void {
  const path = stacksFile(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(stacks, null, 2)}\n`);
}

export function readStacks(root: string): Stacks {
  return readJson<Stacks>(stacksFile(root)) ?? {};
}

export function recordStack(root: string, stack: string, entry: StackEntry): void {
  writeStacks(root, { ...readStacks(root), [stack]: entry });
}

export function dropStack(root: string, stack: string): void {
  writeStacks(root, Object.fromEntries(Object.entries(readStacks(root)).filter(([name]) => name !== stack)));
}
