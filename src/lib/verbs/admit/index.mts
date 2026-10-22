import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { list, str, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";
import { admit } from "./admit.mjs";

export type AdmitInput = { text: string; file: null; touched: string[] } | { text: null; file: string; touched: string[] };
export type Admission = { lane: string | null; skill?: string; reasons: string[]; signals: Record<string, unknown> };

const STDIN = "-";
const NO_TEXT: Admission = { lane: null, reasons: ["no request text given"], signals: {} };

function requestText(input: AdmitInput): string {
  if (input.file === null) return input.text;
  const text = readText(input.file);
  if (text === null) throw new Error(`admit cannot read the request file ${input.file}`);
  return text;
}

export const admission = action<AdmitInput, Admission>(async (input, { root }) => {
  const text = requestText(input);
  if (!text.trim()) return done(NO_TEXT);
  return done(admit(text, { root, touched: input.touched }) as Admission);
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

function renderAdmission(v: Admission): string {
  if (v.lane === null) return 'lane: (none) · re-run with the request text: picket admit --text "<request>"';
  return `lane: ${v.lane}${v.skill ? ` · skill: picket:${v.skill}` : ""} (${v.reasons.join("; ")})`;
}

export const verb: VerbSpec<AdmitInput, Admission> = {
  usage: 'admit --text "<request>" | admit --request <file|-> [--touched <p1,p2>]',
  output: "json",
  parse: parseAdmit,
  run: admission,
  render: renderAdmission,
};
