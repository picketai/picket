import { isPrTicketRel, MODEL_WRITABLE_STATE_FILES, stateRel } from "./paths.mts";

export const KERNEL_OWNED_ENTRIES = ["state.yaml", "verdicts.jsonl", "comments.jsonl", "waivers.jsonl", "mutation.json", "left.jsonl", "phases/", "request.md", "story.md", "sources.yaml", "sources/", "repos.yaml", "test/", "test.md"];
const KERNEL_OWNED = new RegExp(`^work/[^/]+/(${KERNEL_OWNED_ENTRIES.map((entry) => entry.replaceAll(".", "\\.")).join("|")})`);
const STATE_PREFIX = `${stateRel("")}/`.toLowerCase();
const MODEL_WRITABLE_STATE: string[] = MODEL_WRITABLE_STATE_FILES.map((name) => stateRel(name).toLowerCase());
const SCRATCH_PREFIX = `${stateRel("scratch")}/`.toLowerCase();

export function isKernelOwnedWorkPath(rel: string): boolean {
  return KERNEL_OWNED.test(rel);
}

export function isHookOnlyState(rel: string): boolean {
  const path = rel.toLowerCase();
  return path.startsWith(STATE_PREFIX) && !path.startsWith(SCRATCH_PREFIX) && !MODEL_WRITABLE_STATE.includes(path) && !isPrTicketRel(rel);
}
