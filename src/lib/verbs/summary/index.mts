import { existsSync, writeFileSync } from "node:fs";
import { action, done } from "../../shared/action.mts";
import { planPathOf } from "../../shared/checkouts.mts";
import { loadConfig, securityPaths } from "../../shared/config.mjs";
import { readMutation } from "../../shared/mutation.mjs";
import { CHECKLIST_SCOPES, isChecklistScope, reviewChecklists, type Checklist, type ChecklistScope } from "../../shared/review-checklists.mts";
import { changesOfItem, changesOfRange, markWaived, renderSummary, summarize, type RepoChange, type Summary, type SummaryConfig } from "../../shared/review-summary.mts";
import { liveDrift, type Drift } from "../../shared/sources/drift.mts";
import type { Source } from "../../shared/sources/source.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { itemWaivers } from "../../shared/work/approvals.mts";
import { workFile, workId, workRel, type WorkId } from "../../shared/work/files.mts";
import { nextOf } from "../../shared/work/next-view.mts";
import { readSnapshot, type WorkSnapshot } from "../../shared/work/snapshot.mts";
import { flag, str, UsageError, type Args } from "../../util/args.mts";

export type SummaryInput = { id: WorkId; base: string | undefined; scope?: ChecklistScope; save: boolean } | { range: { base: string; head: string } };
export type RepoReport = { path: string; worktree: string | null; base: string | null; skipped: string } | { path: string; worktree: string | null; base: string | null; base_from?: string; files: number };
export type ItemSummary = { work_id: WorkId; base: string; request: string | null } & Omit<Summary, "silenced"> & {
  phases: number;
  repos: RepoReport[];
  sources: Drift[];
  silenced: Summary["silenced"];
  mutation: unknown;
  scope: ChecklistScope;
  checklists: Checklist[];
};
export type RangeSummary = { base: string; head: string } & Summary & { checklists: Checklist[] };
export type ItemOptions = { base: string | undefined; env: NodeJS.ProcessEnv; platform: NodeJS.Platform; scope?: ChecklistScope };

type ItemConfig = SummaryConfig & { sources: Source[] };

const RANGE = /^(.+?)\.\.\.?(.+)$/;
const SHORT_SHA = 8;
const RANGE_SCOPE: ChecklistScope = "phase";
const SCOPE_OF_ACTION: Readonly<Record<string, ChecklistScope>> = { review_cumulative: "cumulative", review_checkpoint: "checkpoint" };

function itemConfig(root: string, env: NodeJS.ProcessEnv): ItemConfig {
  return loadConfig(root, env) as unknown as ItemConfig;
}

function repoReport({ path, worktree, base, base_from, changed, skipped }: RepoChange): RepoReport {
  if (skipped) return { path, worktree, base: null, skipped };
  return { path, worktree, base, base_from, files: changed.length };
}

function defaultScope(root: string, snap: WorkSnapshot): ChecklistScope {
  const { action } = nextOf(snap, securityPaths(root));
  return Object.hasOwn(SCOPE_OF_ACTION, action) ? SCOPE_OF_ACTION[action] : "phase";
}

export function itemSummary(root: string, id: WorkId, { base, env, platform, scope }: ItemOptions): ItemSummary {
  const snap = readSnapshot(root, id);
  const from = base ?? snap.state.base ?? "HEAD";
  const config = itemConfig(root, env);
  const changes = changesOfItem(root, snap.state, from);
  const summary = summarize(root, changes, config);
  const chosen = scope ?? defaultScope(root, snap);
  return {
    work_id: id,
    base: from,
    request: existsSync(workFile(root, id, "request.md")) ? `${workRel(id)}request.md` : null,
    size: summary.size,
    changed_files: summary.changed_files,
    lines_added: summary.lines_added,
    lines_removed: summary.lines_removed,
    frameworks: summary.frameworks,
    concerns: summary.concerns,
    security_path: summary.security_path,
    extension_steps: summary.extension_steps,
    phases: snap.phases.length,
    repos: changes.repos.filter((r) => r.skipped || r.changed.length).map(repoReport),
    sources: liveDrift(root, id, config.sources),
    silenced: markWaived(summary.silenced, itemWaivers(root, id), platform, (path) => planPathOf(snap.layout, path)),
    mutation: readMutation(id, root),
    scope: chosen,
    checklists: reviewChecklists(summary, chosen),
  };
}

export function rangeSummary(root: string, base: string, head: string, env: NodeJS.ProcessEnv): RangeSummary {
  const summary = summarize(root, changesOfRange(root, base, head), itemConfig(root, env));
  return { base, head, ...summary, checklists: reviewChecklists(summary, RANGE_SCOPE) };
}

export function saveSummary(root: string, id: WorkId, summary: ItemSummary): void {
  writeFileSync(workFile(root, id, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
}

export const summarizeChanges = action<SummaryInput, ItemSummary | RangeSummary>(async (input, { root, env, platform }) => {
  if ("range" in input) return done(rangeSummary(root, input.range.base, input.range.head, env));
  const summary = itemSummary(root, input.id, { base: input.base, env, platform, scope: input.scope });
  if (input.save) saveSummary(root, input.id, summary);
  return done(summary);
});

function scopeArg(args: Args): ChecklistScope | undefined {
  const scope = str(args, "scope");
  if (scope === undefined || isChecklistScope(scope)) return scope;
  throw new UsageError(`--scope is one of ${CHECKLIST_SCOPES.join(", ")}, got "${scope}"`);
}

function parseSummary(args: Args): SummaryInput {
  const range = str(args, "range");
  const save = flag(args, "save");
  if (range !== undefined) {
    if (save) throw new UsageError("--save needs a work item id; a range summary is not saved");
    const m = range.match(RANGE);
    if (!m) throw new UsageError("--range needs <base>..<head>");
    return { range: { base: m[1], head: m[2] } };
  }
  const [id] = args.pos;
  if (!id) throw new UsageError("summary needs <id> or --range <base>..<head>");
  return { id: workId(id), base: str(args, "base"), scope: scopeArg(args), save };
}

function isRange(v: ItemSummary | RangeSummary): v is RangeSummary {
  return "head" in v;
}

function renderChanges(v: ItemSummary | RangeSummary): string {
  if (isRange(v)) return `${renderSummary(v)} · ${v.base.slice(0, SHORT_SHA)}..${v.head.slice(0, SHORT_SHA)}`;
  return `${renderSummary(v)} · base ${v.base.slice(0, SHORT_SHA)} · repos ${v.repos.length}`;
}

export const verb: VerbSpec<SummaryInput, ItemSummary | RangeSummary> = {
  usage: "summary <id> [--base <ref>] [--scope <s>] [--save] | summary --range <base>..<head>",
  output: "json",
  parse: parseSummary,
  run: summarizeChanges,
  render: renderChanges,
};
