import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { latest, next } from "../../shared/work/next-step.mjs";
import { flag, str, UsageError, type Args } from "../../util/args.mts";

export type NextInput = { id: WorkId } | { latest: true; session: string | undefined };
export type NextStep = { id: string | null; action: string; actor: string | null; phase: number | null; detail: string; options: string[] };
export type LatestStep = NextStep & { other_session?: boolean };

export const nextStep = action<NextInput, NextStep | LatestStep>(async (input, { root }) => {
  if ("id" in input) return done(next(input.id, root) as NextStep);
  return done(latest(root, { session: input.session }) as LatestStep);
});

function parseNext(args: Args): NextInput {
  const [id] = args.pos;
  if (id) return { id: workId(id) };
  if (!flag(args, "latest")) throw new UsageError("next needs <id> or --latest");
  return { latest: true, session: str(args, "session") };
}

function isLatest(step: NextStep | LatestStep): step is LatestStep {
  return step.id === null || "other_session" in step;
}

function renderLatest(v: LatestStep): string {
  if (!v.id) return "(no open work item)";
  return `${v.id}: ${v.action} · ${v.actor ?? "-"} · ${v.detail}${v.other_session ? " (other session)" : ""}`;
}

function renderStep(v: NextStep): string {
  return `${v.action} · ${v.actor ?? "-"}${v.phase ? ` · phase ${v.phase}` : ""} · ${v.detail}${v.options.length ? ` · ${v.options.join(" · ")}` : ""}`;
}

export const verb: VerbSpec<NextInput, NextStep | LatestStep> = {
  usage: "next <id> | next --latest [--session <id>]",
  output: "json",
  parse: parseNext,
  run: nextStep,
  render: (v) => (isLatest(v) ? renderLatest(v) : renderStep(v)),
};
