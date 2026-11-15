import { ticketKey } from "../checkouts.mts";
import { instanceTag } from "../work/send.mts";
import type { WorkState } from "../work/state.mts";

export const LABEL_PREFIX = "io.github.picketai.";
export const ROLE_LABEL = `${LABEL_PREFIX}role`;
export const ITEM_LABEL = `${LABEL_PREFIX}item`;
export const ROLES = ["app", "dependency", "mock", "data", "seed"] as const;
export type Role = (typeof ROLES)[number];
export const LONG_RUNNING: readonly Role[] = ["app", "dependency", "mock"];
export const DATA_PROFILE = "picket-data";
export const X_PICKET = "x-picket";
export const ENV_DIR = ".picket/env";
export const COMPOSE_FILE = "compose.yaml";
export const SCENARIO_DIR = `${ENV_DIR}/scenarios`;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function itemKey(state: Pick<WorkState, "id" | "source">): string {
  return ticketKey(state.source)?.toLowerCase() ?? instanceTag(state.id);
}

export function stackName(key: string): string {
  return `picket-${key}`;
}

export function imageName(service: string, key: string, version: string): string {
  return `picket/${service}-${key}:${version}`.toLowerCase();
}

export function urlVariable(service: string): string {
  return `PICKET_URL_${service.toUpperCase().replace(/[-.]/g, "_")}`;
}
