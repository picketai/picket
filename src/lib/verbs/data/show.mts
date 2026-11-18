import { readFileSync } from "node:fs";
import { action, done } from "../../shared/action.mts";
import { approvalStatus, fileDigest, sqlFile, type ApprovalStatus } from "../../shared/data/approvals.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { UsageError, type Args } from "../../util/args.mts";

export type ShowInput = { path: string };
export type ShownFile = { path: string; sha256: string; status: ApprovalStatus; text: string };

const USAGE = "data show <path under .picket/env/, such as data/customer.sql>";

export const showFile = action<ShowInput, ShownFile>(async ({ path }, { root }) => {
  const file = sqlFile(root, path);
  return done({ path: file.path, sha256: fileDigest(file.abs), status: approvalStatus(root, file), text: readFileSync(file.abs, "utf8") });
});

function parseShow(args: Args): ShowInput {
  const [path, ...rest] = args.pos;
  if (!path || rest.length) throw new UsageError(USAGE);
  return { path };
}

export function renderShown({ path, sha256, status, text }: ShownFile): string {
  return `${path} · sha256:${sha256} · ${status}\n\n${text}`;
}

export const verb: VerbSpec<ShowInput, ShownFile> = {
  usage: USAGE,
  output: "text",
  parse: parseShow,
  run: showFile,
  render: renderShown,
};
