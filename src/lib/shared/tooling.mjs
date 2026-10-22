import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.mjs";

export function detectTooling(root) {
  return { ...detectedTooling(root), ...loadConfig(root).commands };
}

function detectedTooling(root) {
  const out = { test: null, lint: null, build: null, run: null, stack: null };
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    const scripts = JSON.parse(readFileSync(pkg, "utf8")).scripts ?? {};
    out.stack = "node";
    if (scripts.test && !/no test specified/.test(scripts.test)) out.test = "npm test";
    if (scripts.lint) out.lint = "npm run lint";
    if (scripts.build) out.build = "npm run build";
    if (scripts.start) out.run = "npm start";
  }
  const sln = ["*.sln"].some(() => existsSync(join(root, "Directory.Build.props")) || existsSync(join(root, "global.json")));
  if (!out.stack && sln) {
    out.stack = "dotnet";
    out.test = "dotnet test";
    out.build = "dotnet build";
  }
  if (!out.stack && (existsSync(join(root, "pyproject.toml")) || existsSync(join(root, "pytest.ini")))) {
    out.stack = "python";
    out.test = "pytest";
  }
  return out;
}
