import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const USAGE = "usage: node scripts/replay-rejected.mjs <rev> <test-file>...";
const HELPER = "test/support/variants.mts";
const REPLAY_ERROR = 2;

class ReplayError extends Error {}

function git(cwd, args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function repositoryRoot(cwd) {
  const found = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (found.status !== 0) throw new ReplayError(`replay-rejected: ${cwd} is not inside a git repository`);
  return found.stdout.trim();
}

function checkRevision(root, rev) {
  if (git(root, ["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]).status !== 0) {
    throw new ReplayError(`replay-rejected: no commit named ${rev}`);
  }
}

function repoRelative(root, cwd, file) {
  const path = relative(root, resolve(cwd, file));
  if (path.startsWith("..") || isAbsolute(path)) throw new ReplayError(`replay-rejected: ${file} is outside the repository`);
  if (!existsSync(join(root, path))) throw new ReplayError(`replay-rejected: no test file ${file}`);
  return path;
}

function copiedPaths(root, testFiles) {
  const helper = existsSync(join(root, HELPER)) ? [HELPER] : [];
  return [...helper, ...testFiles];
}

function exportTree(root, rev, folder) {
  const archive = join(folder, "tree.tar");
  const tree = join(folder, "tree");
  mkdirSync(tree);
  if (git(root, ["archive", "--format=tar", `--output=${archive}`, rev]).status !== 0) throw new ReplayError(`replay-rejected: git archive ${rev} failed`);
  if (spawnSync("tar", ["-xf", archive, "-C", tree], { stdio: "inherit" }).status !== 0) throw new ReplayError(`replay-rejected: tar could not extract ${rev}`);
  return tree;
}

function copyInto(root, tree, paths) {
  for (const path of paths) {
    const target = join(tree, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, path), target);
  }
}

function replay(root, rev, testFiles) {
  const folder = mkdtempSync(join(tmpdir(), "replay-rejected-"));
  try {
    const tree = exportTree(root, rev, folder);
    copyInto(root, tree, copiedPaths(root, testFiles));
    return spawnSync(process.execPath, ["--test", ...testFiles], { cwd: tree, stdio: "inherit" }).status ?? 1;
  } finally {
    rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}

function main([rev, ...files], cwd) {
  if (rev === undefined || files.length === 0) throw new ReplayError(USAGE);
  const root = repositoryRoot(cwd);
  checkRevision(root, rev);
  const testFiles = files.map((file) => repoRelative(root, cwd, file));
  return replay(root, rev, testFiles);
}

try {
  process.exitCode = main(process.argv.slice(2), process.cwd());
} catch (error) {
  if (!(error instanceof ReplayError)) throw error;
  console.error(error.message);
  process.exitCode = REPLAY_ERROR;
}
