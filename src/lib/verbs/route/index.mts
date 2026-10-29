import { action, done } from "../../shared/action.mts";
import { route, type RouteInput, type RouteResult } from "../../shared/route/route.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId } from "../../shared/work/files.mts";
import { int, need, str, UsageError, type Args } from "../../util/args.mts";

export { route, type RouteInput, type RouteResult } from "../../shared/route/route.mts";

export const routeVerdict = action<RouteInput, RouteResult>(async (input, ctx) => done(route({ ...input, session: input.session ?? ctx.session }, ctx)));

function parseRoute(args: Args): RouteInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("route needs <id> --verdict <TOKEN> --agent <name>");
  return {
    id: workId(id),
    verdict: need(args, "verdict"),
    agent: need(args, "agent"),
    phase: int(args, "phase"),
    scope: str(args, "scope"),
    through: int(args, "through"),
    reason: str(args, "reason"),
    session: str(args, "session"),
  };
}

function renderRoute(v: RouteResult): string {
  return `${v.verdict} applied (${v.applied.join(", ") || "recorded"}) · next: ${v.next.action} by ${v.next.actor ?? "-"}${v.next.phase ? ` · phase ${v.next.phase}` : ""}`;
}

export const verb: VerbSpec<RouteInput, RouteResult> = {
  usage: "route <id> --verdict <TOKEN> --agent <name> [--phase <n>] [--scope <s>] [--through <n>] [--reason <r>] [--session <id>]",
  output: "json",
  parse: parseRoute,
  run: routeVerdict,
  render: renderRoute,
};
