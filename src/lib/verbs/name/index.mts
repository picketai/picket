import { action, done } from "../../shared/action.mts";
import { documentRequest, nameDocument, type DocumentName, type DocumentRequest } from "../../shared/document-path.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, UsageError, type Args } from "../../util/args.mts";

const USAGE = 'name <kind> "<subject>" [--work <id>]';

export const name = action<DocumentRequest, DocumentName>(async (request, { root }) => done(nameDocument(root, request)));

function parseName(args: Args): DocumentRequest {
  const [kind, subject] = args.pos;
  if (!kind) throw new UsageError(`name needs <kind>: ${USAGE}`);
  return documentRequest(kind, { subject, work: str(args, "work") });
}

function nameLines({ path, exists }: DocumentName): string {
  return exists ? `${path}\nexists` : path;
}

export const verb: VerbSpec<DocumentRequest, DocumentName> = {
  usage: USAGE,
  output: "text",
  parse: parseName,
  run: name,
  render: nameLines,
};
