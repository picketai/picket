import { action, done, Refused } from "../../shared/action.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, FAILURE_CLASSES, latestCases, readTestRows, roundRows, testRound, type ClassRow, type FailureClass } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type ClassifyInput = { id: WorkId; case: string; class: FailureClass; evidence: string };

const USAGE = "test classify <id> <case> <product|test|environment> --evidence \"<text>\"";

export const classify = action<ClassifyInput, ClassRow>(async (input, { root, now }) => {
  const { snap } = openTestItem(root, input.id);
  const round = testRound(snap.verdicts);
  const found = latestCases(roundRows(readTestRows(root, input.id), round)).find((row) => row.case === input.case);
  if (!found) throw new Refused(`no case ${input.case} in round ${round}`, { id: input.id });
  if (found.outcome !== "failed") throw new Refused(`${input.case} ${found.outcome}; only a failed case takes a class`, { id: input.id });
  const entry: Omit<ClassRow, "ts"> = { round, type: "class", case: input.case, class: input.class, evidence: input.evidence };
  const at = now();
  appendTestRow(root, input.id, entry, at);
  return done({ ts: at.toISOString(), ...entry });
});

function isFailureClass(text: string | undefined): text is FailureClass {
  return FAILURE_CLASSES.some((cls) => cls === text);
}

function parseClassify(args: Args): ClassifyInput {
  const [id, caseId, cls, ...rest] = args.pos;
  if (!id || !caseId || !isFailureClass(cls) || rest.length) throw new UsageError(USAGE);
  const evidence = need(args, "evidence").trim();
  if (!evidence) throw new UsageError("--evidence must not be empty");
  return { id: workId(id), case: caseId, class: cls, evidence };
}

export const verb: VerbSpec<ClassifyInput, ClassRow> = {
  usage: USAGE,
  output: "text",
  parse: parseClassify,
  run: classify,
  render: (row) => `${row.case} classed ${row.class} in round ${row.round}`,
};
