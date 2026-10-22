import { action, done } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { preparePullRequest } from "./pr.mjs";

export type PrepareInput = { url: string; repo: string | undefined };
type Meta = { title: string; author?: string; source_ref?: string; target_ref?: string };
type Summary = { size: string; changed_files: string[]; lines_added: number; lines_removed: number; frameworks: string[]; concerns: string[]; security_path: boolean };
export type Prepared = {
  review_id: string;
  pr: { provider: string; repo: string };
  remote: string;
  repo_root: string;
  meta: Meta | null;
  meta_reason: string | null;
  summary: Summary;
  base: string;
  head: string;
  ref: string;
} & Record<string, unknown>;

type Prepare = (url: string, options: { root: string; repo: string | undefined }) => Promise<Prepared>;

const SHORT_SHA = 10;
const prepareTyped = preparePullRequest as unknown as Prepare;

export const prepare = action<PrepareInput, Prepared>(async ({ url, repo }, { root }) => done(await prepareTyped(url, { root, repo })));

function parsePrepare(args: Args): PrepareInput {
  const [url] = args.pos;
  if (!url) throw new UsageError("pullrequest prepare needs <url>");
  return { url, repo: str(args, "repo") };
}

function branchName(ref: string | undefined): string {
  return ref?.replace("refs/heads/", "") ?? "?";
}

function metaLine(v: Prepared): string {
  if (!v.meta) return `title and description unavailable: ${v.meta_reason}`;
  return `"${v.meta.title}" by ${v.meta.author ?? "?"} · ${branchName(v.meta.source_ref)} → ${branchName(v.meta.target_ref)}`;
}

function summaryLine({ summary: s }: Prepared): string {
  return `${s.size} · ${s.changed_files.length} file(s), +${s.lines_added}/-${s.lines_removed} · frameworks ${s.frameworks.join(",") || "-"} · concerns ${s.concerns.join(",") || "-"} · security ${s.security_path ? "yes" : "no"}`;
}

function renderPrepared(v: Prepared): string {
  return [
    `${v.review_id} · ${v.pr.provider} · ${v.pr.repo} · remote ${v.remote} · clone ${v.repo_root}`,
    `  ${metaLine(v)}`,
    `  ${summaryLine(v)}`,
    `  base ${v.base.slice(0, SHORT_SHA)} · head ${v.head.slice(0, SHORT_SHA)} (${v.ref})`,
  ].join("\n");
}

export const verb: VerbSpec<PrepareInput, Prepared> = {
  usage: "pullrequest prepare <url> [--repo <path>]",
  output: "json",
  parse: parsePrepare,
  run: prepare,
  render: renderPrepared,
};
