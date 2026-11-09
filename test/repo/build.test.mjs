import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { BANNER, DIST, SRC, STATUSLINE_BUNDLE, distPath, isBuiltModule, isCopied, outputCollisions, sourceFiles, swapInto, withBanner } from "../../scripts/build.mjs";

const SHEBANG = "#!/usr/bin/env node";
const RELATIVE_IMPORT = /(\bfrom\s+|\bimport\s*\(?\s*)["']\.\.?\//;

function distFiles(dir = DIST) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? distFiles(path) : [path];
  });
}

function distRel(file) {
  return relative(DIST, file).replaceAll("\\", "/");
}

function bannerLine(text) {
  const lines = text.split(/\r?\n/);
  return lines[0].startsWith("#!") ? lines[1] : lines[0];
}

function withFolders(body) {
  const root = mkdtempSync(join(tmpdir(), "picket-swap-"));
  try {
    body({ staging: join(root, "staging"), target: join(root, "target") });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function folderHolding(path, file) {
  mkdirSync(path);
  writeFileSync(join(path, file), file);
}

test("swapInto replaces the target with the staging folder and removes the old copy", () => {
  withFolders(({ staging, target }) => {
    folderHolding(target, "old.txt");
    folderHolding(staging, "new.txt");
    swapInto(staging, target);
    assert.deepEqual(readdirSync(target), ["new.txt"]);
    assert.equal(existsSync(staging), false);
    assert.equal(existsSync(`${staging}-old`), false);
  });
});

test("swapInto replaces nested files and drops nested folders the staging folder lacks", () => {
  withFolders(({ staging, target }) => {
    mkdirSync(join(target, "keep", "stale"), { recursive: true });
    writeFileSync(join(target, "keep", "stale", "gone.txt"), "old");
    writeFileSync(join(target, "keep", "a.txt"), "old");
    mkdirSync(join(staging, "keep"), { recursive: true });
    writeFileSync(join(staging, "keep", "a.txt"), "new");
    swapInto(staging, target);
    assert.deepEqual(readdirSync(join(target, "keep")), ["a.txt"]);
    assert.equal(readFileSync(join(target, "keep", "a.txt"), "utf8"), "new");
  });
});

test("swapInto replaces a folder with a staged file of the same name, and a file with a staged folder", () => {
  withFolders(({ staging, target }) => {
    folderHolding(target, "keep.txt");
    folderHolding(join(target, "x"), "inside.txt");
    writeFileSync(join(target, "y"), "old file");
    folderHolding(staging, "keep.txt");
    writeFileSync(join(staging, "x"), "new file");
    folderHolding(join(staging, "y"), "inside.txt");
    swapInto(staging, target);
    assert.equal(readFileSync(join(target, "x"), "utf8"), "new file");
    assert.deepEqual(readdirSync(join(target, "y")), ["inside.txt"]);
  });
});

test("swapInto moves the staging folder into place when no target exists yet", () => {
  withFolders(({ staging, target }) => {
    folderHolding(staging, "new.txt");
    swapInto(staging, target);
    assert.deepEqual(readdirSync(target), ["new.txt"]);
    assert.equal(existsSync(staging), false);
  });
});

test("withBanner puts the banner first, or right after a shebang line", () => {
  assert.equal(withBanner("export const a = 1;\n"), `${BANNER}\nexport const a = 1;\n`);
  assert.equal(withBanner(`${SHEBANG}\nmain();\n`), `${SHEBANG}\n${BANNER}\nmain();\n`);
});

test("outputCollisions names both sources when an .mjs and an .mts build to the same file", () => {
  const files = [join(SRC, "lib", "x.mjs"), join(SRC, "lib", "x.mts"), join(SRC, "lib", "y.mts"), join(SRC, "lib", "z.d.mts"), join(SRC, "lib", "z.mjs")];
  assert.deepEqual(outputCollisions(files), ["src/lib/x.mjs and src/lib/x.mts both build to dist/lib/x.mjs"]);
});

test("every .mjs in dist/ starts with the generated-file banner", () => {
  const missing = distFiles()
    .filter((file) => file.endsWith(".mjs") && bannerLine(readFileSync(file, "utf8")) !== BANNER)
    .map(distRel);
  assert.deepEqual(missing, []);
});

test("dist/bin/picket.mjs keeps its shebang so npm can link it as a command", () => {
  assert.equal(readFileSync(join(DIST, "bin", "picket.mjs"), "utf8").split(/\r?\n/)[0], SHEBANG);
});

test("each hook in dist/hooks/ is one bundle with no relative import", () => {
  const hooks = readdirSync(join(DIST, "hooks")).filter((name) => name.endsWith(".mjs"));
  assert.ok(hooks.length > 0, "dist/hooks holds no hook");
  const importing = hooks.filter((name) => RELATIVE_IMPORT.test(readFileSync(join(DIST, "hooks", name), "utf8")));
  assert.deepEqual(importing, []);
});

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;

test("dist/statusline.mjs starts with the banner and imports only node: modules (T-3.1)", () => {
  const text = readFileSync(STATUSLINE_BUNDLE, "utf8");
  assert.equal(bannerLine(text), BANNER);
  const specifiers = [...text.matchAll(SPECIFIER)].map((match) => match[1]);
  assert.ok(specifiers.length > 0, "no import found");
  assert.deepEqual(specifiers.filter((specifier) => !specifier.startsWith("node:")), []);
});

test("dist/ holds no TypeScript source and no declaration output", () => {
  assert.deepEqual(distFiles().map(distRel).filter((path) => /\.(mts|d\.mjs)$/.test(path)), []);
});

const TYPED_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'][^"']+\.mts["']/;
const TYPED_NAME = /\.mts["']/;
const BUNDLED_MODULE_KEY = /^\s*"src\/[^"]+\.mts"\(\) \{$/;

function typedNameLines(text) {
  return text.split(/\r?\n/).filter((line) => TYPED_NAME.test(line) && !BUNDLED_MODULE_KEY.test(line));
}

test("no module in dist/ imports a path ending in .mts (T-1.2)", () => {
  const importing = distFiles()
    .filter((file) => file.endsWith(".mjs") && TYPED_IMPORT.test(readFileSync(file, "utf8")))
    .map(distRel);
  assert.deepEqual(importing, []);
});

test("no module in dist/ names an .mts file, beyond the module keys esbuild writes into a hook bundle (T-1.3)", () => {
  assert.deepEqual(typedNameLines('  "src/lib/util/io.mts"() {\nimport { a } from "./a.mts";\nconst b = \'./b.mts\';'), ['import { a } from "./a.mts";', "const b = './b.mts';"]);
  const naming = distFiles()
    .filter((file) => file.endsWith(".mjs"))
    .flatMap((file) => typedNameLines(readFileSync(file, "utf8")).map((line) => `${distRel(file)}: ${line.trim()}`));
  assert.deepEqual(naming, []);
});

test("an .mjs source is built with its typed imports renamed (T-1.3)", () => {
  const config = readFileSync(join(DIST, "lib", "shared", "config.mjs"), "utf8");
  assert.match(config, /from "\.\/paths\.mjs"/);
});

test("no path in dist/ outside dist/hooks/mods/ is a test file or a test fixture (T-1.3)", () => {
  assert.deepEqual(distFiles().map(distRel).filter((path) => path.includes(".test.") && !path.startsWith("hooks/mods/")), []);
});

test("the kernel build neither compiles nor copies a file under src/mods/; buildMods copies those", () => {
  const modFiles = [join(SRC, "mods", "status", "hooks", "index.tsx"), join(SRC, "mods", "status", "hooks", "band.ts"), join(SRC, "mods", "types", "index.d.ts"), join(SRC, "mods", "index.tsx"), join(SRC, "mods", "x", "a.mts")];
  assert.deepEqual(modFiles.filter((file) => isBuiltModule(file) || isCopied(file)), []);
});

test("the build compiles .mts and .mjs modules, copies vendored and other files, and skips test files and declarations (T-1.3)", () => {
  const at = (...parts) => join(SRC, "lib", ...parts);
  const built = [at("a.mts"), at("shared", "config.mjs")];
  const copied = [at("util", "vendor", "jsonc-parser.mjs"), at("rules.md"), at("data.json")];
  const neither = [at("a.d.mts"), at("a.test.mts"), at("a.test.mjs"), at("verbs", "admit", "admit-labelled.test.json")];
  assert.deepEqual(built.filter(isBuiltModule), built);
  assert.deepEqual([...copied, ...neither].filter(isBuiltModule), []);
  assert.deepEqual(copied.filter(isCopied), copied);
  assert.deepEqual([...built, ...neither].filter(isCopied), []);
});

test("a built module imports its relative dependencies instead of inlining them (T-1.2)", () => {
  const leave = readFileSync(join(DIST, "lib", "verbs", "leave", "index.mjs"), "utf8");
  assert.match(leave, /from "\.\.\/\.\.\/util\/io\.mjs"/);
  assert.doesNotMatch(leave, /function appendJsonl/);
});

test("every copied file in dist/ is its source, with only the banner added to .mjs files", () => {
  const changed = sourceFiles()
    .filter(isCopied)
    .filter((file) => {
      const built = readFileSync(distPath(file));
      if (!file.endsWith(".mjs")) return !built.equals(readFileSync(file));
      return built.toString("utf8") !== withBanner(readFileSync(file, "utf8"));
    })
    .map((file) => relative(SRC, file).replaceAll("\\", "/"));
  assert.deepEqual(changed, []);
});
