import { action, done, Refused } from "../../shared/action.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, CASE_KINDS, CELL_OUTCOMES, testRound, type CaseKind, type CellOutcome, type CellRow, type TestEntry, type UntestableRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type NoteMark = { kind: CaseKind; outcome: CellOutcome } | "untestable";
export type NoteInput = { id: WorkId; criterion: string; mark: NoteMark; why: string };
export type NoteRow = CellRow | UntestableRow;

const OUTCOME_WORDS: ReadonlyMap<string, CellOutcome> = new Map(CELL_OUTCOMES.map((outcome) => [outcome.replaceAll(" ", "-"), outcome]));
const UNTESTABLE = "untestable";
const USAGE = `test note <id> <criterion> <kind> <${[...OUTCOME_WORDS.keys()].join("|")}> --why "<text>", or test note <id> <criterion> ${UNTESTABLE} --why "<text>"`;

export const note = action<NoteInput, NoteRow>(async (input, { root, now }) => {
  const { snap, criteria } = openTestItem(root, input.id);
  if (!criteria.includes(input.criterion)) throw new Refused(`${input.criterion} is not a tested criterion; the tested criteria are ${criteria.join(", ")}`, { id: input.id });
  const round = testRound(snap.verdicts);
  const entry: Extract<TestEntry, { type: "cell" | "untestable" }> =
    input.mark === UNTESTABLE
      ? { round, type: "untestable", criterion: input.criterion, why: input.why }
      : { round, type: "cell", criterion: input.criterion, kind: input.mark.kind, outcome: input.mark.outcome, why: input.why };
  const at = now();
  appendTestRow(root, input.id, entry, at);
  const row: NoteRow = { ts: at.toISOString(), ...entry };
  return done(row);
});

function isCaseKind(text: string | undefined): text is CaseKind {
  return CASE_KINDS.some((kind) => kind === text);
}

function parseMark(kind: string | undefined, outcome: string | undefined): NoteMark {
  if (kind === UNTESTABLE && outcome === undefined) return UNTESTABLE;
  const cell = outcome === undefined ? undefined : OUTCOME_WORDS.get(outcome);
  if (!isCaseKind(kind) || cell === undefined) throw new UsageError(USAGE);
  return { kind, outcome: cell };
}

function parseNote(args: Args): NoteInput {
  const [id, criterion, kind, outcome, ...rest] = args.pos;
  if (!id || !criterion || rest.length) throw new UsageError(USAGE);
  const why = need(args, "why").trim();
  if (!why) throw new UsageError("--why must not be empty");
  return { id: workId(id), criterion, mark: parseMark(kind, outcome), why };
}

function noteText(row: NoteRow): string {
  if (row.type === "untestable") return `${row.criterion} recorded as untestable in round ${row.round}`;
  return `${row.criterion} ${row.kind} recorded as ${row.outcome} in round ${row.round}`;
}

export const verb: VerbSpec<NoteInput, NoteRow> = {
  usage: USAGE,
  output: "text",
  parse: parseNote,
  run: note,
  render: noteText,
};
