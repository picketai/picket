import { homedir } from "node:os";
import type { Context } from "../../src/lib/shared/context.mts";

export const FIXED_NOW = "2026-10-23T10:00:00.000Z";

export type FixedContextOptions = Partial<Omit<Context, "root" | "now">> & { now?: string | Date };

export function fixedContext(root: string, { now = FIXED_NOW, env = {}, session = null, home = root, cwd = root, platform = process.platform }: FixedContextOptions = {}): Context {
  const at = new Date(now);
  return { root, cwd, now: () => new Date(at), env, home, session, platform };
}

export function hookContext(root: string, overrides: FixedContextOptions = {}): Context {
  return fixedContext(root, { env: process.env, cwd: process.cwd(), home: homedir(), now: new Date(), ...overrides });
}
