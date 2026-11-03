import { rmSync } from "node:fs";
import { action, done } from "../../shared/action.mts";
import { loadConfig } from "../../shared/config.mjs";
import { prTicketRel, statePath } from "../../shared/paths.mts";
import { reviewChecklists, type Checklist } from "../../shared/review-checklists.mts";
import { changesOfRange, renderSummary, summarize, type Summary, type SummaryConfig } from "../../shared/review-summary.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { str, UsageError, type Args } from "../../util/args.mts";
import { pullRequestMeta, pullRequestWorkItems, type PullRequestMeta } from "./azdo.mts";
import { parsePullRequestUrl, patOf, type PullRequest } from "./pull-request.mts";
import { fetchPullRequest, resolveRepo } from "./remote.mts";
import { renderTickets, ticketKeys, type Ticket } from "./tickets.mts";

export type PrepareInput = { url: string; repo: string | undefined };
export type PrepareOptions = { repo: string | undefined; pat: string | null; env: NodeJS.ProcessEnv };
export type Prepared = {
  pr: PullRequest;
  repo_root: string;
  remote: string;
  ref: string;
  head: string;
  base: string;
  source: string;
  summary: Summary;
  checklists: Checklist[];
  meta: PullRequestMeta | null;
  meta_reason: string | null;
  review_id: string;
  tickets: Ticket[];
  work_items: number[];
  work_items_reason: string | null;
};

const SHORT_SHA = 10;

function ticketsOf(meta: PullRequestMeta | null, reviewId: string): Ticket[] {
  return ticketKeys(meta).map((t) => ({ ...t, path: prTicketRel(reviewId, t.key) }));
}

export async function preparePullRequest(root: string, url: string, { repo, pat, env }: PrepareOptions): Promise<Prepared> {
  const pr = parsePullRequestUrl(url);
  const reviewId = `pr-${pr.id}`;
  const located = resolveRepo(root, pr, repo);
  if (located.remote === null) throw new Error(located.reason);
  const repoRoot = located.repo_root;
  const refs = fetchPullRequest(repoRoot, located.remote, pr.id);
  rmSync(statePath(root, reviewId), { recursive: true, force: true });
  const config: SummaryConfig = loadConfig(repoRoot, env);
  const summary = summarize(repoRoot, changesOfRange(repoRoot, refs.base, refs.head), config);
  const { meta, reason } = await pullRequestMeta(pr, { pat, root: repoRoot });
  const tickets = ticketsOf(meta, reviewId);
  const workItems = await pullRequestWorkItems(pr, pat);
  return {
    pr,
    repo_root: repoRoot,
    remote: located.remote,
    ...refs,
    summary,
    checklists: reviewChecklists(summary, "phase"),
    meta,
    meta_reason: reason,
    review_id: reviewId,
    tickets,
    work_items: workItems.ids,
    work_items_reason: workItems.reason,
  };
}

export const prepare = action<PrepareInput, Prepared>(async ({ url, repo }, { root, env }) => done(await preparePullRequest(root, url, { repo, pat: patOf(env, root), env })));

function parsePrepare(args: Args): PrepareInput {
  const [url] = args.pos;
  if (!url) throw new UsageError("pullrequest prepare needs <url>");
  return { url, repo: str(args, "repo") };
}

function branchName(ref: string | null | undefined): string {
  return ref?.replace("refs/heads/", "") ?? "?";
}

function metaLine(v: Prepared): string {
  if (!v.meta) return `title and description unavailable: ${v.meta_reason}`;
  return `"${v.meta.title}" by ${v.meta.author ?? "?"} · ${branchName(v.meta.source_ref)} → ${branchName(v.meta.target_ref)}`;
}

function workItemsLines(v: Prepared): string[] {
  if (v.work_items_reason) return [`  work items unavailable: ${v.work_items_reason}`];
  return v.work_items.length === 0 ? [] : [`  work items: ${v.work_items.join(", ")} (Azure Boards, not pulled)`];
}

function renderPrepared(v: Prepared): string {
  return [
    `${v.review_id} · ${v.pr.provider} · ${v.pr.repo} · remote ${v.remote} · clone ${v.repo_root}`,
    `  ${metaLine(v)}`,
    `  ${renderTickets(v.tickets)}`,
    ...workItemsLines(v),
    `  ${renderSummary(v.summary)}`,
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
