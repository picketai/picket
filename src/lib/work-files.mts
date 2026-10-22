import { join } from "node:path";
import { UsageError } from "./action.mjs";
import { WORK_DIR } from "./paths.mjs";

export type WorkId = string & { readonly __brand: "WorkId" };

export const WORK_FILES = [
  "state.yaml",
  "verdicts.jsonl",
  "request.md",
  "story.md",
  "order.md",
  "design.md",
  "research.md",
  "left.jsonl",
  "comments.jsonl",
  "waivers.jsonl",
  "sources.yaml",
  "repos.yaml",
  "mutation.json",
] as const;

export type WorkFile = (typeof WORK_FILES)[number];

export const MARKERS = ["done", "approved", "reviewed", "block.md"] as const;

export type Marker = (typeof MARKERS)[number];

const WORK_ID = /^[a-z0-9][a-z0-9-]{2,80}$/;
const PHASES_DIR = "phases";

export function workId(text: string): WorkId {
  if (!WORK_ID.test(text)) throw new UsageError(`"${text}" is not a work item id: lowercase letters, digits and hyphens, 3 to 81 characters`);
  return text as WorkId;
}

export function workDir(root: string, id: WorkId): string {
  return join(root, WORK_DIR, id);
}

export function workFile(root: string, id: WorkId, name: WorkFile): string {
  return join(workDir(root, id), name);
}

export function phaseMarker(root: string, id: WorkId, n: number, kind: Marker): string {
  return join(workDir(root, id), PHASES_DIR, `${n}.${kind}`);
}

export function workRel(id: WorkId): string {
  return `${WORK_DIR}/${id}/`;
}
