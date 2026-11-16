import type { TestContext } from "node:test";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { hookContext } from "#test/context.mts";
import { withProject } from "#test/project.mts";
import { closureTests, editPaths, type EditInput, type EditPathForm, type EditSeed } from "#test/variants.mts";
import { editTarget } from "./edit-target.mts";

const SEEDS: EditSeed[] = [
  { tool: "Write", rel: "test/a.test.ts" },
  { tool: "Edit", rel: "src/a.ts" },
];

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";
const LINK_PREFIX = "linked-";

type Folders = { root: string; elsewhere: string };
type ReadTarget = { rel: string; outside: boolean; form: EditPathForm; expected: string };

const projects = new WeakMap<TestContext, Folders>();

function firstFolder(rel: string): { folder: string; rest: string } {
  const slash = rel.indexOf("/");
  return { folder: rel.slice(0, slash), rest: rel.slice(slash + 1) };
}

function projectOf(t: TestContext): Folders {
  const known = projects.get(t);
  if (known !== undefined) return known;
  const root = withProject(t, { host: true, picket: false });
  const elsewhere = withProject(t, { picket: false });
  for (const { folder } of SEEDS.map((seed) => firstFolder(seed.rel))) {
    mkdirSync(join(root, folder));
    symlinkSync(join(root, folder), join(root, `${LINK_PREFIX}${folder}`), LINK_TYPE);
    symlinkSync(join(root, folder), join(elsewhere, `${LINK_PREFIX}${folder}`), LINK_TYPE);
  }
  const folders = { root, elsewhere };
  projects.set(t, folders);
  return folders;
}

function throughLink(base: string, rel: string): string {
  const { folder, rest } = firstFolder(rel);
  return join(base, `${LINK_PREFIX}${folder}`, ...rest.split("/"));
}

const FILE_PATHS: Record<EditPathForm, (folders: Folders, rel: string) => string> = {
  relative: (_folders, rel) => rel,
  absolute: ({ root }, rel) => join(root, ...rel.split("/")),
  dot: (_folders, rel) => `./${rel}`,
  parent: (_folders, rel) => `services/../${rel}`,
  "upper-case on win32": ({ root }, rel) => join(root, firstFolder(rel).folder.toUpperCase(), ...firstFolder(rel).rest.split("/")),
  "symbolic link": ({ root }, rel) => throughLink(root, rel),
  "symbolic link from outside": ({ elsewhere }, rel) => throughLink(elsewhere, rel),
};

function readTarget({ tool, rel, form }: EditInput, t: TestContext): ReadTarget | null {
  const folders = projectOf(t);
  const content = tool === "Write" ? { content: "x" } : { old_string: "x", new_string: "y" };
  const event = { hook_event_name: "PreToolUse", tool_name: tool, tool_input: { file_path: FILE_PATHS[form](folders, rel), ...content }, cwd: folders.root };
  const target = editTarget(event as Parameters<typeof editTarget>[0], hookContext(folders.root, { cwd: folders.root }));
  return target === null ? null : { rel: target.rel, outside: target.outside, form, expected: rel };
}

function readsTheSeedPath(target: ReadTarget | null): boolean {
  if (target === null || target.outside) return false;
  return target.form === "upper-case on win32" ? target.rel.toLowerCase() === target.expected.toLowerCase() : target.rel === target.expected;
}

closureTests({
  guard: "edit target",
  grammar: editPaths,
  seeds: SEEDS,
  run: readTarget,
  closed: readsTheSeedPath,
});
