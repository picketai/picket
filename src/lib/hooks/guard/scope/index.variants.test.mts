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
const WORK_ITEM = "work/20261118-probe";
const LINKED_WORK = "worklink";

const SEEDS: EditSeed[] = [
  { tool: "Edit", rel: `${SCENARIOS}/S-0001.md` },
  { tool: "Write", rel: `${SCENARIOS}/S-0099.md` },
  { tool: "Write", rel: `${WORK_ITEM}/test/results.jsonl` },
  { tool: "Edit", rel: `${WORK_ITEM}/test.md` },
];

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

type Folders = { root: string; elsewhere: string };

function linkBoth(root: string, elsewhere: string, target: string, link: string): void {
  symlinkSync(join(root, ...target.split("/")), join(root, link), LINK_TYPE);
  symlinkSync(join(root, ...target.split("/")), join(elsewhere, link), LINK_TYPE);
}

function project(t: TestContext): Folders {
  const root = withProject(t, { host: true, picket: false });
  mkdirSync(join(root, ...SCENARIOS.split("/")), { recursive: true });
  mkdirSync(join(root, ...WORK_ITEM.split("/"), "test"), { recursive: true });
  mkdirSync(join(root, "services"), { recursive: true });
  writeFileSync(join(root, ...SCENARIOS.split("/"), "S-0001.md"), "x\n");
  const elsewhere = withProject(t, { picket: false });
  linkBoth(root, elsewhere, ".picket/env", LINKED_ENV);
  linkBoth(root, elsewhere, "work", LINKED_WORK);
  return { root, elsewhere };
}

const throughLink = (folder: string, rel: string) => join(folder, ...rel.replace(".picket/env/", `${LINKED_ENV}/`).replace(/^work\//, `${LINKED_WORK}/`).split("/"));

const upperCased = (rel: string) => (rel.startsWith(SCENARIOS) ? rel.replace(SCENARIOS, ".PICKET/Env/SCENARIOS") : rel.toUpperCase());

const FILE_PATHS: Record<EditPathForm, (folders: Folders, rel: string) => string> = {
  relative: (_folders, rel) => rel,
  absolute: ({ root }, rel) => join(root, ...rel.split("/")),
  dot: (_folders, rel) => `./${rel}`,
  parent: (_folders, rel) => `services/../${rel}`,
  "upper-case on win32": ({ root }, rel) => join(root, upperCased(rel)),
  "symbolic link": ({ root }, rel) => throughLink(root, rel),
  "symbolic link from outside": ({ elsewhere }, rel) => throughLink(elsewhere, rel),
};

function contextFor(root: string, form: EditPathForm): Context {
  return form === "upper-case on win32" ? hookContext(root, { cwd: root, platform: "win32" }) : hookContext(root, { cwd: root });
}

function denied({ tool, rel, form }: EditInput, t: TestContext): boolean {
  const folders = project(t);
  const { root } = folders;
  const content = tool === "Write" ? { content: "x" } : { old_string: "x", new_string: "y" };
  const tool_input = { file_path: FILE_PATHS[form](folders, rel), ...content };
  const out = guardScope({ hook_event_name: "PreToolUse", tool_name: tool, tool_input, cwd: root }, contextFor(root, form))?.hookSpecificOutput;
  return out?.permissionDecision === "deny" && /written by the kernel|is kernel-owned/.test(out.permissionDecisionReason ?? "");
}

closureTests({
  guard: "guard.scope",
  grammar: editPaths,
  seeds: SEEDS,
  run: denied,
  closed: (isDenied) => isDenied,
});
