import { admit } from "../../shared/admission/admit.mts";
import type { Admission } from "../../shared/admission/lane.mts";
import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { list, str, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";

export { admit } from "../../shared/admission/admit.mts";

export type AdmitInput = { text: string; file: null; touched: string[] } | { text: null; file: string; touched: string[] };
export type NoText = { lane: null; reasons: string[]; signals: Record<string, never> };
export type AdmitResult = Admission | NoText;

const STDIN = "-";
const NO_TEXT: NoText = { lane: null, reasons: ["no request text given"], signals: {} };

function requestText(input: AdmitInput): string {
  if (input.file === null) return input.text;
  const text = readText(input.file);
  if (text === null) throw new Error(`admit cannot read the request file ${input.file}`);
  return text;
}

export const admission = action<AdmitInput, AdmitResult>(async (input, { root }) => {
  const text = requestText(input);
  if (!text.trim()) return done(NO_TEXT);
  return done(admit(root, text, input.touched));
});

function parseAdmit(args: Args): AdmitInput {
  const touched = list(args, "touched");
  const text = str(args, "text");
  if (text !== undefined) return { text, file: null, touched };
  const request = str(args, "request");
  if (request === STDIN) return { text: args.stdin(), file: null, touched };
  if (request !== undefined) return { text: null, file: request, touched };
  return { text: "", file: null, touched };
}

function renderAdmission(v: AdmitResult): string {
  if (v.lane === null) return "lane: (none) · re-run with the request on stdin, in a quoted heredoc: picket admit --request - --human";
  return `lane: ${v.lane}${"skill" in v && v.skill ? ` · skill: picket:${v.skill}` : ""} (${v.reasons.join("; ")})`;
}

export const verb: VerbSpec<AdmitInput, AdmitResult> = {
  usage: 'admit --text "<request>" | admit --request <file|-> [--touched <p1,p2>]',
  output: "json",
  parse: parseAdmit,
  run: admission,
  render: renderAdmission,
};
