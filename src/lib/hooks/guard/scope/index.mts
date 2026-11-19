import { existsSync } from "node:fs";
import { isHookOnlyState, isKernelOwnedWorkPath } from "../../../shared/kernel-records.mts";
import { LEGACY, PICKET_DIR, configRel } from "../../../shared/paths.mts";
import { SCENARIO_DIR } from "../../../shared/env/standard.mts";
import { sourceRoots, underSource } from "../../../shared/sources/protection.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { wasRead } from "../../../shared/transcript/entries.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { ask, deny, type PermissionOutput } from "../../output.mts";
import { editTarget, type EditTarget } from "../edit-target.mts";

type EditEvent = PayloadOf<"PreToolUse">;

const LEGACY_STATE_PREFIX = `${LEGACY.stateDir}/`;
const EXTENSIONS_PREFIX = `${PICKET_DIR}/extensions/`;
const CONFIG_REL = configRel();
const SCENARIO_PREFIX = `${SCENARIO_DIR}/`;
const PREFIX = "guard.scope: ";

function samePathCase(rel: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? rel.toLowerCase() : rel;
}

function confirmationReason(rel: string, platform: NodeJS.Platform): string | null {
  const path = samePathCase(rel, platform);
  if (path.startsWith(samePathCase(EXTENSIONS_PREFIX, platform))) return `${rel} is extension content: its text reaches every agent or changes what the kernel loads, so the user confirms each edit`;
  if (path === samePathCase(CONFIG_REL, platform)) return `${rel} changes what the kernel loads (extensions, sources, security paths, commands), so the user confirms each edit`;
  return null;
}

function isLegacyState(rel: string): boolean {
  return rel.toLowerCase().startsWith(LEGACY_STATE_PREFIX.toLowerCase());
}

function editsUnreadFile(event: EditEvent, abs: string): boolean {
  const changesExisting = event.tool_name === "Edit" || (event.tool_name === "Write" && existsSync(abs));
  if (!changesExisting) return false;
  const own = agentTranscript(event);
  return Boolean(own) && !wasRead(own, abs);
}

function unreadReason(event: EditEvent, rel: string): string {
  if (event.tool_name === "Write") return `${rel} already exists; read it before writing, or the plan's new file is not new`;
  return `read ${rel} with the Read tool before editing it; the file may have changed since you last saw it`;
}

function isSavedScenario(rel: string, platform: NodeJS.Platform): boolean {
  return samePathCase(rel, platform).startsWith(samePathCase(SCENARIO_PREFIX, platform));
}

function denialReason(event: EditEvent, ctx: HookContext, target: EditTarget, rel: string): string | null {
  if (isKernelOwnedWorkPath(samePathCase(rel, ctx.platform))) return `${rel} is kernel-owned; use \`picket open\`, \`picket set\`, \`picket route\`, \`picket comment\`, \`picket waive\` or \`picket source\`, never a direct write`;
  if (isSavedScenario(rel, ctx.platform)) return `${rel} is a saved scenario, written by the kernel: keep one through a declared check the user approves, replace one with replaces; a person edits one by hand outside Claude Code`;
  if (isHookOnlyState(rel)) return `${rel} is written by the hooks only`;
  if (isLegacyState(rel)) return `${rel} is under the legacy state folder ${LEGACY_STATE_PREFIX}; only \`picket migrate\` moves files out of it, nothing writes into it`;
  const source = underSource(target.abs, sourceRoots(ctx.root, ctx.env, ctx.platform), ctx.platform);
  if (source) return `${target.filePath} is inside source ${source}, which is read-only; read it through \`picket source\` and the snapshots`;
  if (editsUnreadFile(event, target.abs)) return unreadReason(event, rel);
  return null;
}

export function guardScope(event: EditEvent, ctx: HookContext): PermissionOutput | null {
  const target = editTarget(event, ctx);
  if (!target) return null;
  const { rel } = target;
  const denial = denialReason(event, ctx, target, rel);
  if (denial) return deny(`${PREFIX}${denial}`);
  const confirm = confirmationReason(rel, ctx.platform);
  return confirm ? ask(`${PREFIX}${confirm}`) : null;
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: async (event, ctx) => guardScope(event, ctx),
};
