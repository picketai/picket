// Builds the fixture template once (npm install cached), then materializes a fresh copy per run
// as a git repository whose first commit has a deterministic SHA.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const SKIP = new Set(["node_modules", "dist", ".git", "coverage"]);

export function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p).replaceAll("\\", "/"));
  }
  return out;
}

/** Content hash of the fixture source: the "pinned SHA" the manifest records. */
export function fixtureHash(fixtureDir) {
  const h = createHash("sha256");
  for (const f of listFiles(fixtureDir)) {
    h.update(f);
    h.update(readFileSync(join(fixtureDir, f)));
  }
  return h.digest("hex").slice(0, 12);
}

export function buildTemplate({ fixtureDir, cacheDir, log = () => {} }) {
  const template = join(cacheDir, "template");
  const hash = fixtureHash(fixtureDir);
  const stamp = join(template, ".fixture-hash");
  const fresh = existsSync(stamp) && readFileSync(stamp, "utf8").trim() === hash;
  if (!fresh) {
    log(`building fixture template (${hash})`);
    const keepModules = join(cacheDir, "node_modules.keep");
    if (existsSync(join(template, "node_modules"))) {
      rmSync(keepModules, { recursive: true, force: true });
      cpSync(join(template, "node_modules"), keepModules, { recursive: true });
    }
    rmSync(template, { recursive: true, force: true });
    mkdirSync(template, { recursive: true });
    for (const f of listFiles(fixtureDir)) cpSync(join(fixtureDir, f), join(template, f));
    if (existsSync(keepModules)) {
      cpSync(keepModules, join(template, "node_modules"), { recursive: true });
      rmSync(keepModules, { recursive: true, force: true });
    }
    execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: template,
      stdio: "ignore",
      shell: true,
    });
    execFileSync("npx", ["vitest", "run"], { cwd: template, stdio: "ignore", shell: true });
    writeText(stamp, hash);
  }
  return { template, hash };
}

/**
 * Copies the template into runDir/repo (node_modules linked, not copied) and creates a git
 * repository with one commit at fixed author/committer dates, so the SHA is a pure function of
 * the fixture content.
 */
export function materializeRun({ template, runDir }) {
  const repo = join(runDir, "repo");
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(repo, { recursive: true });
  for (const f of listFiles(template)) {
    if (f === ".fixture-hash") continue;
    cpSync(join(template, f), join(repo, f));
  }
  symlinkSync(resolve(template, "node_modules"), join(repo, "node_modules"), "junction");
  const git = fixedDateGit(repo, "2026-01-01T00:00:00Z");
  git("init", "-q", "-b", "main");
  git("config", "core.autocrlf", "false");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture: ledgerlite baseline");
  const sha = git("rev-parse", "HEAD");
  return { repo, sha };
}

export function fixedDateGit(repo, date) {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "bench",
    GIT_AUTHOR_EMAIL: "bench@example.invalid",
    GIT_COMMITTER_NAME: "bench",
    GIT_COMMITTER_EMAIL: "bench@example.invalid",
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  };
  return (...args) => execFileSync("git", args, { cwd: repo, env, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

export function writeText(path, text) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, text);
}
