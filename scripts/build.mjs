import { build } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { HOOKS } from "../src/lib/hooks.mts";
import { MODS } from "../src/lib/mods.mts";
import { writeReferencePages } from "./docs.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(REPO, "src");
export const DIST = join(REPO, "dist");
export const HOOK_LIST = join(SRC, "lib", "hooks.mts");
export const MOD_LIST = join(SRC, "lib", "mods.mts");
export const MODS_SRC = join(SRC, "mods");
export const DIST_MODS = join(DIST, "mods");
export const MARKETPLACE = join(REPO, ".claude-plugin", "marketplace.json");
const PACKAGE = join(REPO, "package.json");
const MOD_FOLDERS = ["hooks", "types"];
const LIB_SHARED = join(SRC, "lib", "shared");
const MODS_SHARED = join(MODS_SRC, "shared");
export const MOD_LIB_SHARED = [join(LIB_SHARED, "format.mts"), join(LIB_SHARED, "views.mts"), join(LIB_SHARED, "styling", "palette.mts")];
const MOD_CODE = /\.(mts|ts|tsx)$/;
const MOD_SHARED_IMPORT = /(["'])\.\.\/\.\.\/shared\/([^"']+)\1/g;
const LIB_SHARED_IMPORT = /(["'])\.\.\/\.\.\/\.\.\/lib\/shared\/([^"']+)\.mts\1/g;
const MOD_ENTRY = "./index.tsx";
const MOD_TYPES = "./types/index.d.ts";
const HOOK_FOLDERS = join(SRC, "lib", "hooks");
const VENDOR_DIR = join(SRC, "lib", "util", "vendor");
const TEST_FILE = /\.test\.[^.]+$/;
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

export function hookFolder(name) {
  const [kind, leaf] = name.split(".");
  return join(HOOK_FOLDERS, kind, leaf, "index.mts");
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

export function missingHooks(hooks = HOOKS) {
  return Object.keys(hooks)
    .filter((name) => !existsSync(hookFolder(name)))
    .map((name) => `${name} has no ${repoPath(hookFolder(name))}`);
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

export function isTestFile(file) {
  return TEST_FILE.test(basename(file));
}

function isVendored(file) {
  return file.startsWith(VENDOR_DIR + sep);
}

export function isModSource(file) {
  return file.startsWith(MODS_SRC + sep);
}

export function isBuiltModule(file) {
  if (isTestFile(file) || isModSource(file)) return false;
  if (file.endsWith(".mts")) return !file.endsWith(".d.mts");
  return file.endsWith(".mjs") && !isVendored(file);
}

export function isCopied(file) {
  return !isTestFile(file) && !isModSource(file) && !isBuiltModule(file) && !file.endsWith(".d.mts");
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
  return files.filter((file) => file.endsWith(".mts") && isBuiltModule(file)).flatMap((file) => {
    const twin = file.replace(/\.mts$/, ".mjs");
    return listed.has(twin) ? [`${repoPath(twin)} and ${repoPath(file)} both build to ${repoPath(distPath(twin))}`] : [];
  });
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, jsonText(value));
}

export function modManifest(name, pkg, mods = MODS) {
  const { plugin, description } = mods[name];
  return { name: plugin, version: pkg.version, description, author: { name: pkg.author }, types: MOD_TYPES };
}

export function modHooksJson() {
  return { modules: [MOD_ENTRY] };
}

export function marketplaceJson(current, mods = MODS) {
  const modPlugins = new Set(Object.values(mods).map(({ plugin }) => plugin));
  const others = current.plugins.filter(({ name }) => !modPlugins.has(name));
  const modEntries = Object.entries(mods).map(([name, { plugin, description }]) => ({ name: plugin, source: `./dist/mods/${name}`, description }));
  return jsonText({ ...current, plugins: [...others, ...modEntries] });
}

function writeMarketplace(mods) {
  const current = readFileSync(MARKETPLACE, "utf8");
  const wanted = marketplaceJson(JSON.parse(current), mods);
  if (wanted !== current.replaceAll("\r\n", "\n")) writeFileSync(MARKETPLACE, wanted);
}

export function rewriteModImports(text) {
  return text.replace(MOD_SHARED_IMPORT, "$1../shared/$2$1").replace(LIB_SHARED_IMPORT, "$1../shared/$2$1");
}

export function modSharedTarget(path) {
  const root = path.startsWith(MODS_SHARED + sep) ? MODS_SHARED : LIB_SHARED;
  return `shared/${relative(root, path).replaceAll("\\", "/").replace(/\.mts$/, ".ts")}`;
}

function copyModFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  if (MOD_CODE.test(from)) writeFileSync(to, rewriteModImports(readFileSync(from, "utf8")));
  else copyFileSync(from, to);
}

function modSharedFiles() {
  return [...MOD_LIB_SHARED, ...(existsSync(MODS_SHARED) ? sourceFiles(MODS_SHARED) : [])];
}

function copyModFiles(name) {
  const root = join(DIST_MODS, name);
  for (const folder of MOD_FOLDERS) {
    const from = join(MODS_SRC, name, folder);
    if (existsSync(from)) for (const file of sourceFiles(from)) copyModFile(file, join(root, folder, relative(from, file)));
  }
  for (const file of modSharedFiles()) copyModFile(file, join(root, modSharedTarget(file)));
}

export function buildMods(mods = MODS) {
  const pkg = JSON.parse(readFileSync(PACKAGE, "utf8"));
  rmSync(DIST_MODS, { recursive: true, force: true });
  for (const name of Object.keys(mods)) {
    copyModFiles(name);
    writeJson(join(DIST_MODS, name, ".claude-plugin", "plugin.json"), modManifest(name, pkg, mods));
    writeJson(join(DIST_MODS, name, "hooks", "hooks.json"), modHooksJson());
  }
  writeMarketplace(mods);
}

export async function buildAll() {
  const files = sourceFiles();
  const problems = [...missingHooks(), ...outputCollisions(files)];
  if (problems.length > 0) throw new Error(problems.join("; "));
  rmSync(DIST, { recursive: true, force: true });
  for (const file of files.filter(isCopied)) copySource(file);
  writeHooksJson();
  await build(moduleOptions(files.filter(isBuiltModule)));
  await Promise.all(Object.keys(HOOKS).map((name) => build(entryOptions(name))));
  buildMods();
  await writeReferencePages();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildAll().catch((err) => {
    console.error(`npm run build: ${err.message}`);
    process.exitCode = 1;
  });
}
