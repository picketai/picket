import { appendFileSync, mkdirSync } from "node:fs";
import { bareAgentName } from "../../../shared/agent-name.mts";
import { voidPending } from "../../../shared/data/confirm.mts";
import { maskEnvValues } from "../../../shared/drive-log.mts";
import { stateDir, statePath, STATE_FILES } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { allow, ask, deny, type PermissionOutput } from "../../output.mts";
import { updatedInputOf } from "./escalation.mts";
import { bashDialect } from "./bash.mts";
import { judgeCommand } from "./judge.mts";
import { powerShellDialect } from "./powershell.mts";
import type { GuardContext, Judgement } from "./rules.mts";
import { protectedSources } from "./sources.mts";

export { isLeadOnly, kernelClass, WRAPPING_FLAGS } from "./kernel.mts";

type ToolEvent = PayloadOf<"PreToolUse">;

const TRACED_COMMAND_CHARS = 300;
const POWERSHELL_TOOL = "PowerShell";
const DEFAULT_TOOL = "Bash";

function trace(ctx: HookContext, rawCommand: string, outcome: string, tool: string): void {
  try {
    mkdirSync(stateDir(ctx.root), { recursive: true });
    const row = { ts: ctx.now().toISOString(), outcome, tool, cwd: ctx.cwd, command: maskEnvValues(rawCommand).slice(0, TRACED_COMMAND_CHARS) };
    appendFileSync(statePath(ctx.root, STATE_FILES.guardLog), JSON.stringify(row) + "\n");
  } catch {}
}

function guardContext(input: ToolEvent, ctx: HookContext, tool: string): GuardContext {
  return {
    cwd: typeof input.cwd === "string" ? input.cwd : ctx.cwd,
    root: ctx.root,
    sources: protectedSources(ctx.root, ctx.env, ctx.platform),
    depth: 0,
    escalation: { mode: input.permission_mode ?? null, session: input.session_id ?? null, agent: bareAgentName(input.agent_type), home: ctx.home },
    tool,
    env: ctx.env,
    platform: ctx.platform,
    now: ctx.now,
    evaluate: (command, inner) => judgeCommand(command, inner, bashDialect),
  };
}

function voidSessionConfirmations(session: string | null, ctx: HookContext): string | null {
  if (session === null) return null;
  try {
    voidPending(ctx.root, session, ctx.now());
    return null;
  } catch (error) {
    return `guard.bash: the pending data run confirmations of this session could not be voided, so no command runs until they can: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function permissionOutput(judged: Judgement): PermissionOutput | null {
  const { decision, reason } = judged;
  if (decision === "allow") return allow(reason);
  if (decision === "deny") return deny(reason);
  if (decision === "ask") return ask(reason, updatedInputOf(judged));
  return null;
}

export function guardBash(input: ToolEvent, ctx: HookContext): PermissionOutput | null {
  const tool = input.tool_name ?? DEFAULT_TOOL;
  const rawCommand = input.tool_input?.command;
  if (typeof rawCommand !== "string" || !rawCommand.trim()) {
    trace(ctx, "", "fallthrough:no-command", tool);
    return null;
  }
  const voidFailure = voidSessionConfirmations(input.session_id ?? null, ctx);
  if (voidFailure) {
    trace(ctx, rawCommand, "deny", tool);
    return deny(voidFailure);
  }
  const guardCtx = guardContext(input, ctx, tool);
  const judged = tool === POWERSHELL_TOOL ? judgeCommand(rawCommand, guardCtx, powerShellDialect) : judgeCommand(rawCommand, guardCtx, bashDialect);
  trace(ctx, rawCommand, judged.decision ?? `fallthrough:${judged.reason}`, tool);
  return permissionOutput(judged);
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: async (event, ctx) => guardBash(event, ctx),
};
