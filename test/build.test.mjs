import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BANNER, DIST, SRC, distPath, isCopied, outputCollisions, sourceFiles, withBanner } from "../scripts/build.mjs";

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

test("no module in dist/ imports a path ending in .mts (T-1.2)", () => {
  const importing = distFiles()
    .filter((file) => file.endsWith(".mjs") && TYPED_IMPORT.test(readFileSync(file, "utf8")))
    .map(distRel);
  assert.deepEqual(importing, []);
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
