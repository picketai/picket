import { isPrTicketRel, MODEL_WRITABLE_STATE_FILES, stateRel } from "./paths.mts";

const STATE_PREFIX = `${stateRel("")}/`.toLowerCase();
const MODEL_WRITABLE_STATE: string[] = MODEL_WRITABLE_STATE_FILES.map((name) => stateRel(name).toLowerCase());
const SCRATCH_PREFIX = `${stateRel("scratch")}/`.toLowerCase();

export function isHookOnlyState(rel: string): boolean {
  const path = rel.toLowerCase();
  return path.startsWith(STATE_PREFIX) && !path.startsWith(SCRATCH_PREFIX) && !MODEL_WRITABLE_STATE.includes(path) && !isPrTicketRel(rel);
}
