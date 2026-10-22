import { homedir } from "node:os";

export type Context = { root: string; now: () => Date; env: NodeJS.ProcessEnv; home: string; session: string | null };

export function edgeContext(root: string): Context {
  return { root, now: () => new Date(), env: process.env, home: homedir(), session: process.env.CLAUDE_CODE_SESSION_ID ?? null };
}
