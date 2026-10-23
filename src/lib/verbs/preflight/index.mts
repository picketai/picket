import { action, done, failed } from "../../shared/action.mts";
import { loadConfig } from "../../shared/config.mjs";
import { branch, dirtyPaths, isRepo } from "../../shared/git.mts";
import { detectTooling, type Tooling } from "../../shared/tooling.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workId, type WorkId } from "../../shared/work/files.mts";
import { readSnapshot, stateView, type StateView } from "../../shared/work/snapshot.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { CHECKS, type Check, type GitFacts, type PreflightInput } from "./checks.mts";

export type PreflightArgs = { id: WorkId };
export type PreflightReport = { ok: boolean; checks: Check[]; tooling: Tooling | null; state?: StateView };
export type Machine = { home: string; env: NodeJS.ProcessEnv; platform: NodeJS.Platform };

function gitFacts(root: string): GitFacts {
  if (!isRepo(root)) return { repo: false, branch: null, dirty: [] };
  return { repo: true, branch: branch(root), dirty: dirtyPaths(root) };
}

function readItem(root: string, id: WorkId): Pick<PreflightInput, "snapshot" | "view"> | { error: string } {
  try {
    const snapshot = readSnapshot(root, id);
    return { snapshot, view: stateView(snapshot) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export function preflight(root: string, id: WorkId, { home, env, platform }: Machine): PreflightReport {
  const item = readItem(root, id);
  if ("error" in item) return { ok: false, checks: [{ name: "work_item", level: "fail", detail: item.error }], tooling: null };
  const input: PreflightInput = { root, ...item, config: loadConfig(root, env), tooling: detectTooling(root), git: gitFacts(root), home, env, platform };
  const checks = CHECKS.flatMap((check) => check(input) ?? []);
  return { ok: !checks.some((c) => c.level === "fail"), checks, tooling: input.tooling.tooling, state: input.view };
}

export const preflightReport = action<PreflightArgs, PreflightReport>(async ({ id }, { root, home, env, platform }) => {
  const report = preflight(root, id, { home, env, platform });
  return report.ok ? done(report) : failed(report);
});

function parsePreflight(args: Args): PreflightArgs {
  const [id] = args.pos;
  if (!id) throw new UsageError("preflight needs <id>");
  return { id: workId(id) };
}

function renderPreflight(v: PreflightReport): string {
  return v.checks.map((c) => `${c.level.padEnd(4)} ${c.name}: ${c.detail}`).join("\n") + `\n${v.ok ? "PREFLIGHT OK" : "PREFLIGHT FAILED"}`;
}

export const verb: VerbSpec<PreflightArgs, PreflightReport> = {
  usage: "preflight <id>",
  output: "json",
  parse: parsePreflight,
  run: preflightReport,
  render: renderPreflight,
};
