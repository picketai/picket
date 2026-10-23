import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BANNER, DIST, SRC, distPath, isBuiltModule, isCopied, outputCollisions, sourceFiles, withBanner } from "../../scripts/build.mjs";

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

test("no path in dist/ is a test file or a test fixture (T-1.3)", () => {
  assert.deepEqual(distFiles().map(distRel).filter((path) => path.includes(".test.")), []);
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
