import { context } from "esbuild";
import { existsSync, rmSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { HOOK_LIST, SRC, buildAll, copySource, distPath, entryOptions, isBuiltModule, isCopied, missingHooks, moduleOptions, sourceFiles, writeHooksJson } from "./build.mjs";

let contexts = [];
let entries = new Set();

function builtPath(file) {
  return distPath(file).replace(/\.mts$/, ".mjs");
}

async function currentHooks() {
  const { HOOKS } = await import(`${pathToFileURL(HOOK_LIST).href}?v=${Date.now()}`);
  return HOOKS;
}

async function hookEntryContexts() {
  const hooks = await currentHooks();
  const problems = missingHooks(hooks);
  if (problems.length > 0) throw new Error(problems.join("; "));
  writeHooksJson(hooks);
  return Object.keys(hooks).map((name) => context(entryOptions(name)));
}

async function startContexts() {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  contexts = [];
  const files = sourceFiles();
  entries = new Set(files.filter(isBuiltModule));
  contexts = await Promise.all([context(moduleOptions(files.filter(isBuiltModule))), ...(await hookEntryContexts())]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
}

function syncPresent(path) {
  const files = statSync(path).isDirectory() ? sourceFiles(path) : [path];
  for (const file of files.filter(isCopied)) copySource(file);
  return path === HOOK_LIST || files.some((file) => isBuiltModule(file) && !entries.has(file));
}

function syncRemoved(path) {
  rmSync(builtPath(path), { recursive: true, force: true });
  return [...entries].some((file) => file === path || file.startsWith(path + "\\") || file.startsWith(path + "/"));
}

async function syncChange(name) {
  if (!name) return;
  const path = join(SRC, name);
  const entriesChanged = existsSync(path) ? syncPresent(path) : syncRemoved(path);
  if (entriesChanged) await startContexts();
}

let queue = Promise.resolve();
await buildAll();
await startContexts();
watch(SRC, { recursive: true }, (_event, name) => {
  queue = queue.then(() => syncChange(name)).catch((err) => console.error(`npm run watch: ${err.message}`));
});
console.log("npm run watch: building src/ into dist/ on save; Ctrl+C stops");
