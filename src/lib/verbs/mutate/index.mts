import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { action, done, failed } from "../../shared/action.mts";
import { locate, readPlan } from "../../shared/checkouts.mts";
import { runStep, type StepStatus } from "../../shared/checks.mts";
import { readLayout } from "../../shared/repos.mts";
import { detectTooling, type Tooling } from "../../shared/tooling.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { phasePaths } from "../../shared/work/artifact.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { pickMutantIn, restoreLeftover, withMutant, type Checkout, type Mutant } from "./mutant.mts";

export type MutateInput = { id: WorkId };
export type MutateOptions = { env: NodeJS.ProcessEnv; now: () => Date };
export type MutationOutcome = "survived" | "killed" | "error" | "baseline red" | "no candidate" | "no test command";
export type RunStatus = StepStatus | "error";
export type SavedMutation = {
  ts: string;
  base: string;
  mutant: Omit<Mutant, "col"> | null;
  command: string | null;
  outcome: MutationOutcome;
  rebuild: RunStatus | null;
  ms: number;
};
export type MutationResult = SavedMutation & { restored: string | null };

type MutatedStep = "test" | "build";

const STEP_TIMEOUT_MS = 300_000;
const REBUILD_PROBLEMS: readonly RunStatus[] = Object.freeze(["failed", "timed out", "error"]);

function stepStatus(root: string, dir: string, step: MutatedStep, tooling: Tooling, env: NodeJS.ProcessEnv): RunStatus {
  try {
    return runStep(root, step, tooling[step], { env, timeoutMs: STEP_TIMEOUT_MS, logPrefix: "mutate", cwd: join(root, dir) }).status;
  } catch {
    return "error";
  }
}

function mutantOutcome(testStatus: RunStatus): MutationOutcome {
  if (testStatus === "passed") return "survived";
  if (testStatus === "failed") return "killed";
  return "error";
}

function baselineOutcome(testStatus: RunStatus): MutationOutcome | null {
  if (testStatus === "passed") return null;
  return testStatus === "failed" ? "baseline red" : "error";
}

function candidateOutcome(root: string, found: Mutant | null, testStatus: () => RunStatus): MutationOutcome {
  return found ? withMutant(root, found, () => mutantOutcome(testStatus())) : "no candidate";
}

function candidateCheckouts(root: string, id: WorkId): Checkout[] {
  const { state, phases } = readPlan(root, id);
  const layout = readLayout(root, id);
  const nested = phases
    .flatMap(phasePaths)
    .map((path) => locate(layout, path))
    .flatMap(({ dir, repo }) => {
      const base = layout.repos.find((r) => r.path === repo)?.base;
      return repo !== null && base ? [{ dir, base }] : [];
    });
  const byDir = [...new Map(nested.map((checkout) => [checkout.dir, checkout])).values()];
  return [{ dir: "", base: state.base ?? "HEAD" }, ...byDir.sort((a, b) => a.dir.localeCompare(b.dir))];
}

export function mutate(root: string, id: WorkId, { env, now }: MutateOptions): MutationResult {
  const started = Date.now();
  const restored = restoreLeftover(root);
  const checkouts = candidateCheckouts(root, id);
  const found = pickMutantIn(root, checkouts);
  const { dir, base } = found ?? checkouts[0];
  const { tooling } = detectTooling(join(root, dir));
  const status = (step: MutatedStep) => stepStatus(root, dir, step, tooling, env);
  const command = tooling.test ?? null;
  const baseline = command ? baselineOutcome(status("test")) : null;
  const planted = command && !baseline ? (found?.mutant ?? null) : null;
  const outcome = !command ? "no test command" : (baseline ?? candidateOutcome(root, planted, () => status("test")));
  const rebuild = planted || restored ? status("build") : null;
  const mutant = planted ? { path: planted.path, line: planted.line, from: planted.from, to: planted.to } : null;
  const result: SavedMutation = { ts: now().toISOString(), base, mutant, command, outcome, rebuild, ms: Date.now() - started };
  writeFileSync(workFile(root, id, "mutation.json"), JSON.stringify(result, null, 2) + "\n");
  return { ...result, restored };
}

export function renderMutation(v: MutationResult): string {
  const lines = v.restored ? [`restored ${v.restored} from an interrupted run`] : [];
  const where = v.mutant ? `${v.mutant.path}:${v.mutant.line} ${v.mutant.from} -> ${v.mutant.to}` : "none";
  lines.push(`mutant ${where}: ${v.outcome}`);
  if (v.rebuild !== null && REBUILD_PROBLEMS.includes(v.rebuild)) lines.push(`rebuild after restoring: ${v.rebuild}; the build output may still hold the mutant`);
  return lines.join("\n");
}

export const mutateOnce = action<MutateInput, MutationResult>(async ({ id }, { root, env, now }) => {
  const result = mutate(root, id, { env, now });
  return result.outcome === "error" ? failed(result) : done(result);
});

function parseMutate(args: Args): MutateInput {
  const [id] = args.pos;
  if (!id) throw new UsageError("mutate needs <id>");
  return { id: workId(id) };
}

export const verb: VerbSpec<MutateInput, MutationResult> = {
  usage: "mutate <id>",
  output: "json",
  parse: parseMutate,
  run: mutateOnce,
  render: renderMutation,
};
