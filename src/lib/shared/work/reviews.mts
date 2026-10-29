import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BlockHeading, ReviewScope } from "./block.mts";
import { workDir, workRel, type WorkId } from "./files.mts";

export type SavedReviewScope = Exclude<ReviewScope, "pr">;

const REVIEWS_DIR = "reviews";

export function reviewFileName(scope: SavedReviewScope, phase: number | null): string {
  if (scope !== "phase") return `${scope}.md`;
  if (phase === null) throw new Error("a phase review needs a phase number");
  return `phase-${phase}.md`;
}

export function reviewRel(id: WorkId, scope: SavedReviewScope, phase: number | null): string {
  return `${workRel(id)}${REVIEWS_DIR}/${reviewFileName(scope, phase)}`;
}

function savedScope(scope: ReviewScope | null): SavedReviewScope {
  if (scope === null || scope === "pr") throw new Error(`a ${scope ?? "scopeless"} review is not saved under the work item`);
  return scope;
}

export function saveReview(root: string, id: WorkId, heading: Pick<BlockHeading, "scope" | "phase" | "index">, text: string): void {
  const dir = join(workDir(root, id), REVIEWS_DIR);
  const name = reviewFileName(savedScope(heading.scope), heading.phase);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), text.slice(heading.index).replace(/\r\n/g, "\n").trim() + "\n");
}
