import { build } from "esbuild";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(REPO, "src");
export const DIST = join(REPO, "dist");
const HOOK_SHELLS = join(SRC, "hooks");
export const BANNER = "// generated from src/ by scripts/build.mjs; edit the source";

const SHARED_OPTIONS = { format: "esm", platform: "node", target: "node22", outbase: SRC, outdir: DIST, outExtension: { ".js": ".mjs" }, banner: { js: BANNER }, logLevel: "warning" };

const RELATIVE_PATH = /^\.\.?\//;

function builtName(path) {
  return path.replace(/\.mts$/, ".mjs");
}

const runtimeExtension = {
  name: "runtime-extension",
  setup(build) {
    build.onResolve({ filter: RELATIVE_PATH }, (args) => (args.kind === "entry-point" ? undefined : { path: builtName(args.path), external: true }));
  },
};

export function moduleOptions(entryPoints) {
  return { ...SHARED_OPTIONS, entryPoints, bundle: true, packages: "external", plugins: [runtimeExtension] };
}

export function hookOptions(entryPoints) {
  return { ...SHARED_OPTIONS, entryPoints, bundle: true };
}

export function sourceFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

export function isHookShell(file) {
  return dirname(file) === HOOK_SHELLS && file.endsWith(".mjs");
}

export function isBuiltModule(file) {
  return file.endsWith(".mts") && !file.endsWith(".d.mts") && !file.endsWith(".test.mts");
}

export function isCopied(file) {
  return !file.endsWith(".mts") && !isHookShell(file);
}

export function distPath(file) {
  return join(DIST, relative(SRC, file));
}

export function withBanner(text) {
  if (!text.startsWith("#!")) return `${BANNER}\n${text}`;
  const afterShebang = text.indexOf("\n") + 1;
  return `${text.slice(0, afterShebang)}${BANNER}\n${text.slice(afterShebang)}`;
}

export function copySource(file) {
  const target = distPath(file);
  mkdirSync(dirname(target), { recursive: true });
  if (file.endsWith(".mjs")) writeFileSync(target, withBanner(readFileSync(file, "utf8")));
  else copyFileSync(file, target);
}

function repoPath(file) {
  return relative(REPO, file).replaceAll("\\", "/");
}

export function outputCollisions(files) {
  const listed = new Set(files);
  return files.filter(isBuiltModule).flatMap((file) => {
    const twin = file.replace(/\.mts$/, ".mjs");
    return listed.has(twin) ? [`${repoPath(twin)} and ${repoPath(file)} both build to ${repoPath(distPath(twin))}`] : [];
  });
}

export async function buildAll() {
  const files = sourceFiles();
  const collisions = outputCollisions(files);
  if (collisions.length > 0) throw new Error(collisions.join("; "));
  rmSync(DIST, { recursive: true, force: true });
  for (const file of files.filter(isCopied)) copySource(file);
  await build(moduleOptions(files.filter(isBuiltModule)));
  await build(hookOptions(files.filter(isHookShell)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildAll().catch((err) => {
    console.error(`npm run build: ${err.message}`);
    process.exitCode = 1;
  });
}
