import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config.mjs";
import type { Lane } from "../work/state.mts";
import { laneOf, NO_LANE, PENDING, type Admission, type LaneCaps } from "./lane.mts";
import { mentionedPaths, signalsOf } from "./signals.mts";

type AdmitConfig = { security_paths: string[]; lanes: LaneCaps };
type ChangeLane = Exclude<Lane, "research"> | typeof PENDING;

const CHANGE_LANE_RANK: Readonly<Record<ChangeLane, number>> = { [PENDING]: 0, fast: 0, order: 1, design: 2 };

export function overridesAdmission(asked: Lane, admitted: Admission["lane"]): boolean {
  if (admitted === NO_LANE) return true;
  if (asked === "research" || admitted === "research") return asked !== admitted;
  return CHANGE_LANE_RANK[asked] < CHANGE_LANE_RANK[admitted];
}

export function admit(root: string, text: string, touched: string[] = []): Admission {
  const config = loadConfig(root) as unknown as AdmitConfig;
  const exists = (path: string) => existsSync(join(root, path));
  return laneOf(signalsOf(text, mentionedPaths(text, exists), touched, config.security_paths), config.lanes);
}
