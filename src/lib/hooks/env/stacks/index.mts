import { spawn as spawnProcess, type SpawnOptions } from "node:child_process";
import { closedStacks, readStacks, stacksOfSession, stacksOutside, stopCommand, type Stacks } from "../../../shared/env/stacks.mts";
import { hostConfigDir, liveSessionIds } from "../../../shared/host-sessions.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { context, type ContextOutput } from "../../output.mts";

type StacksEvent = "SessionStart" | "SessionEnd";
export type Spawn = (command: string, args: string[], options: SpawnOptions) => void;

const KEPT_ON = new Set(["clear", "resume"]);
const STARTUP = "startup";

function startDetached(command: string, args: string[], options: SpawnOptions): void {
  const child = spawnProcess(command, args, options);
  child.on("error", () => {});
  child.unref();
}

function stopAll(root: string, stacks: Stacks, names: string[], spawn: Spawn): void {
  for (const stack of names) {
    const command = stopCommand(root, stack, stacks[stack]);
    if (command) spawn(command.program, command.args, { detached: true, stdio: "ignore", windowsHide: true });
  }
}

function closedLines(root: string, stacks: Stacks): string[] {
  return closedStacks(root, stacks).map(({ stack, item, status }) => `${stack}: item ${item} is ${status}; run picket env purge ${stack}`);
}

export function envStacks(event: PayloadOf<StacksEvent>, { root, env, home }: HookContext, spawn: Spawn = startDetached): ContextOutput | null {
  const stacks = readStacks(root);
  if (Object.keys(stacks).length === 0) return null;
  if (event.hook_event_name === "SessionEnd") {
    if (!KEPT_ON.has(event.reason ?? "") && event.session_id) stopAll(root, stacks, stacksOfSession(stacks, event.session_id), spawn);
    return null;
  }
  if (event.source !== STARTUP) return null;
  stopAll(root, stacks, stacksOutside(stacks, liveSessionIds(hostConfigDir(env, home), root)), spawn);
  const lines = closedLines(root, stacks);
  return lines.length ? context("SessionStart", `# Test environment\n${lines.join("\n")}`) : null;
}

export const hook: HookSpec<StacksEvent> = {
  handler: async (event, ctx) => envStacks(event, ctx),
  onBadInput: "empty",
};
