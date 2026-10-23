import { realpathSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { LEGACY, MODEL_WRITABLE_STATE_FILES, PICKET_DIR, configRel, stateRel } from "../../../shared/paths.mts";
import { sourceRoots, underSource } from "../../../shared/sources/protection.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { wasRead } from "../../../shared/transcript/entries.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { ask, deny, type PermissionOutput } from "../../output.mts";
import { editTarget, type EditTarget } from "../edit-target.mts";

type EditEvent = PayloadOf<"PreToolUse">;

const KERNEL_OWNED_ENTRIES = ["state.yaml", "verdicts.jsonl", "comments.jsonl", "waivers.jsonl", "mutation.json", "left.jsonl", "phases/", "request.md", "story.md", "sources.yaml", "sources/", "repos.yaml"];
const KERNEL_OWNED = new RegExp(`^work/[^/]+/(${KERNEL_OWNED_ENTRIES.map((entry) => entry.replaceAll(".", "\\.")).join("|")})`);
const STATE_PREFIX = `${stateRel("")}/`.toLowerCase();
const MODEL_WRITABLE_STATE: string[] = MODEL_WRITABLE_STATE_FILES.map((name) => stateRel(name).toLowerCase());
const SCRATCH_PREFIX = `${stateRel("scratch")}/`.toLowerCase();
const LEGACY_STATE_PREFIX = `${LEGACY.stateDir}/`;
const EXTENSIONS_PREFIX = `${PICKET_DIR}/extensions/`;
const CONFIG_REL = configRel();
const PREFIX = "guard.scope: ";

function realPath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    const parent = dirname(path);
    return parent === path ? path : join(realPath(parent), basename(path));
  }
}

function samePathCase(rel: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? rel.toLowerCase() : rel;
}

function confirmationReason(rel: string, platform: NodeJS.Platform): string | null {
  const path = samePathCase(rel, platform);
  if (path.startsWith(samePathCase(EXTENSIONS_PREFIX, platform))) return `${rel} is extension content: its text reaches every agent or changes what the kernel loads, so the user confirms each edit`;
  if (path === samePathCase(CONFIG_REL, platform)) return `${rel} changes what the kernel loads (extensions, sources, security paths, commands), so the user confirms each edit`;
  return null;
}

function isHookOnlyState(rel: string): boolean {
  const path = rel.toLowerCase();
  return path.startsWith(STATE_PREFIX) && !path.startsWith(SCRATCH_PREFIX) && !MODEL_WRITABLE_STATE.includes(path);
}

function isLegacyState(rel: string): boolean {
  return rel.toLowerCase().startsWith(LEGACY_STATE_PREFIX.toLowerCase());
}

function editsUnreadFile(event: EditEvent, abs: string): boolean {
  const own = agentTranscript(event);
  return event.tool_name === "Edit" && Boolean(own) && !wasRead(own, abs);
}

function denialReason(event: EditEvent, ctx: HookContext, target: EditTarget, rel: string): string | null {
  if (KERNEL_OWNED.test(samePathCase(rel, ctx.platform))) return `${rel} is kernel-owned; use \`picket open\`, \`picket set\`, \`picket route\`, \`picket comment\`, \`picket waive\` or \`picket source\`, never a direct write`;
  if (isHookOnlyState(rel)) return `${rel} is written by the hooks only`;
  if (isLegacyState(rel)) return `${rel} is under the legacy state folder ${LEGACY_STATE_PREFIX}; only \`picket migrate\` moves files out of it, nothing writes into it`;
  const source = underSource(target.abs, sourceRoots(ctx.root, ctx.env, ctx.platform), ctx.platform);
  if (source) return `${target.filePath} is inside source ${source}, which is read-only; read it through \`picket source\` and the snapshots`;
  if (editsUnreadFile(event, target.abs)) return `read ${rel} with the Read tool before editing it; the file may have changed since you last saw it`;
  return null;
}

export function guardScope(event: EditEvent, ctx: HookContext): PermissionOutput | null {
  const target = editTarget(event, ctx);
  if (!target) return null;
  const rel = relative(realPath(ctx.root), realPath(target.abs)).replaceAll("\\", "/");
  const denial = denialReason(event, ctx, target, rel);
  if (denial) return deny(`${PREFIX}${denial}`);
  const confirm = confirmationReason(rel, ctx.platform);
  return confirm ? ask(`${PREFIX}${confirm}`) : null;
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: async (event, ctx) => guardScope(event, ctx),
};
