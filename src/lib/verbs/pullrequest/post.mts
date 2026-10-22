import { action, done, refuse } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, need, UsageError, type Args } from "../../util/args.mts";
import { readText } from "../../util/io.mts";
import { parsePullRequestUrl, postReview } from "./pr.mjs";

export type PostInput = { url: string; file: string; dryRun: boolean };
type Comment = { content: string };
type Thread = { threadContext?: { filePath: string; rightFileStart: { line: number } }; comments: Comment[] };
export type Posted = { posted: number; threads: Thread[]; dry_run: boolean; pull_request: string };

type PullRequest = { id: string };
type Post = (pr: PullRequest, reviewText: string, options: { dryRun: boolean }) => Promise<{ posted: number; threads: Thread[] }>;

const FIRST_LINE_CHARS = 90;
const postTyped = postReview as unknown as Post;
const parseUrl = parsePullRequestUrl as unknown as (url: string) => PullRequest;

export const post = action<PostInput, Posted>(async ({ url, file, dryRun }) => {
  const review = readText(file);
  if (review === null) return refuse(`no review file at ${file}`, { file });
  const pr = parseUrl(url);
  const result = await postTyped(pr, review, { dryRun });
  return done({ ...result, dry_run: dryRun, pull_request: String(pr.id) });
});

function parsePost(args: Args): PostInput {
  const [url] = args.pos;
  if (!url) throw new UsageError("pullrequest post needs <url> --file <file>");
  return { url, file: need(args, "file"), dryRun: flag(args, "dry-run") };
}

function threadLine(t: Thread): string {
  const where = t.threadContext ? `${t.threadContext.filePath}:${t.threadContext.rightFileStart.line} ` : "";
  return `- ${where}${t.comments[0].content.split("\n")[0].slice(0, FIRST_LINE_CHARS)}`;
}

function renderPosted(v: Posted): string {
  if (!v.dry_run) return `posted ${v.posted} thread(s) to PR ${v.pull_request}`;
  return `${v.threads.length} thread(s) would be posted:\n${v.threads.map(threadLine).join("\n")}`;
}

export const verb: VerbSpec<PostInput, Posted> = {
  usage: "pullrequest post <url> --file <file> [--dry-run]",
  output: "json",
  parse: parsePost,
  run: post,
  render: renderPosted,
};
