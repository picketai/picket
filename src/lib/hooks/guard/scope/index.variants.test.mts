import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureFailure } from "#test/variants.mts";
import type { Context } from "../../../shared/context.mts";
import { guardScope as scopeHandler } from "./index.mts";

const guardScope = looseHandler(scopeHandler);

type Seed = { tool: "Edit" | "Write"; rel: string };
type Spelling = { label: string; file_path: string; ctx: Context };

const SEEDS: Seed[] = [
  { tool: "Edit", rel: ".picket/env/scenarios/S-0001.md" },
  { tool: "Write", rel: ".picket/env/scenarios/S-0099.md" },
];

function project(t: TestContext): string {
  const root = withProject(t, { host: true, picket: false });
  mkdirSync(join(root, ".picket", "env", "scenarios"), { recursive: true });
  mkdirSync(join(root, "services"), { recursive: true });
  writeFileSync(join(root, ".picket", "env", "scenarios", "S-0001.md"), "x\n");
  symlinkSync(join(root, ".picket", "env"), join(root, "envlink"), process.platform === "win32" ? "junction" : "dir");
  return root;
}

function spellings(root: string, { rel }: Seed): Spelling[] {
  const ctx = hookContext(root, { cwd: root });
  const inLink = rel.replace(".picket/env/", "envlink/");
  return [
    { label: `absolute ${rel}`, file_path: join(root, ...rel.split("/")), ctx },
    { label: `./${rel}`, file_path: `./${rel}`, ctx },
    { label: `services/../${rel}`, file_path: `services/../${rel}`, ctx },
    { label: `upper-case folder on win32 ${rel}`, file_path: join(root, rel.replace(".picket/env/scenarios", ".PICKET/Env/SCENARIOS")), ctx: hookContext(root, { cwd: root, platform: "win32" }) },
    { label: `symbolic link ${inLink}`, file_path: join(root, ...inLink.split("/")), ctx },
  ];
}

function denied(seed: Seed, { file_path, ctx }: Spelling, root: string): boolean {
  const content = seed.tool === "Write" ? { content: "x" } : { old_string: "x", new_string: "y" };
  const out = guardScope({ hook_event_name: "PreToolUse", tool_name: seed.tool, tool_input: { file_path, ...content }, cwd: root }, ctx)?.hookSpecificOutput;
  return out?.permissionDecision === "deny" && /written by the kernel/.test(out.permissionDecisionReason ?? "");
}

test("guard.scope denies every spelling of an Edit or a Write of a saved scenario (T-8.2)", (t) => {
  const root = project(t);
  const open = SEEDS.flatMap((seed) => spellings(root, seed).filter((spelling) => !denied(seed, spelling, root)).map((spelling) => `${seed.tool} ${spelling.label}`));
  assert.deepEqual(open, [], closureFailure("guard.scope", "scenario path spellings", open));
});
