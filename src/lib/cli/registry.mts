import type { VerbSpec } from "../shared/verb-spec.mts";
import type { Command } from "../verbs.mts";

export type SpecModule = { verb: VerbSpec<any, any> };

export const REGISTRY = {
  admit: () => import("../verbs/admit/index.mts"),
  cost: () => import("../verbs/cost/index.mts"),
  leave: () => import("../verbs/leave/index.mts"),
  list: () => import("../verbs/list/index.mts"),
  next: () => import("../verbs/next/index.mts"),
  packet: () => import("../verbs/packet/index.mts"),
  preflight: () => import("../verbs/preflight/index.mts"),
  state: () => import("../verbs/state/index.mts"),
  verify: () => import("../verbs/verify/index.mts"),
} satisfies Record<Command, () => Promise<SpecModule>>;
