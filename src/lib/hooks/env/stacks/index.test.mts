import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { SpawnOptions } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordStack, type StackEntry } from "../../../shared/env/stacks.mts";
import { readState, writeState } from "../../../shared/work/state.mts";
import { fixedContext } from "#test/context.mts";
import { openItem, withProject } from "#test/project.mts";
import { envStacks, type Spawn } from "./index.mts";

type Spawned = { command: string; args: string[]; options: SpawnOptions };

const LIVE = "session-live";
const ENDING = "session-ending";

function recorder(): { spawn: Spawn; spawned: Spawned[] } {
  const spawned: Spawned[] = [];
  return { spawned, spawn: (command, args, options) => spawned.push({ command, args, options }) };
}

function entry(item: string, session: string | null, engine: StackEntry["engine"] = { name: "docker", program: "docker", prefix: [] }): StackEntry {
  return { item, session, files: ["/u/compose.yaml"], engine, started: "2026-11-14T10:00:00.000Z" };
}

function project(t: TestContext): { root: string; ctx: ReturnType<typeof fixedContext> } {
  const root = withProject(t);
  const config = join(root, ".host-config");
  mkdirSync(join(config, "sessions"), { recursive: true });
  writeFileSync(join(config, "sessions", "1.json"), JSON.stringify({ pid: 1, sessionId: LIVE, cwd: root }));
  return { root, ctx: fixedContext(root, { env: { CLAUDE_CONFIG_DIR: config } }) };
}

const hookCtx = (ctx: ReturnType<typeof fixedContext>) => ({ ...ctx, name: "env.stacks" as const });

function stacksIn(spawned: Spawned[]): string[] {
  return spawned.map(({ args }) => args[args.indexOf("-p") + 1]);
}

test("SessionEnd stops the ending session's stacks in detached silent processes and returns null (T-7.1)", (t) => {
  const { root, ctx } = project(t);
  recordStack(root, "picket-a", entry("a", ENDING));
  recordStack(root, "picket-b", entry("b", ENDING));
  recordStack(root, "picket-c", entry("c", LIVE));
  const { spawn, spawned } = recorder();
  assert.equal(envStacks({ hook_event_name: "SessionEnd", session_id: ENDING, reason: "prompt_input_exit" }, hookCtx(ctx), spawn), null);
  assert.deepEqual(stacksIn(spawned), ["picket-a", "picket-b"]);
  for (const { command, args, options } of spawned) {
    assert.equal(command, "docker");
    assert.deepEqual([args[0], args.at(-1)], ["compose", "stop"]);
    assert.deepEqual([options.detached, options.stdio], [true, "ignore"]);
  }
});

test("SessionEnd for clear or resume spawns nothing (T-7.1)", (t) => {
  const { root, ctx } = project(t);
  recordStack(root, "picket-a", entry("a", ENDING));
  for (const reason of ["clear", "resume"]) {
    const { spawn, spawned } = recorder();
    assert.equal(envStacks({ hook_event_name: "SessionEnd", session_id: ENDING, reason }, hookCtx(ctx), spawn), null);
    assert.deepEqual(spawned, [], reason);
  }
});

test("startup stops stacks of sessions that are gone and keeps the live one; other sources stop nothing (T-7.2)", (t) => {
  const { root, ctx } = project(t);
  recordStack(root, "picket-gone", entry("a", "session-gone"));
  recordStack(root, "picket-live", entry("b", LIVE));
  const { spawn, spawned } = recorder();
  envStacks({ hook_event_name: "SessionStart", session_id: "new", source: "startup" }, hookCtx(ctx), spawn);
  assert.deepEqual(stacksIn(spawned), ["picket-gone"]);
  for (const source of ["resume", "clear", "compact"]) {
    const other = recorder();
    assert.equal(envStacks({ hook_event_name: "SessionStart", source }, hookCtx(ctx), other.spawn), null);
    assert.deepEqual(other.spawned, [], source);
  }
});

test("startup names a stack whose item is done (T-7.3)", (t) => {
  const { root, ctx } = project(t);
  const { id } = openItem(root, { lane: "order", title: "Orders", source: "PROJ-481" });
  writeState(root, { ...readState(root, id), status: "done" }, new Date());
  recordStack(root, "picket-proj-481", entry(id, LIVE));
  const out = envStacks({ hook_event_name: "SessionStart", source: "startup" }, hookCtx(ctx), recorder().spawn);
  assert.ok(out?.hookSpecificOutput.additionalContext.includes(`picket-proj-481: item ${id} is done; run picket env purge picket-proj-481`));
});

test("a recorded engine outside the allow-list is skipped, and a recorded program is never trusted (T-7.8)", (t) => {
  const { root, ctx } = project(t);
  recordStack(root, "picket-sh", entry("a", ENDING, { name: "sh", program: "sh", prefix: ["-c", "rm -rf /"] }));
  recordStack(root, "picket-docker", entry("b", ENDING, { name: "docker", program: "/tmp/evil", prefix: ["--evil"] }));
  const { spawn, spawned } = recorder();
  envStacks({ hook_event_name: "SessionEnd", session_id: ENDING, reason: "logout" }, hookCtx(ctx), spawn);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].command, "docker");
  assert.equal(spawned[0].args[0], "compose");
  assert.ok(!spawned[0].args.includes("--evil"));
});

test("no stacks file means no work and no output", (t) => {
  const { ctx } = project(t);
  const { spawn, spawned } = recorder();
  assert.equal(envStacks({ hook_event_name: "SessionStart", source: "startup" }, hookCtx(ctx), spawn), null);
  assert.deepEqual(spawned, []);
});
