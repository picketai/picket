import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { latest, readNext, type LatestView, type NextView } from "../../shared/work/next-view.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";

export type NextInput = { id: WorkId } | { latest: true; session: string | undefined };

export const showNext = action<NextInput, NextView | LatestView>(async (input, { root }) => {
  if ("id" in input) return done(readNext(root, input.id));
  return done(latest(root, { session: input.session }));
});

function parseNext(args: Args): NextInput {
  const [id] = args.pos;
  if (id) return { id: workId(id) };
  if (!flag(args, "latest")) throw new UsageError("next needs <id> or --latest");
  return { latest: true, session: str(args, "session") };
}

function isLatest(step: NextView | LatestView): step is LatestView {
  return step.id === null || "other_session" in step;
}

function renderLatest(v: LatestView): string {
  if (!v.id) return "(no open work item)";
  return `${v.id}: ${v.action} · ${v.actor ?? "-"} · ${v.detail}${v.other_session ? " (other session)" : ""}`;
}

function renderStep(v: NextView): string {
  return `${v.action} · ${v.actor ?? "-"}${v.phase ? ` · phase ${v.phase}` : ""} · ${v.detail}${v.options.length ? ` · ${v.options.join(" · ")}` : ""}`;
}

export const verb: VerbSpec<NextInput, NextView | LatestView> = {
  usage: "next <id> | next --latest [--session <id>]",
  output: "json",
  parse: parseNext,
  run: showNext,
  render: (v) => (isLatest(v) ? renderLatest(v) : renderStep(v)),
};
