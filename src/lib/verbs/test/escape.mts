import { action, done, Refused } from "../../shared/action.mts";
import { isEscapePoint } from "../../shared/testing/escapes.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, latestCases, latestClass, readTestRows, testRound, type EscapeRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type EscapeInput = { id: WorkId; case: string; root_cause: string; escaped: string };

const USAGE = 'test escape <id> <case> --root-cause "<text>" --escaped "<point>"';
const POINT_RULE = "--escaped must be unit test, declared check, a review row id such as Ts4, or none: not checkable earlier";

export const escape = action<EscapeInput, EscapeRow>(async (input, { root, now }) => {
  const { snap } = openTestItem(root, input.id);
  const rows = readTestRows(root, input.id);
  if (!latestCases(rows).some((row) => row.case === input.case)) throw new Refused(`no case ${input.case} in any round`, { id: input.id });
  if (latestClass(rows, input.case)?.class !== "product") throw new Refused(`${input.case} is not classed product; only a product failure takes an escape point`, { id: input.id });
  const entry: Omit<EscapeRow, "ts"> = { round: testRound(snap.verdicts), type: "escape", case: input.case, root_cause: input.root_cause, escaped: input.escaped };
  const at = now();
  appendTestRow(root, input.id, entry, at);
  return done({ ts: at.toISOString(), ...entry });
});

function parseEscape(args: Args): EscapeInput {
  const [id, caseId, ...rest] = args.pos;
  if (!id || !caseId || rest.length) throw new UsageError(USAGE);
  const rootCause = need(args, "root-cause").trim();
  if (!rootCause) throw new UsageError("--root-cause must not be empty");
  const escaped = need(args, "escaped").trim();
  if (!isEscapePoint(escaped)) throw new UsageError(POINT_RULE);
  return { id: workId(id), case: caseId, root_cause: rootCause, escaped };
}

export const verb: VerbSpec<EscapeInput, EscapeRow> = {
  usage: USAGE,
  output: "text",
  parse: parseEscape,
  run: escape,
  render: (row) => `${row.case} escaped ${row.escaped}: ${row.root_cause}`,
};
