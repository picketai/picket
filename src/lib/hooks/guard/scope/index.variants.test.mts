import type { TestContext } from "node:test";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { looseHandler } from "#test/hook.mts";
import { withProject } from "#test/project.mts";
import { closureTests, editPaths, type EditInput, type EditPathForm, type EditSeed } from "#test/variants.mts";
import type { Context } from "../../../shared/context.mts";
import { guardScope as scopeHandler } from "./index.mts";

const guardScope = looseHandler(scopeHandler);

const SCENARIOS = ".picket/env/scenarios";
const LINKED_ENV = "envlink";

const SEEDS: EditSeed[] = [
  { tool: "Edit", rel: `${SCENARIOS}/S-0001.md` },
  { tool: "Write", rel: `${SCENARIOS}/S-0099.md` },
];

function project(t: TestContext): string {
  const root = withProject(t, { host: true, picket: false });
  mkdirSync(join(root, ...SCENARIOS.split("/")), { recursive: true });
  mkdirSync(join(root, "services"), { recursive: true });
  writeFileSync(join(root, ...SCENARIOS.split("/"), "S-0001.md"), "x\n");
  symlinkSync(join(root, ".picket", "env"), join(root, LINKED_ENV), process.platform === "win32" ? "junction" : "dir");
  return root;
}

const FILE_PATHS: Record<EditPathForm, (root: string, rel: string) => string> = {
  relative: (_root, rel) => rel,
  absolute: (root, rel) => join(root, ...rel.split("/")),
  dot: (_root, rel) => `./${rel}`,
  parent: (_root, rel) => `services/../${rel}`,
  "upper-case on win32": (root, rel) => join(root, rel.replace(SCENARIOS, ".PICKET/Env/SCENARIOS")),
  "symbolic link": (root, rel) => join(root, ...rel.replace(".picket/env/", `${LINKED_ENV}/`).split("/")),
};

function contextFor(root: string, form: EditPathForm): Context {
  return form === "upper-case on win32" ? hookContext(root, { cwd: root, platform: "win32" }) : hookContext(root, { cwd: root });
}

function denied({ tool, rel, form }: EditInput, t: TestContext): boolean {
  const root = project(t);
  const content = tool === "Write" ? { content: "x" } : { old_string: "x", new_string: "y" };
  const tool_input = { file_path: FILE_PATHS[form](root, rel), ...content };
  const out = guardScope({ hook_event_name: "PreToolUse", tool_name: tool, tool_input, cwd: root }, contextFor(root, form))?.hookSpecificOutput;
  return out?.permissionDecision === "deny" && /written by the kernel/.test(out.permissionDecisionReason ?? "");
}

closureTests({
  guard: "guard.scope",
  grammar: editPaths,
  seeds: SEEDS,
  run: denied,
  closed: (isDenied) => isDenied,
});
