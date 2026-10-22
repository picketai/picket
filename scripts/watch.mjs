import { context } from "esbuild";
import { existsSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import { SRC, buildAll, copySource, hookOptions, isBuiltModule, isCopied, isHookShell, moduleOptions, sourceFiles } from "./build.mjs";

function copyChanged(name) {
  if (!name) return;
  const file = join(SRC, name);
  if (existsSync(file) && statSync(file).isFile() && isCopied(file)) copySource(file);
}

await buildAll();
const files = sourceFiles();
const contexts = await Promise.all([context(moduleOptions(files.filter(isBuiltModule))), context(hookOptions(files.filter(isHookShell)))]);
await Promise.all(contexts.map((ctx) => ctx.watch()));
watch(SRC, { recursive: true }, (_event, name) => copyChanged(name));
console.log("npm run watch: building src/ into dist/ on save; Ctrl+C stops");
