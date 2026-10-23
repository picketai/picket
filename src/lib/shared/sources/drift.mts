import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gitRead } from "../../util/git.mts";
import type { WorkId } from "../work/files.mts";
import { readIntake } from "./intake.mts";
import { contentHash, SOURCE_MAX_BUFFER } from "./places.mts";
import type { AmbiguousRef, ResolvedRef } from "./resolve.mts";
import type { Source } from "./source.mts";

export type Drift = { ref: string; snapshot_sha256: string; live_sha256: string | null; moved: boolean; reason?: string };

type Live = { bytes: Uint8Array } | { reason: string };

function liveBytes(rec: ResolvedRef, source: Source | undefined): Live {
  if (rec.worktree) {
    if (!existsSync(rec.worktree)) return { reason: `worktree ${rec.worktree} no longer exists` };
    const file = join(rec.worktree, rec.path);
    return existsSync(file) ? { bytes: readFileSync(file) } : { reason: `${rec.path} no longer exists in ${rec.worktree}` };
  }
  if (!source?.root) return { reason: `source ${rec.source} is unreachable${source?.reason ? `: ${source.reason}` : ""}` };
  if (!gitRead(source.root, ["rev-parse", "--verify", "--quiet", `refs/heads/${rec.branch}`])) return { reason: `branch ${rec.branch} no longer exists` };
  const bytes = gitRead(source.root, ["cat-file", "blob", `${rec.branch}:${rec.path}`], { maxBuffer: SOURCE_MAX_BUFFER, buffer: true });
  return bytes ? { bytes } : { reason: `${rec.path} no longer exists on ${rec.branch}` };
}

function driftOf(rec: ResolvedRef, source: Source | undefined): Drift {
  const live = liveBytes(rec, source);
  const liveSha = "bytes" in live ? contentHash(live.bytes) : null;
  return { ref: rec.ref, snapshot_sha256: rec.sha256, live_sha256: liveSha, moved: liveSha !== rec.sha256, ...("reason" in live ? { reason: live.reason } : {}) };
}

function isResolved(ref: ResolvedRef | AmbiguousRef): ref is ResolvedRef {
  return ref.status === "resolved";
}

export function liveDrift(root: string, id: WorkId, sources: readonly Source[]): Drift[] {
  return (readIntake(root, id)?.refs ?? []).filter(isResolved).map((rec) => driftOf(rec, sources.find((s) => s.name === rec.source)));
}
