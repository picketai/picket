import { existsSync, readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";
import { GitFailed, gitRead, gitRun } from "../../util/git.mts";
import type { PullRequest } from "./pull-request.mts";

export type RemoteMatch = { remote: string; url: string; seen: string[] } | { remote: null; seen: string[]; reason: string };
export type LocatedRepo = { repo_root: string; remote: string; url: string } | { repo_root: null; remote: null; reason: string };
export type PullRequestRefs = { ref: string; head: string; base: string; source: string };

const NESTED_FOLDERS = ["src", "repos", "packages", "."];
const FETCH_TIMEOUT_MS = 120_000;

function childFolders(dir: string): string[] {
  let entries: Dirent[] = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules");
  } catch {}
  return entries.map((e) => join(dir, e.name));
}

function forwardSlashed(url: string): string {
  return url.replaceAll("\\", "/");
}

function decoded(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function remoteLines(out: string): string[] {
  const pairs = out.split(/\r?\n/).filter(Boolean).map((l) => l.split(/\s+/)).filter((p) => p.length >= 2);
  return [...new Set(pairs.map((p) => `${p[0]} ${p[1]}`))];
}

function wantedPaths(pr: PullRequest): string[] {
  const repo = pr.repo.toLowerCase();
  return pr.provider === "github" ? [`${pr.owner}/${pr.repo}`.toLowerCase()] : [`_git/${repo}`, `/${repo}`, `/${repo}.git`];
}

function pointsAt(url: string, pr: PullRequest): boolean {
  const lower = decoded(forwardSlashed(url.toLowerCase()));
  const hostOk = lower.includes(pr.host.toLowerCase()) || (pr.provider === "azdo" && lower.includes(pr.project.toLowerCase()));
  return hostOk && wantedPaths(pr).some((w) => lower.includes(w));
}

export function findRemote(root: string, pr: PullRequest): RemoteMatch {
  const out = gitRead(root, ["remote", "-v"]);
  if (out === null) return { remote: null, seen: [], reason: `${root} is not a git repository` };
  const remotes = remoteLines(out);
  for (const line of remotes) {
    const [name, url] = line.split(" ");
    if (pointsAt(url, pr)) return { remote: name, url, seen: remotes };
  }
  return { remote: null, seen: remotes, reason: `no remote in ${root} points at ${pr.repo} on ${pr.host}; clone it first or run from its checkout` };
}

export function locateRepo(root: string, pr: PullRequest): LocatedRepo {
  const candidates = [root, ...NESTED_FOLDERS.flatMap((sub) => childFolders(join(root, sub)))];
  for (const dir of candidates) {
    if (!existsSync(join(dir, ".git"))) continue;
    const r = findRemote(dir, pr);
    if (r.remote) return { repo_root: dir, remote: r.remote, url: r.url };
  }
  return { repo_root: null, remote: null, reason: `no clone of ${pr.repo} (${pr.host}) found in ${root} or its nested repositories; clone it first, or pass --repo <path>` };
}

export function fetchPullRequest(root: string, remote: string, id: number): PullRequestRefs {
  const local = `refs/harness/pr/${id}/merge`;
  try {
    gitRun(root, ["fetch", "--quiet", remote, `+refs/pull/${id}/merge:${local}`], { timeoutMs: FETCH_TIMEOUT_MS });
  } catch (err) {
    const why = err instanceof GitFailed ? err.lastLine : String((err as Error).message);
    throw new Error(`could not fetch refs/pull/${id}/merge from ${remote}: ${why}. The PR may have merge conflicts (no merge ref is published then) or the id is wrong.`);
  }
  const head = gitRun(root, ["rev-parse", local]).trim();
  const parents = gitRun(root, ["rev-list", "--parents", "-n", "1", local]).trim().split(/\s+/).slice(1);
  if (parents.length < 2) throw new Error(`refs/pull/${id}/merge is not a merge commit; cannot tell base from head`);
  return { ref: local, head, base: parents[0], source: parents[1] };
}
