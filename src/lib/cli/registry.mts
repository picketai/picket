import type { VerbSpec } from "../shared/verb-spec.mts";
import type { Command } from "../verbs.mts";

export type SpecModule = { verb: VerbSpec<any, any> };

export const REGISTRY = {
  admit: () => import("../verbs/admit/index.mts"),
  check: () => import("../verbs/check/index.mts"),
  close: () => import("../verbs/close/index.mts"),
  comment: () => import("../verbs/comment/index.mts"),
  cost: () => import("../verbs/cost/index.mts"),
  drive: () => import("../verbs/drive/index.mts"),
  init: () => import("../verbs/init/index.mts"),
  leave: () => import("../verbs/leave/index.mts"),
  list: () => import("../verbs/list/index.mts"),
  migrate: () => import("../verbs/migrate/index.mts"),
  mutate: () => import("../verbs/mutate/index.mts"),
  next: () => import("../verbs/next/index.mts"),
  packet: () => import("../verbs/packet/index.mts"),
  preflight: () => import("../verbs/preflight/index.mts"),
  route: () => import("../verbs/route/index.mts"),
  set: () => import("../verbs/set/index.mts"),
  "source find": () => import("../verbs/source/find.mts"),
  "source grep": () => import("../verbs/source/grep.mts"),
  "source pick": () => import("../verbs/source/pick.mts"),
  "source add": () => import("../verbs/source/add.mts"),
  state: () => import("../verbs/state/index.mts"),
  statusline: () => import("../verbs/statusline/index.mts"),
  verify: () => import("../verbs/verify/index.mts"),
  waive: () => import("../verbs/waive/index.mts"),
} satisfies Record<Command, () => Promise<SpecModule>>;
