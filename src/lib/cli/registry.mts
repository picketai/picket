import type { VerbSpec } from "../shared/verb-spec.mts";
import type { Command } from "../verbs.mts";

export type SpecModule = { verb: VerbSpec<any, any> };

export const REGISTRY = {
  leave: () => import("../verbs/leave/index.mts"),
} satisfies Record<Command, () => Promise<SpecModule>>;
