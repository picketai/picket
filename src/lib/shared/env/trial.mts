import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readJson } from "../../util/io.mts";
import { STATE_FILES, statePath } from "../paths.mts";
import type { MockFile } from "../mocks/definition.mts";
import { prepareBrowser } from "../browser/service.mts";
import { prepareStubs } from "../mocks/stub.mts";
import { nestedRepos, type ItemLayout } from "../repos.mts";
import { overrideDoc, sourceFor, type ServiceSource } from "./build-plan.mts";
import { failureCause, runCompose, type Engine } from "./engine.mts";
import type { EnvModel } from "./model.mts";
import type { Finding } from "./rules.mts";
import { COMPOSE_FILE, ENV_DIR, ITEM_LABEL, stackName } from "./standard.mts";

export type TrialRecord = { fingerprint: string; passed: boolean; at: string };
export type TrialResult = { passed: boolean; rounds: number; failure: string | null; removed_images: number };

export const TRIAL_KEY = "trial";
export const TRIAL_STACK = stackName(TRIAL_KEY);
const ROUNDS = 2;
const RULE = "E10";

export function modelFingerprint(modelJson: unknown): string {
  return createHash("sha256").update(JSON.stringify(modelJson)).digest("hex");
}

export function rootLayout(root: string): ItemLayout {
  return { nested: nestedRepos(root).map((repo) => repo.path), worktrees: null, repos: [] };
}

export function trialSources(root: string, model: EnvModel, env: NodeJS.ProcessEnv): ServiceSource[] {
  const layout = rootLayout(root);
  return model.services.filter((s) => s.role === "app" && s.build !== null && s.profiles.length === 0).map((s) => sourceFor(root, layout, s, env));
}

function writeOverride(root: string, doc: object): string {
  const path = statePath(root, `env/${TRIAL_STACK}/compose.picket.yaml`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  return path;
}

function round(engine: Engine, root: string, files: string[], apps: string[]): string | null {
  const compose = (args: string[]) => runCompose(engine, root, TRIAL_STACK, files, args);
  const build = compose(["build", ...apps]);
  const up = build.status === 0 ? compose(["up", "--detach", "--wait"]) : null;
  compose(["down", "--volumes", "--remove-orphans"]);
  if (build.status !== 0) return `build failed: ${failureCause(build)}`;
  if (up && up.status !== 0) return `up failed: ${failureCause(up)}`;
  return null;
}

function removeTrialImages(engine: Engine): number {
  const listed = engine.run(["image", "ls", "--filter", `label=${ITEM_LABEL}=${TRIAL_KEY}`, "--quiet"]);
  const ids = [...new Set(listed.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== ""))];
  if (listed.status !== 0 || ids.length === 0) return 0;
  return engine.run(["image", "rm", "--force", ...ids]).status === 0 ? ids.length : 0;
}

export function runTrial(engine: Engine, root: string, model: EnvModel, sources: ServiceSource[], mocks: MockFile[]): TrialResult {
  const overlays = { ...prepareStubs(root, TRIAL_STACK, model, mocks), ...prepareBrowser(root, TRIAL_STACK, model) };
  const files = [join(root, ENV_DIR, COMPOSE_FILE), writeOverride(root, overrideDoc(model, sources, TRIAL_KEY, TRIAL_KEY, overlays))];
  const apps = sources.map((s) => s.service);
  let failure: string | null = null;
  let rounds = 0;
  while (failure === null && rounds < ROUNDS) {
    rounds += 1;
    const failed = round(engine, root, files, apps);
    if (failed !== null) failure = `round ${rounds}: ${failed}`;
  }
  return { passed: failure === null, rounds, failure, removed_images: removeTrialImages(engine) };
}

function trialFile(root: string): string {
  return statePath(root, STATE_FILES.envTrial);
}

export function recordTrial(root: string, modelJson: unknown, passed: boolean, at: Date): TrialRecord {
  const record = { fingerprint: modelFingerprint(modelJson), passed, at: at.toISOString() };
  mkdirSync(dirname(trialFile(root)), { recursive: true });
  writeFileSync(trialFile(root), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export function trialFinding(root: string, modelJson: unknown): Finding | null {
  const record = readJson<TrialRecord>(trialFile(root));
  if (record === null) return { rule: RULE, service: TRIAL_KEY, level: "pending", message: "run picket env trial" };
  if (record.fingerprint !== modelFingerprint(modelJson)) return { rule: RULE, service: null, level: "error", message: "the last trial ran on another environment; run picket env trial" };
  if (!record.passed) return { rule: RULE, service: null, level: "error", message: "the last trial failed; fix the environment and run picket env trial" };
  return null;
}
