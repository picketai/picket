import { build } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HOOKS } from "../src/lib/hooks.mts";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(REPO, "src");
export const DIST = join(REPO, "dist");
export const HOOK_LIST = join(SRC, "lib", "hooks.mts");
const HOOK_SHELLS = join(SRC, "hooks");
const HOOK_FOLDERS = join(SRC, "lib", "hooks");
const HOOK_ORACLE = join(HOOK_SHELLS, "hooks.json");
const DIST_HOOKS = join(DIST, "hooks");
const PLUGIN_HOOK_PREFIX = "${CLAUDE_PLUGIN_ROOT}/hooks/";
export const BANNER = "// generated from src/ by scripts/build.mjs; edit the source";

const OUTPUT_OPTIONS = { format: "esm", platform: "node", target: "node22", banner: { js: BANNER }, logLevel: "warning" };
const SHARED_OPTIONS = { ...OUTPUT_OPTIONS, outbase: SRC, outdir: DIST, outExtension: { ".js": ".mjs" } };

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

export function hookFolder(name) {
  const [kind, leaf] = name.split(".");
  return join(HOOK_FOLDERS, kind, leaf, "index.mts");
}

function hookShell(name) {
  return join(HOOK_SHELLS, `${name}.mjs`);
}

function srcImport(file) {
  return `./${relative(SRC, file).replaceAll("\\", "/")}`;
}

function entryCode(name) {
  return [
    `import { runHook } from "${srcImport(join(HOOK_FOLDERS, "run-hook.mts"))}";`,
    `import { hook } from "${srcImport(hookFolder(name))}";`,
    `await runHook(${JSON.stringify(name)}, hook);`,
  ].join("\n");
}

export function entryOptions(name) {
  return { ...OUTPUT_OPTIONS, bundle: true, outfile: join(DIST_HOOKS, `${name}.mjs`), stdin: { contents: entryCode(name), resolveDir: SRC, sourcefile: `${name}.entry.mjs`, loader: "js" } };
}

export function hookSources(hooks = HOOKS) {
  const folders = [];
  const problems = [];
  for (const name of Object.keys(hooks)) {
    const inFolder = existsSync(hookFolder(name));
    const inShell = existsSync(hookShell(name));
    if (inFolder && inShell) problems.push(`${name} has both ${repoPath(hookFolder(name))} and ${repoPath(hookShell(name))}`);
    else if (!inFolder && !inShell) problems.push(`${name} has neither ${repoPath(hookFolder(name))} nor ${repoPath(hookShell(name))}`);
    else if (inFolder) folders.push(name);
  }
  return { folders, problems };
}

function groupFor(groups, matcher) {
  const found = groups.find((group) => group.matcher === matcher);
  if (found) return found;
  const group = matcher === undefined ? { hooks: [] } : { matcher, hooks: [] };
  groups.push(group);
  return group;
}

export function hooksJson(hooks) {
  const events = {};
  for (const [name, { on }] of Object.entries(hooks)) {
    for (const { event, matcher } of on) {
      events[event] ??= [];
      groupFor(events[event], matcher).hooks.push({ type: "command", command: "node", args: [`${PLUGIN_HOOK_PREFIX}${name}.mjs`] });
    }
  }
  return { hooks: events };
}

export function writeHooksJson(hooks = HOOKS) {
  mkdirSync(DIST_HOOKS, { recursive: true });
  writeFileSync(join(DIST_HOOKS, "hooks.json"), `${JSON.stringify(hooksJson(hooks), null, 2)}\n`);
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
  return !file.endsWith(".mts") && !isHookShell(file) && file !== HOOK_ORACLE;
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
  const { folders, problems } = hookSources();
  const collisions = outputCollisions(files);
  if (problems.length > 0 || collisions.length > 0) throw new Error([...problems, ...collisions].join("; "));
  rmSync(DIST, { recursive: true, force: true });
  for (const file of files.filter(isCopied)) copySource(file);
  writeHooksJson();
  await build(moduleOptions(files.filter(isBuiltModule)));
  await build(hookOptions(files.filter(isHookShell)));
  await Promise.all(folders.map((name) => build(entryOptions(name))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildAll().catch((err) => {
    console.error(`npm run build: ${err.message}`);
    process.exitCode = 1;
  });
}
