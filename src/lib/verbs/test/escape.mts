import { action, done, Refused } from "../../shared/action.mts";
import { readDefects } from "../../shared/scenarios/defects.mts";
import { namesDefect } from "../../shared/scenarios/known.mts";
import { isEscapePoint, itemTexts } from "../../shared/testing/escapes.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, latestCases, latestClass, readTestRows, testRound, type EscapeRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type EscapeInput = { id: WorkId; case: string; root_cause: string; escaped: string };

const USAGE = 'test escape <id> <case> --root-cause "<text>" --escaped "<point>"';
const DEFECT_ID = /^DF-\d{4,}$/;
const CLOSED_STATUSES = ["done", "abandoned"];
const POINT_RULE = "--escaped must be unit test, declared check, a review row id such as Ts4, or none: not checkable earlier";

function caseSnapshot(root: string, input: EscapeInput): WorkSnapshot {
  const { snap } = openTestItem(root, input.id);
  const rows = readTestRows(root, input.id);
  if (!latestCases(rows).some((row) => row.case === input.case)) throw new Refused(`no case ${input.case} in any round`, { id: input.id });
  if (latestClass(rows, input.case)?.class !== "product") throw new Refused(`${input.case} is not classed product; only a product failure takes an escape point`, { id: input.id });
  return snap;
}

function defectSnapshot(root: string, input: EscapeInput): WorkSnapshot {
  const { id } = input;
  const snap = readSnapshot(root, id);
  const { status } = snap.state;
  if (CLOSED_STATUSES.includes(status)) throw new Refused(`${id} is ${status}; only an open or blocked item is tested`, { id, status });
  if (!readDefects(root).some((entry) => entry.id === input.case && entry.status === "open")) throw new Refused(`${input.case} is no open known defect`, { id });
  if (!namesDefect(itemTexts(root, snap), input.case)) throw new Refused(`${id} does not name ${input.case}; only a known defect the item fixes on purpose takes an escape point`, { id });
  return snap;
}

export const escape = action<EscapeInput, EscapeRow>(async (input, { root, now }) => {
  const snap = DEFECT_ID.test(input.case) ? defectSnapshot(root, input) : caseSnapshot(root, input);
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
