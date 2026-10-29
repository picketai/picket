import { action, done, refuse } from "../../shared/action.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { flag, need, str, UsageError, type Args } from "../../util/args.mts";
import { gitRead } from "../../util/git.mts";
import { readText } from "../../util/io.mts";
import { postThreads } from "./azdo.mts";
import { parsePullRequestUrl, patOf, type PullRequest } from "./pull-request.mts";
import { mergeRef, resolveRepo } from "./remote.mts";
import { parseFindings, type Finding, type Thread } from "./threads.mts";

export type PostInput = { url: string; file: string; dryRun: boolean; repo: string | undefined };
export type Anchor = { path: string; line: number; code: string | null };
export type Posted = { posted: number; threads: Thread[]; dry_run: boolean; pull_request: string; anchors: Anchor[] };

const FIRST_LINE_CHARS = 90;
const CODE_INDENT = "    ";

function repoPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function lineOf(text: string | null, line: number): string | null {
  if (text === null) return null;
  return text.split(/\r?\n/)[line - 1] ?? null;
}

export function anchorsOf(findings: Finding[], read: (path: string) => string | null): Anchor[] {
  return findings.flatMap((f) => (f.line === null ? [] : [{ path: repoPath(f.path), line: f.line, code: lineOf(read(repoPath(f.path)), f.line) }]));
}

export function anchorsAtHead(root: string, pr: PullRequest, repo: string | undefined, findings: Finding[]): Anchor[] {
  const repoRoot = resolveRepo(root, pr, repo).repo_root;
  const read = (path: string) => (repoRoot === null ? null : gitRead(repoRoot, ["show", `${mergeRef(pr.id)}:${path}`]));
  return anchorsOf(findings, read);
}

export const post = action<PostInput, Posted>(async ({ url, file, dryRun, repo }, { root, env }) => {
  const review = readText(file);
  if (review === null) return refuse(`no review file at ${file}`, { file });
  const pr = parsePullRequestUrl(url);
  const result = await postThreads(pr, review, { pat: patOf(env, root), dryRun });
  const anchors = dryRun ? anchorsAtHead(root, pr, repo, parseFindings(review)) : [];
  return done({ ...result, dry_run: dryRun, pull_request: String(pr.id), anchors });
});

function parsePost(args: Args): PostInput {
  const [url] = args.pos;
  if (!url) throw new UsageError("pullrequest post needs <url> --file <file>");
  return { url, file: need(args, "file"), dryRun: flag(args, "dry-run"), repo: str(args, "repo") };
}

function threadLine(t: Thread): string {
  const where = t.threadContext ? `${t.threadContext.filePath}:${t.threadContext.rightFileStart.line} ` : "";
  return `- ${where}${t.comments[0].content.split("\n")[0].slice(0, FIRST_LINE_CHARS)}`;
}

function codeUnder(t: Thread, anchors: Anchor[]): string[] {
  const context = t.threadContext;
  if (!context) return [];
  const line = context.rightFileStart.line;
  const anchor = anchors.find((a) => a.line === line && `/${a.path}` === context.filePath);
  const code = anchor?.code ?? null;
  return [code === null ? `${CODE_INDENT}(no line ${line} at head)` : `${CODE_INDENT}${code.trim().slice(0, FIRST_LINE_CHARS)}`];
}

function renderPosted(v: Posted): string {
  if (!v.dry_run) return `posted ${v.posted} thread(s) to PR ${v.pull_request}`;
  return `${v.threads.length} thread(s) would be posted:\n${v.threads.flatMap((t) => [threadLine(t), ...codeUnder(t, v.anchors)]).join("\n")}`;
}

export const verb: VerbSpec<PostInput, Posted> = {
  usage: "pullrequest post <url> --file <file> [--dry-run] [--repo <path>]",
  output: "json",
  parse: parsePost,
  run: post,
  render: renderPosted,
};
