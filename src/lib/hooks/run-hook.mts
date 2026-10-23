import { readFileSync } from "node:fs";
import type { HookEvent, HookName } from "../hooks.mts";
import { bareAgentName } from "../shared/agent-name.mts";
import { edgeContext } from "../shared/context.mts";
import { appendLedger } from "../shared/ledger.mts";
import { projectRoot } from "../shared/paths.mts";
import { checkNodeFloor } from "../util/node-floor.mjs";
import type { CommonPayload, HookContext, HookSpec } from "./hook-spec.mts";
import type { HookOutput } from "./output.mts";

const REASON_LIMIT = 300;

type AnyHookSpec = { [E in HookEvent]: HookSpec<E> }[HookEvent];
type Denial = { event: "block" | "bounce"; reason: string };
type OutputShape = { decision?: unknown; reason?: unknown; hookSpecificOutput?: Record<string, unknown> | null };

function readEvent(onBadInput: AnyHookSpec["onBadInput"]): CommonPayload | null {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return onBadInput === "empty" ? {} : null;
  }
}

async function handle(hook: AnyHookSpec, event: CommonPayload, ctx: HookContext): Promise<HookOutput | null> {
  try {
    return await hook.handler(event as never, ctx);
  } catch {
    return null;
  }
}

export function denialOf(output: OutputShape | null | undefined): Denial | null {
  if (output?.decision === "block") return { event: "bounce", reason: String(output.reason ?? "") };
  if (output?.hookSpecificOutput?.permissionDecision === "deny") return { event: "block", reason: String(output.hookSpecificOutput.permissionDecisionReason ?? "") };
  return null;
}

async function recordDenial(ctx: HookContext, event: CommonPayload, output: HookOutput): Promise<void> {
  try {
    const denial = denialOf(output);
    if (denial === null) return;
    const { currentItem } = await import("../shared/work/state.mts");
    const session = event.session_id ?? null;
    appendLedger(ctx.root, {
      event: denial.event,
      session,
      agent: bareAgentName(event.agent_type) ?? "lead",
      hook: ctx.name,
      work_id: currentItem(ctx.root, { session })?.id ?? null,
      reason: String(denial.reason ?? "").slice(0, REASON_LIMIT),
    }, ctx.now());
  } catch {}
}

export async function runHook(name: HookName, hook: AnyHookSpec): Promise<void> {
  const refusal = checkNodeFloor(process.versions.node);
  if (refusal) {
    process.stderr.write(`${refusal}\n`);
    process.exit(0);
  }
  const event = readEvent(hook.onBadInput);
  if (event) {
    const ctx: HookContext = { ...edgeContext(projectRoot(event.cwd)), name };
    const output = await handle(hook, event, ctx);
    if (output) {
      process.stdout.write(JSON.stringify(output));
      await recordDenial(ctx, event, output);
    }
  }
  process.exit(0);
}
