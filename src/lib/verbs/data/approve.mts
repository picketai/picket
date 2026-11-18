import { action, done, Refused } from "../../shared/action.mts";
import { fileDigest, recordApproval, sqlFile, type DataApproval } from "../../shared/data/approvals.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { need, UsageError, type Args } from "../../util/args.mts";

export type ApproveInput = { path: string; sha256: string };

const USAGE = "data approve <path> --sha256 <the 64 hex digits data show printed>";
const DIGEST = /^[0-9a-f]{64}$/;
const SHORT = 12;

export const approveFile = action<ApproveInput, DataApproval>(async ({ path, sha256 }, { root, session, now }) => {
  const file = sqlFile(root, path);
  if (fileDigest(file.abs) !== sha256) throw new Refused(`the file changed since it was shown; run picket data show ${file.path} again`);
  return done(recordApproval(root, file.path, sha256, session, now()));
});

function parseApprove(args: Args): ApproveInput {
  const [path, ...rest] = args.pos;
  if (!path || rest.length) throw new UsageError(USAGE);
  const sha256 = need(args, "sha256").toLowerCase();
  if (!DIGEST.test(sha256)) throw new UsageError(USAGE);
  return { path, sha256 };
}

export const verb: VerbSpec<ApproveInput, DataApproval> = {
  usage: USAGE,
  output: "text",
  parse: parseApprove,
  run: approveFile,
  render: (row) => `approved ${row.path} sha256:${row.sha256.slice(0, SHORT)}`,
};
