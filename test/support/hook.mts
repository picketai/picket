import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import type { TestContext } from "node:test";
import { statePath, STATE_FILES } from "../../src/lib/shared/paths.mts";
import type { Context } from "../../src/lib/shared/context.mts";
import { guardBash } from "../../src/lib/hooks/guard/bash/index.mts";
import { hookContext } from "./context.mts";
import { gitIn } from "./git.mts";
import { openItem, withProject } from "./project.mts";

export const HOOK_BUNDLES = resolve("dist/hooks");

export type DecisionOptions = { root: string; tool?: string; agent?: string; mode?: string; session?: string; cwd?: string; home?: string; env?: NodeJS.ProcessEnv };
export type GuardOutput = { permissionDecision: "allow" | "ask" | "deny"; permissionDecisionReason: string };

export function guardOutput(command: string, { root, tool, agent, mode, session, cwd = root, home, env }: DecisionOptions): GuardOutput | null {
  const event = { hook_event_name: "PreToolUse", tool_name: tool, tool_input: { command }, cwd, agent_type: agent, session_id: session, permission_mode: mode };
  const context = hookContext(root, { ...(home === undefined ? {} : { home }), ...(env === undefined ? {} : { env }) });
  const out = guardBash(event as Parameters<typeof guardBash>[0], { ...context, name: "guard.bash" });
  return out?.hookSpecificOutput ?? null;
}

export function decision(command: string, options: DecisionOptions): GuardOutput["permissionDecision"] | null {
  return guardOutput(command, options)?.permissionDecision ?? null;
}

export type HookRunOptions = { root?: string; env?: NodeJS.ProcessEnv };
export type HookRun = { status: number | null; stdout: string; stderr: string; json: any };

export function runHookBundle(name: string, event: object, { root, env = {} }: HookRunOptions = {}): HookRun {
  const base = root === undefined ? process.env : { ...process.env, CLAUDE_PROJECT_DIR: root };
  const r = spawnSync(process.execPath, [join(HOOK_BUNDLES, `${name}.mjs`)], { input: JSON.stringify(event), encoding: "utf8", env: { ...base, ...env } });
  const stdout = r.stdout ?? "";
  return { status: r.status, stdout, stderr: r.stderr ?? "", json: stdout.trim() ? JSON.parse(stdout) : null };
}

export type LooseHandler = (event: any, context: Context, ...rest: any[]) => any;

export function looseHandler(handler: (...args: any[]) => any): LooseHandler {
  return handler;
}

export type TranscriptEntry = Record<string, unknown>;

export function writeTranscript(root: string, entries: TranscriptEntry[], name = "transcript.jsonl"): string {
  const path = join(root, name);
  const t0 = Date.parse("2026-09-07T10:00:00Z");
  writeFileSync(path, entries.map((e, i) => JSON.stringify({ timestamp: new Date(t0 + i * 1000).toISOString(), ...e })).join("\n") + "\n");
  return path;
}

export const userEntry = (text: string): TranscriptEntry => ({ type: "user", message: { role: "user", content: text } });

export const assistantEntry = (content: unknown[]): TranscriptEntry => ({
  type: "assistant",
  message: { role: "assistant", model: "claude-opus-5", usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 100 }, content },
});

export const assistantText = (text: string): TranscriptEntry => assistantEntry([{ type: "text", text }]);

export const toolUse = (name: string, input: object) => ({ type: "tool_use", id: "t", name, input });

const ORDER_RECORD = "---\nlane: order\nphases:\n  - n: 1\n    files: [src/a.ts]\n---\n# O\n\n## Decisions\n### D-001: Keep it\n**Decision:** x\n\n## Phase 1: A\n\n- **T-1.1** a\n- **T-1.2** b\n- **T-1.3** c\n\n## Revision log\n";

export function hookProject(t: TestContext): { root: string; id: string } {
  const root = withProject(t, { host: true, picket: false });
  gitIn(root, "init", "-q");
  const s = openItem(root, { lane: "order", title: "Csv export" });
  writeFileSync(join(root, "work", s.id, "order.md"), ORDER_RECORD);
  return { root, id: s.id };
}

export function dotDotForms(root: string, rel: string): string[] {
  const forms = [`${root}${sep}${rel.split("/").join(sep)}`, `${root.replaceAll("\\", "/")}/${rel}`, rel];
  return process.platform === "win32" ? [...forms, rel.replaceAll("/", "\\")] : forms;
}

export function climbBackIn(root: string, rel: string): string {
  return `src/../../${basename(root)}/${rel}`;
}

export function ledgerRows(root: string): any[] {
  const path = statePath(root, STATE_FILES.ledger);
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
}
