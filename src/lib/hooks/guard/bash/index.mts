import { appendFileSync, mkdirSync } from "node:fs";
import { bareAgentName } from "../../../shared/agent-name.mts";
import { maskEnvValues } from "../../../shared/drive-log.mts";
import { stateDir, statePath, STATE_FILES } from "../../../shared/paths.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { allow, ask, deny, type PermissionOutput } from "../../output.mts";
import { bashDialect } from "./bash.mts";
import { judgeCommand } from "./judge.mts";
import { powerShellDialect } from "./powershell.mts";
import type { Decision, GuardContext } from "./rules.mts";
import { protectedSources } from "./sources.mts";

export { isLeadOnly, kernelClass, WRAPPING_FLAGS } from "./kernel.mts";

type ToolEvent = PayloadOf<"PreToolUse">;

const TRACED_COMMAND_CHARS = 300;
const POWERSHELL_TOOL = "PowerShell";
const DEFAULT_TOOL = "Bash";
const PERMISSION: Record<Decision, (reason: string) => PermissionOutput> = { allow, ask, deny };

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

export function guardBash(input: ToolEvent, ctx: HookContext): PermissionOutput | null {
  const tool = input.tool_name ?? DEFAULT_TOOL;
  const rawCommand = input.tool_input?.command;
  if (typeof rawCommand !== "string" || !rawCommand.trim()) {
    trace(ctx, "", "fallthrough:no-command", tool);
    return null;
  }
  const guardCtx = guardContext(input, ctx, tool);
  const { decision, reason } = tool === POWERSHELL_TOOL ? judgeCommand(rawCommand, guardCtx, powerShellDialect) : judgeCommand(rawCommand, guardCtx, bashDialect);
  trace(ctx, rawCommand, decision ?? `fallthrough:${reason}`, tool);
  return decision ? PERMISSION[decision](reason) : null;
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: async (event, ctx) => guardBash(event, ctx),
};
