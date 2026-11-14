import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readJson } from "../../util/io.mts";
import { STATE_FILES, statePath } from "../paths.mts";
import { workId } from "../work/files.mts";
import { readState } from "../work/state.mts";
import { allowedEngine, composeArgs, fakeEnginePath } from "./engine.mts";

const CLOSED = ["done", "abandoned"];
export const ACTIVE_STATUSES = ["open", "blocked"];

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

export type StackCommand = { program: string; args: string[] };

export function trustedEngine(entry: StackEntry, root: string, fake: string | null): StackEngine | null {
  const { name } = entry.engine;
  if (!allowedEngine(name, root, fake)) return null;
  if (name === "docker" || name === "podman") return { name, program: name, prefix: [] };
  return fake === null ? null : { name, program: process.execPath, prefix: [fake] };
}

export function stopCommand(root: string, stack: string, entry: StackEntry, fake: string | null = fakeEnginePath()): StackCommand | null {
  const engine = trustedEngine(entry, root, fake);
  return engine && { program: engine.program, args: [...engine.prefix, ...composeArgs(root, stack, entry.files, ["stop"])] };
}

export function stacksOfSession(stacks: Stacks, session: string): string[] {
  return Object.keys(stacks).filter((stack) => stacks[stack].session === session);
}

export function stacksOutside(stacks: Stacks, live: Set<string>): string[] {
  return Object.keys(stacks).filter((stack) => {
    const session = stacks[stack].session;
    return session === null || !live.has(session);
  });
}

export function itemStatus(root: string, item: string): string {
  try {
    return readState(root, workId(item)).status;
  } catch {
    return "unknown";
  }
}

export function activeClaim(root: string, stack: string, item: string | null, owner: string | null): string | null {
  if (item === null || item === owner) return null;
  const status = itemStatus(root, item);
  return ACTIVE_STATUSES.includes(status) ? `${stack} belongs to ${item}, which is ${status}; close it first` : null;
}

export function closedStacks(root: string, stacks: Stacks): { stack: string; item: string; status: string }[] {
  return Object.entries(stacks).flatMap(([stack, { item }]) => {
    const status = itemStatus(root, item);
    return CLOSED.includes(status) ? [{ stack, item, status }] : [];
  });
}

export function dropStack(root: string, stack: string): void {
  writeStacks(root, Object.fromEntries(Object.entries(readStacks(root)).filter(([name]) => name !== stack)));
}
