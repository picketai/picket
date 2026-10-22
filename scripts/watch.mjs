import { context } from "esbuild";
import { existsSync, rmSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import { SRC, buildAll, copySource, distPath, hookOptions, isBuiltModule, isCopied, isHookShell, moduleOptions, sourceFiles } from "./build.mjs";

let contexts = [];
let entries = new Set();

function isEntry(file) {
  return isBuiltModule(file) || isHookShell(file);
}

function builtPath(file) {
  return distPath(file).replace(/\.mts$/, ".mjs");
}

async function startContexts() {
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  const files = sourceFiles();
  entries = new Set(files.filter(isEntry));
  contexts = await Promise.all([context(moduleOptions(files.filter(isBuiltModule))), context(hookOptions(files.filter(isHookShell)))]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
}

function syncPresent(path) {
  const files = statSync(path).isDirectory() ? sourceFiles(path) : [path];
  for (const file of files.filter(isCopied)) copySource(file);
  return files.some((file) => isEntry(file) && !entries.has(file));
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
