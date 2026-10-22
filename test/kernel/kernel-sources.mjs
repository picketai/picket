import { existsSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const KERNEL_DIRS = ["src/lib", "src/hooks", "src/bin"];
const VENDOR_DIR = "vendor";
const COMMENT_STARTS = ["//", "/*", "*"];
const PATHS_MODULES = ["paths.mjs", "paths.mts"];

export function isKernelSource(name) {
  if (name.endsWith(".d.mts") || name.endsWith(".test.mts")) return false;
  return name.endsWith(".mjs") || name.endsWith(".mts");
}

function modulesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === VENDOR_DIR ? [] : modulesUnder(full);
    return isKernelSource(entry.name) ? [full] : [];
  });
}

export function kernelModules() {
  return KERNEL_DIRS.flatMap((dir) => modulesUnder(resolve(dir)));
}

export function sourceOf(importedFile) {
  if (existsSync(importedFile) || !importedFile.endsWith(".mjs")) return importedFile;
  return importedFile.replace(/\.mjs$/, ".mts");
}

export function isPathsModule(file) {
  return PATHS_MODULES.includes(basename(file));
}

export function codeLines(text) {
  return text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && !COMMENT_STARTS.some((start) => trimmed.startsWith(start));
  });
}
