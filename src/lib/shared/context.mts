import { homedir } from "node:os";

export type Context = { root: string; cwd: string; now: () => Date; env: NodeJS.ProcessEnv; home: string; session: string | null; platform: NodeJS.Platform };

export function edgeContext(root: string): Context {
  return {
    root,
    cwd: process.cwd(),
    now: () => new Date(),
    env: process.env,
    home: homedir(),
    session: process.env.CLAUDE_CODE_SESSION_ID ?? null,
    platform: process.platform,
  };
}
