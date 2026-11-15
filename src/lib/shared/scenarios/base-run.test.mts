import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gitIn, gitOut, gitRepo } from "#test/git.mts";
import type { ProgramResult } from "../../util/process.mts";
import type { Engine } from "../env/engine.mts";
import type { ItemLayout } from "../repos.mts";
import { workId } from "../work/files.mts";
import { listScenarios } from "./files.mts";
import type { HttpAdapter } from "./http.mts";
import { runBase, type BaseInput } from "./base-run.mts";

const RECORDED = readFileSync(resolve("test/fixtures/env/compose-config.json"), "utf8");
const NO_REPOS: ItemLayout = { nested: [], worktrees: null, repos: [] };
const OK: ProgramResult = { status: 0, stdout: "", stderr: "" };

type Seen = { calls: string[]; worktreesAtBuild: number; override: Record<string, any> | null };

function project(t: TestContext): { root: string; base: string } {
  const root = realpathSync(gitRepo(t, { files: { "README.md": "u\n" } }));
  cpSync(resolve("test/fixtures/env/umbrella"), root, { recursive: true });
  gitIn(root, "add", "-A");
  gitIn(root, "commit", "-q", "-m", "umbrella");
  return { root, base: gitOut(root, "rev-parse", "HEAD") };
}

function worktrees(root: string): number {
  return gitOut(root, "worktree", "list").split("\n").length;
}

function valueAfter(args: string[], flag: string): string[] {
  return args.flatMap((arg, at) => (args[at - 1] === flag ? [arg] : []));
}

function engine(root: string, { failUp = false }: { failUp?: boolean } = {}): { engine: Engine; seen: Seen } {
  const seen: Seen = { calls: [], worktreesAtBuild: 0, override: null };
  const run = (args: string[]): ProgramResult => {
    const words = args.filter((arg, at) => !["-p", "--project-directory", "-f", "--profile"].includes(arg) && !["-p", "--project-directory", "-f", "--profile"].includes(args[at - 1]));
    const projectRoot = valueAfter(args, "--project-directory").map((dir) => dirname(dirname(dir)))[0] ?? root;
    if (words[1] === "config") return { ...OK, stdout: words.includes("--profiles") ? "picket-data\n" : RECORDED.replaceAll('"/umbrella/', `"${projectRoot.replaceAll("\\", "/")}/`) };
    seen.calls.push(words.slice(0, 2).join(" "));
    if (words[1] === "build") {
      seen.worktreesAtBuild = worktrees(root);
      seen.override = JSON.parse(readFileSync(valueAfter(args, "-f")[1], "utf8"));
    }
    if (words[0] === "image" && words[1] === "inspect") return { ...OK, stdout: JSON.stringify([{ Config: { Labels: { "org.opencontainers.image.revision": words[2].slice(words[2].lastIndexOf(":") + 1) } } }]) };
    if (words[1] === "up" && failUp) return { status: 1, stdout: "", stderr: "orders is unhealthy\n" };
    if (words[1] === "port") return { ...OK, stdout: "0.0.0.0:49160\n" };
    return OK;
  };
  return { engine: { name: "docker", program: "docker", prefix: [], kind: "docker", run }, seen };
}

function input(root: string, base: string, built: Engine, adapter: HttpAdapter): BaseInput {
  return {
    root,
    engine: built,
    layout: NO_REPOS,
    state: { id: workId("20261115-orders-export"), base },
    key: "proj-481",
    scenarios: listScenarios(root),
    replay: { adapter, env: {}, today: "2026-11-15", newRunKey: () => "aaaa", timeoutMs: 20000, sleep: async () => {} },
  };
}

const healthy: HttpAdapter = async () => ({ status: 200, headers: {}, text: "ok", error: null });

test("the base run adds a worktree, builds, proves, starts, replays, then removes the stack, the images and the worktree (T-5.1)", async (t) => {
  const { root, base } = project(t);
  const { engine: built, seen } = engine(root);
  const outcome = await runBase(input(root, base, built, healthy));
  assert.ok("runs" in outcome, JSON.stringify(outcome));
  assert.deepEqual(outcome.runs.map(({ id, outcome: result }) => [id, result]), [["S-0001", "passed"]]);
  assert.deepEqual(outcome.versions, { orders: base.slice(0, 7) });
  assert.equal(seen.worktreesAtBuild, 2);
  assert.deepEqual(seen.calls, ["compose build", "image inspect", "compose up", "compose port", "compose port", "compose down", "image rm"]);
  assert.equal(worktrees(root), 1);
  assert.equal(existsSync(join(root, ".picket", "state", "env", "base", "picket-proj-481-base")), false);
});

test("the override builds orders from the base worktree under the base image name (T-5.2)", async (t) => {
  const { root, base } = project(t);
  const { engine: built, seen } = engine(root);
  await runBase(input(root, base, built, healthy));
  const orders = seen.override?.services.orders;
  assert.equal(orders.image, `picket/orders-proj-481-base:${base.slice(0, 7)}`);
  assert.equal(orders.build.context, join(root, ".picket", "state", "env", "base", "picket-proj-481-base", "root", "services", "orders"));
  assert.equal(orders.build.labels["org.opencontainers.image.revision"], base.slice(0, 7));
});

test("a failing up still takes the stack down and removes the worktree, and names the failure (T-5.3)", async (t) => {
  const { root, base } = project(t);
  const { engine: built, seen } = engine(root, { failUp: true });
  const outcome = await runBase(input(root, base, built, healthy));
  assert.deepEqual(outcome, { failure: "compose up failed: orders is unhealthy" });
  assert.deepEqual(seen.calls, ["compose build", "image inspect", "compose up", "compose down", "image rm"]);
  assert.equal(worktrees(root), 1);
});

test("a base commit git does not know is a failure with no stack call and no worktree left", async (t) => {
  const { root } = project(t);
  const { engine: built, seen } = engine(root);
  const outcome = await runBase(input(root, "0000000000000000000000000000000000000000", built, healthy));
  assert.ok("failure" in outcome);
  assert.deepEqual(seen.calls, []);
  assert.equal(worktrees(root), 1);
});
