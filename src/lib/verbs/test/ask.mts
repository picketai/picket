import { action, done, Refused } from "../../shared/action.mts";
import { MAX_QUESTIONS } from "../../shared/testing/derive.mts";
import { openTestItem } from "../../shared/testing/facts.mts";
import { appendTestRow, readTestRows, testRound, type QuestionRow } from "../../shared/testing/results.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { need, str, UsageError, type Args } from "../../util/args.mts";

export type AskInput = { id: WorkId; criterion: string; question: string; choices: string[]; default: string | null; basis: string | null };

const USAGE = 'test ask <id> <criterion> --question <text> --choices "<a> | <b>" [--default <choice> --basis <text>]';
const MIN_CHOICES = 2;
const MAX_CHOICES = 4;

export const ask = action<AskInput, QuestionRow>(async (input, { root, now }) => {
  const { snap, criteria } = openTestItem(root, input.id);
  if (!criteria.includes(input.criterion)) throw new Refused(`${input.criterion} is not a tested criterion; the tested criteria are ${criteria.join(", ")}`, { id: input.id });
  const asked = readTestRows(root, input.id).filter((row) => row.type === "question").length;
  if (asked >= MAX_QUESTIONS) throw new Refused(`at most ${MAX_QUESTIONS} questions per item (draft section 4.5)`, { id: input.id });
  const entry: Omit<QuestionRow, "ts"> = { round: testRound(snap.verdicts), type: "question", criterion: input.criterion, question: input.question, choices: input.choices, default: input.default, basis: input.basis };
  const at = now();
  appendTestRow(root, input.id, entry, at);
  return done({ ts: at.toISOString(), ...entry });
});

function choicesOf(text: string): string[] {
  const choices = text.split("|").map((choice) => choice.trim()).filter(Boolean);
  if (choices.length < MIN_CHOICES || choices.length > MAX_CHOICES) throw new UsageError(`a question takes ${MIN_CHOICES} to ${MAX_CHOICES} choices separated by |, got ${choices.length}`);
  return choices;
}

function defaultOf(args: Args, choices: string[]): Pick<AskInput, "default" | "basis"> {
  const chosen = str(args, "default")?.trim() || null;
  const basis = str(args, "basis")?.trim() || null;
  if (chosen === null) {
    if (basis !== null) throw new UsageError("--basis explains a --default; give both or neither");
    return { default: null, basis: null };
  }
  if (!choices.includes(chosen)) throw new UsageError(`the default "${chosen}" is not one of the choices: ${choices.join(" | ")}`);
  if (basis === null) throw new UsageError(`the default "${chosen}" needs --basis: why it is the default`);
  return { default: chosen, basis };
}

function parseAsk(args: Args): AskInput {
  const [id, criterion] = args.pos;
  if (!id || !criterion) throw new UsageError(USAGE);
  const question = need(args, "question").trim();
  if (!question) throw new UsageError("--question must not be empty");
  const choices = choicesOf(need(args, "choices"));
  return { id: workId(id), criterion, question, choices, ...defaultOf(args, choices) };
}

export const verb: VerbSpec<AskInput, QuestionRow> = {
  usage: USAGE,
  output: "text",
  parse: parseAsk,
  run: ask,
  render: (row) => `question on ${row.criterion} recorded in round ${row.round}: ${row.question}`,
};
