import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const KERNEL_DIRS = ["core/lib", "core/hooks", "core/bin"];
const VENDOR_DIR = "vendor";
const COMMENT_STARTS = ["//", "/*", "*"];

function modulesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === VENDOR_DIR ? [] : modulesUnder(full);
    return entry.name.endsWith(".mjs") ? [full] : [];
  });
}

export function kernelModules() {
  return KERNEL_DIRS.flatMap((dir) => modulesUnder(resolve(dir)));
}

export function isPathsModule(file) {
  return basename(file) === "paths.mjs";
}

export function codeLines(text) {
  return text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && !COMMENT_STARTS.some((start) => trimmed.startsWith(start));
  });
}
