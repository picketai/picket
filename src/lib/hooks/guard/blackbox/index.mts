import { isAbsolute, resolve } from "node:path";
import { bareAgentName } from "../../../shared/agent-name.mts";
import { phasePaths, type ArtifactPhase } from "../../../shared/work/artifact.mts";
import { blockFiles, fixesFiles } from "../../../shared/work/block.mts";
import { agentTranscript } from "../../../shared/transcript/agent.mts";
import { latestHints } from "../../../shared/transcript/entries.mts";
import { isWorkId, workRel, type WorkId } from "../../../shared/work/files.mts";
import { readSnapshot } from "../../../shared/work/snapshot.mts";
import type { HookContext, HookSpec, PayloadOf } from "../../hook-spec.mts";
import { deny, type PermissionOutput } from "../../output.mts";
import { realPath } from "../edit-target.mts";

type ToolEvent = PayloadOf<"PreToolUse">;
type Fence = { root: string; denied: string[]; allowed: string[] };

const TESTER = "tester";
const TEST_FOLDER = "test/";
const PREFIX = "guard.blackbox: ";
const NO_ITEM = `${PREFIX}the tester's send names no work item, so every read is refused`;

function comparable(path: string, platform: NodeJS.Platform): string {
  const forward = realPath(path).replaceAll("\\", "/").replace(/\/+$/, "");
  return platform === "win32" ? forward.toLowerCase() : forward;
}

function holds(folder: string, path: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

function ownedPaths(root: string, id: WorkId, phases: readonly ArtifactPhase[]): string[] {
  return phases.flatMap((phase) => [...phasePaths(phase), ...blockFiles(root, id, phase.n), ...fixesFiles(root, id, phase.n)]);
}

function itemFence(ctx: HookContext, id: WorkId): Fence {
  const snap = readSnapshot(ctx.root, id);
  const worktrees = snap.layout.repos.flatMap((repo) => (repo.worktree === undefined ? [] : [repo.worktree]));
  const owned = [...ownedPaths(ctx.root, id, snap.phases), workRel(id), ...worktrees];
  const absolute = (rel: string) => comparable(resolve(ctx.root, rel), ctx.platform);
  return { root: comparable(ctx.root, ctx.platform), denied: owned.map(absolute), allowed: [absolute(`${workRel(id)}${TEST_FOLDER}`)] };
}

function readableFence(ctx: HookContext, id: WorkId): Fence | null {
  try {
    return itemFence(ctx, id);
  } catch {
    return null;
  }
}

function toolTarget(event: ToolEvent, ctx: HookContext): string {
  const input = event.tool_input ?? {};
  const given = event.tool_name === "Grep" ? input.path : input.file_path;
  const base = typeof event.cwd === "string" ? event.cwd : ctx.root;
  if (typeof given !== "string" || given === "") return base;
  return isAbsolute(given) ? given : resolve(base, given);
}

function deniedHit(fence: Fence, target: string, isGrep: boolean): string | null {
  if (fence.allowed.some((folder) => holds(folder, target))) return null;
  const inside = fence.denied.find((owned) => holds(owned, target));
  if (inside !== undefined) return target;
  return isGrep ? (fence.denied.find((owned) => holds(target, owned)) ?? null) : null;
}

function shown(fence: Fence, path: string): string {
  return holds(fence.root, path) ? path.slice(fence.root.length + 1) || "." : path;
}

export function blackboxDenial(event: ToolEvent, ctx: HookContext): string | null {
  if (bareAgentName(event.agent_type) !== TESTER) return null;
  const id = latestHints(agentTranscript(event)).work_id;
  if (id === null || !isWorkId(id)) return NO_ITEM;
  const fence = readableFence(ctx, id);
  if (fence === null) return `${PREFIX}${id} cannot be read, so every read is refused`;
  const hit = deniedHit(fence, comparable(toolTarget(event, ctx), ctx.platform), event.tool_name === "Grep");
  if (hit === null) return null;
  return `${PREFIX}${shown(fence, hit)} is part of the change under test; the tester is a black box and reads the brief, the request and unchanged files only`;
}

export function guardBlackbox(event: ToolEvent, ctx: HookContext): PermissionOutput | null {
  const denial = blackboxDenial(event, ctx);
  return denial === null ? null : deny(denial);
}

export const hook: HookSpec<"PreToolUse"> = {
  handler: async (event, ctx) => guardBlackbox(event, ctx),
};
