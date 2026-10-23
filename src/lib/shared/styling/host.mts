import type { Context } from "../context.mts";
import { spawnProgram, type ProgramResult } from "../../util/process.mts";
import type { Ask, Prompt } from "../../util/prompt.mts";

export type Host = {
  platform: NodeJS.Platform;
  home: string;
  env: NodeJS.ProcessEnv;
  now: () => Date;
  exec: (program: string, args: string[]) => ProgramResult;
  fetch: typeof globalThis.fetch;
  interactive: boolean;
  ask: Ask;
};

export function hostFrom(context: Context, prompt: Prompt): Host {
  return {
    platform: context.platform,
    home: context.home,
    env: context.env,
    now: context.now,
    exec: spawnProgram,
    fetch: globalThis.fetch,
    interactive: prompt.interactive,
    ask: prompt.ask,
  };
}
