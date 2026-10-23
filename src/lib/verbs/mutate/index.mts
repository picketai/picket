import { writeFileSync } from "node:fs";
import { action, done, failed } from "../../shared/action.mts";
import { runStep, type StepStatus } from "../../shared/checks.mts";
import { detectTooling, type Tooling } from "../../shared/tooling.mts";
import type { VerbSpec } from "../../shared/verb-spec.mts";
import { workFile, workId, type WorkId } from "../../shared/work/files.mts";
import { readState } from "../../shared/work/state.mts";
import { UsageError, type Args } from "../../util/args.mts";
import { pickMutant, restoreLeftover, withMutant, type Mutant } from "./mutant.mts";

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

function stepStatus(root: string, step: MutatedStep, tooling: Tooling, env: NodeJS.ProcessEnv): RunStatus {
  try {
    return runStep(root, step, tooling[step], { env, timeoutMs: STEP_TIMEOUT_MS, logPrefix: "mutate" }).status;
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

export function mutate(root: string, id: WorkId, { env, now }: MutateOptions): MutationResult {
  const started = Date.now();
  const restored = restoreLeftover(root);
  const base = readState(root, id).base ?? "HEAD";
  const { tooling } = detectTooling(root);
  const status = (step: MutatedStep) => stepStatus(root, step, tooling, env);
  const command = tooling.test ?? null;
  const baseline = command ? baselineOutcome(status("test")) : null;
  const found = command && !baseline ? pickMutant(root, base) : null;
  const outcome = !command ? "no test command" : (baseline ?? candidateOutcome(root, found, () => status("test")));
  const rebuild = found || restored ? status("build") : null;
  const mutant = found ? { path: found.path, line: found.line, from: found.from, to: found.to } : null;
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
